
-- Create a security definer function to check if a user is an admin
-- This avoids recursion when used in policies on the users table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE uid = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Fix safety_alerts RLS: Add explicit SELECT policy for admins
DROP POLICY IF EXISTS "Anyone can view active safety alerts" ON public.safety_alerts;
CREATE POLICY "Anyone can view active safety alerts"
    ON public.safety_alerts
    FOR SELECT
    USING (is_active = true OR public.is_admin());

-- 2. Ensure the users table has a SELECT policy
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'users' AND schemaname = 'public'
    ) THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
        CREATE POLICY "Users can view their own profile" ON public.users
            FOR SELECT USING (auth.uid() = uid OR public.is_admin());
            
        DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
        CREATE POLICY "Admins can update all users" ON public.users
            FOR UPDATE USING (public.is_admin());
    END IF;
END $$;

-- 3. Fix safety_alerts UPDATE policy to be more robust
DROP POLICY IF EXISTS "Only admins can update safety alerts" ON public.safety_alerts;
DROP POLICY IF EXISTS "Admins can update safety alerts" ON public.safety_alerts;
CREATE POLICY "Admins can manage safety alerts"
ON public.safety_alerts
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
