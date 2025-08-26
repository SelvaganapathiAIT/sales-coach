-- 0) Ensure the enum type exists and contains 'coach_admin'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    -- Create with all expected labels
    CREATE TYPE public.app_role AS ENUM ('admin', 'coach_admin', 'user');
  ELSE
    -- Add label if missing (safe to run repeatedly)
    PERFORM 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'coach_admin';

    IF NOT FOUND THEN
      ALTER TYPE public.app_role ADD VALUE 'coach_admin';
    END IF;
  END IF;
END $$;

-- 1) Wrapper to call has_role using TEXT (prevents “unsafe use” on new enum labels)
CREATE OR REPLACE FUNCTION public.has_role_text(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Assume public.has_role(uuid, public.app_role) already exists
  SELECT public.has_role(_user_id, _role::public.app_role);
$$;

-- 2) Helper functions to avoid recursive RLS references (no enum literals here)
CREATE OR REPLACE FUNCTION public.is_coach_owner(_coach_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coaches c
    WHERE c.id = _coach_id AND c.owner_user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_assigned_to_coach(_coach_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coach_users cu
    WHERE cu.coach_id = _coach_id AND cu.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_coach(_coach_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role_text(_user_id, 'admin')
      OR public.is_coach_owner(_coach_id, _user_id)
      OR public.is_user_assigned_to_coach(_coach_id, _user_id)
      OR (public.has_role_text(_user_id, 'coach_admin') AND public.is_coach_owner(_coach_id, _user_id));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_coach(_coach_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role_text(_user_id, 'admin')
      OR public.is_coach_owner(_coach_id, _user_id)
      OR (public.has_role_text(_user_id, 'coach_admin') AND public.is_coach_owner(_coach_id, _user_id));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_coach_assignments(_coach_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role_text(_user_id, 'admin')
      OR public.is_coach_owner(_coach_id, _user_id)
      OR (public.has_role_text(_user_id, 'coach_admin') AND public.is_coach_owner(_coach_id, _user_id));
$$;

-- 3) Recreate policies (no IF NOT EXISTS in Postgres for policies)
DROP POLICY IF EXISTS "Admins can view all coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users and owners can view assigned coaches" ON public.coaches;
DROP POLICY IF EXISTS "Owners, coach admins, admins can insert coaches" ON public.coaches;
DROP POLICY IF EXISTS "Owners, coach admins, admins can update coaches" ON public.coaches;
DROP POLICY IF EXISTS "Owners, coach admins, admins can delete coaches" ON public.coaches;

CREATE POLICY "Admins can view all coaches"
ON public.coaches
FOR SELECT
USING (public.has_role_text(auth.uid(), 'admin'));

CREATE POLICY "Users and owners can view assigned coaches"
ON public.coaches
FOR SELECT
USING (public.can_view_coach(id, auth.uid()));

CREATE POLICY "Owners, coach admins, admins can insert coaches"
ON public.coaches
FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  OR public.has_role_text(auth.uid(), 'admin')
  OR public.has_role_text(auth.uid(), 'coach_admin')
);

CREATE POLICY "Owners, coach admins, admins can update coaches"
ON public.coaches
FOR UPDATE
USING (public.can_manage_coach(id, auth.uid()))
WITH CHECK (public.can_manage_coach(id, auth.uid()));

CREATE POLICY "Owners, coach admins, admins can delete coaches"
ON public.coaches
FOR DELETE
USING (public.can_manage_coach(id, auth.uid()));

-- 4) coach_users policies (drop+create)
DROP POLICY IF EXISTS "Admins can view all coach assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Owners can manage coach assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Users can view their own coach assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Admins and coach owners can view assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Admins and coach owners can insert assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Admins and coach owners can update assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Admins and coach owners can delete assignments" ON public.coach_users;

CREATE POLICY "Users can view their own coach assignments"
ON public.coach_users
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins and coach owners can view assignments"
ON public.coach_users
FOR SELECT
USING (public.can_manage_coach_assignments(coach_id, auth.uid()));

CREATE POLICY "Admins and coach owners can insert assignments"
ON public.coach_users
FOR INSERT
WITH CHECK (public.can_manage_coach_assignments(coach_id, auth.uid()));

CREATE POLICY "Admins and coach owners can update assignments"
ON public.coach_users
FOR UPDATE
USING (public.can_manage_coach_assignments(coach_id, auth.uid()))
WITH CHECK (public.can_manage_coach_assignments(coach_id, auth.uid()));

CREATE POLICY "Admins and coach owners can delete assignments"
ON public.coach_users
FOR DELETE
USING (public.can_manage_coach_assignments(coach_id, auth.uid()));
