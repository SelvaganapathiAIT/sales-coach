-- Tighten RLS for coach_instructions to prevent public access
-- Ensure RLS is enabled
ALTER TABLE public.coach_instructions ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive policy if it exists
DROP POLICY IF EXISTS "Coach instructions are accessible by system" ON public.coach_instructions;

-- Helper function to determine if a user can view a coach instruction row
CREATE OR REPLACE FUNCTION public.can_view_coach_instruction(
  _coach_email text,
  _target_user_email text,
  _user_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = _user_id
        AND p.email IS NOT NULL
        AND p.email = _coach_email
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = _user_id
        AND p.email IS NOT NULL
        AND p.email = _target_user_email
    );
$$;

-- Strict SELECT policy: only admins, the coach, or the target user may read
drop policy if exists  "Coach/admin/target can view coach_instructions"
ON public.coach_instructions;
create policy "Coach/admin/target can view coach_instructions"
ON public.coach_instructions
FOR SELECT
USING (
  public.can_view_coach_instruction(coach_email, target_user_email, auth.uid())
);
