
-- Unified role checking functions
-- These are SECURITY DEFINER to avoid RLS recursion and access the users table directly

CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE uid = auth.uid()
        AND role = p_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update exam_schedules policies to use the new role check
-- This is much more reliable than checking JWT metadata which might be out of sync

DROP POLICY IF EXISTS "Teachers and Admins can manage exams" ON public.exam_schedules;

-- 1. Explicit Manage Policy for Admins
CREATE POLICY "Admins can manage exams"
ON public.exam_schedules
FOR ALL
TO authenticated
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));

-- 2. Explicit Manage Policy for Teachers
CREATE POLICY "Teachers can manage exams"
ON public.exam_schedules
FOR ALL
TO authenticated
USING (public.has_role('teacher'))
WITH CHECK (public.has_role('teacher'));

-- 3. Ensure everyone can still view
DROP POLICY IF EXISTS "Everyone can view exams" ON public.exam_schedules;
CREATE POLICY "Everyone can view exams"
ON public.exam_schedules
FOR SELECT
USING (true);
