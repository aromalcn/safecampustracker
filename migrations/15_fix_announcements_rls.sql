
-- Fix announcements RLS: Add update policy for admins
-- 1. DROP old policies if they exist (clean up)
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.announcements;
DROP POLICY IF EXISTS "Allow insert access to admins only" ON public.announcements;
DROP POLICY IF EXISTS "Allow delete access to admins only" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

-- 2. Create optimized policies using is_admin() function
CREATE POLICY "Anyone can view announcements" 
ON public.announcements FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage announcements" 
ON public.announcements FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Also double check safety_alerts policies just in case
DROP POLICY IF EXISTS "Admins can manage safety alerts" ON public.safety_alerts;
CREATE POLICY "Admins can manage safety alerts"
ON public.safety_alerts
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
be 