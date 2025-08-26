-- STEP 2: Create helper functions and update RLS policies

-- Helper functions
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
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.is_coach_owner(_coach_id, _user_id)
      OR public.is_user_assigned_to_coach(_coach_id, _user_id)
      OR (public.has_role(_user_id, 'coach_admin'::public.app_role) AND public.is_coach_owner(_coach_id, _user_id));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_coach(_coach_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.is_coach_owner(_coach_id, _user_id)
      OR (public.has_role(_user_id, 'coach_admin'::public.app_role) AND public.is_coach_owner(_coach_id, _user_id));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_coach_assignments(_coach_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.is_coach_owner(_coach_id, _user_id)
      OR (public.has_role(_user_id, 'coach_admin'::public.app_role) AND public.is_coach_owner(_coach_id, _user_id));
$$;

-- Recreate policies on coaches
DROP POLICY IF EXISTS "Admins can view all coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users and owners can view assigned coaches" ON public.coaches;
DROP POLICY IF EXISTS "Owners, coach admins, admins can insert coaches" ON public.coaches;
DROP POLICY IF EXISTS "Owners, coach admins, admins can update coaches" ON public.coaches;
DROP POLICY IF EXISTS "Owners, coach admins, admins can delete coaches" ON public.coaches;

create policy "Admins can view all coaches"
ON public.coaches
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Users and owners can view assigned coaches"
ON public.coaches
FOR SELECT
USING (public.can_view_coach(id, auth.uid()));

create policy "Owners, coach admins, admins can insert coaches"
ON public.coaches
FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'coach_admin'::public.app_role)
);

create policy "Owners, coach admins, admins can update coaches"
ON public.coaches
FOR UPDATE
USING (public.can_manage_coach(id, auth.uid()))
WITH CHECK (public.can_manage_coach(id, auth.uid()));

create policy "Owners, coach admins, admins can delete coaches"
ON public.coaches
FOR DELETE
USING (public.can_manage_coach(id, auth.uid()));

-- Recreate policies on coach_users
DROP POLICY IF EXISTS "Users can view their own coach assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Admins and coach owners can view assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Admins and coach owners can insert assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Admins and coach owners can update assignments" ON public.coach_users;
DROP POLICY IF EXISTS "Admins and coach owners can delete assignments" ON public.coach_users;

create policy "Users can view their own coach assignments"
ON public.coach_users
FOR SELECT
USING (user_id = auth.uid());

create policy "Admins and coach owners can view assignments"
ON public.coach_users
FOR SELECT
USING (public.can_manage_coach_assignments(coach_id, auth.uid()));

create policy "Admins and coach owners can insert assignments"
ON public.coach_users
FOR INSERT
WITH CHECK (public.can_manage_coach_assignments(coach_id, auth.uid()));

create policy "Admins and coach owners can update assignments"
ON public.coach_users
FOR UPDATE
USING (public.can_manage_coach_assignments(coach_id, auth.uid()))
WITH CHECK (public.can_manage_coach_assignments(coach_id, auth.uid()));

create policy "Admins and coach owners can delete assignments"
ON public.coach_users
FOR DELETE
USING (public.can_manage_coach_assignments(coach_id, auth.uid()));
