-- Secure accountability_reports RLS
ALTER TABLE public.accountability_reports ENABLE ROW LEVEL SECURITY;

-- Remove permissive policy
DROP POLICY IF EXISTS "Accountability reports are accessible by system" ON public.accountability_reports;

-- Helper function to check access to accountability reports
CREATE OR REPLACE FUNCTION public.can_view_accountability_report(
  _target_email text,
  _instruction_id uuid,
  _user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
BEGIN
  -- Admins and coach_admins can view all
  IF public.has_role(_user_id, 'admin'::public.app_role) OR public.has_role(_user_id, 'coach_admin'::public.app_role) THEN
    RETURN true;
  END IF;

  -- Resolve current user's email
  SELECT p.email INTO user_email
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  IF user_email IS NULL THEN
    RETURN false;
  END IF;

  -- The evaluated employee can view their own report
  IF _target_email IS NOT NULL AND user_email = _target_email THEN
    RETURN true;
  END IF;

  -- The coach who issued the instruction can view
  IF _instruction_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.coach_instructions ci
    WHERE ci.id = _instruction_id
      AND ci.coach_email = user_email
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Strict SELECT policy using helper
drop policy if exists  "Admins/coach_admins/coach/target can view accountability_reports"
ON public.accountability_reports;
create policy  "Admins/coach_admins/coach/target can view accountability_reports"
ON public.accountability_reports
FOR SELECT
USING (
  public.can_view_accountability_report(target_user_email, instruction_id, auth.uid())
);
