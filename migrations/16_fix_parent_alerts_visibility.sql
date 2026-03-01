-- 1. Add missing 'audience' column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='safety_alerts' AND column_name='audience') THEN
        ALTER TABLE public.safety_alerts ADD COLUMN audience TEXT DEFAULT 'all';
    END IF;
END $$;

-- 2. Fix safety_alerts RLS: Allow parents to see historical alerts relevant to them
-- Drop the restrictive existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view active safety alerts" ON public.safety_alerts;
DROP POLICY IF EXISTS "Users can view relevant safety alerts" ON public.safety_alerts;

-- Create a more inclusive policy
CREATE POLICY "Users can view relevant safety alerts"
    ON public.safety_alerts
    FOR SELECT
    TO authenticated
    USING (
        is_active = true 
        OR public.is_admin() 
        OR audience IN ('all', 'parent')
    );

-- 2. Ensure the 'alerts' table (SOS) has RLS policy for parents
-- Since I don't have the table creation script, I will assume it exists as public.alerts
-- and ensure RLS is enabled and policies are set.

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'alerts' AND schemaname = 'public') THEN
        ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
        
        -- Policy: Parents can view alerts sent by their linked students
        DROP POLICY IF EXISTS "Parents can view their child's alerts" ON public.alerts;
        CREATE POLICY "Parents can view their child's alerts" ON public.alerts
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.parent_student_links
                    WHERE parent_student_links.parent_id = auth.uid()
                    AND parent_student_links.student_id = alerts.sender_id
                )
                OR public.is_admin()
                OR auth.uid() = sender_id -- Student can see their own
            );
    END IF;
END $$;
