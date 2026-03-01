
-- 1. Clear existing data
-- These tables are linked to messages via triggers, so we should also clear the resulting messages
-- so the chat doesn't look messy after a "reset"
DELETE FROM public.messages 
WHERE content LIKE '📢 ANNOUNCEMENT%' 
   OR content LIKE '🚨 EMERGENCY ALERT%';

DELETE FROM public.announcements;
DELETE FROM public.safety_alerts;

-- 2. Add fresh announcements
-- Using a subquery to find a valid admin user for the author_id
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT uid INTO admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
    
    -- If no admin found, we can't really post (but there should be one)
    IF admin_id IS NOT NULL THEN
        -- Announcement for Everyone
        INSERT INTO public.announcements (title, message, audience, priority, author_id, created_at)
        VALUES (
            'Annual Sports Meet 2026',
            'Get ready for the Annual Sports Meet starting March 15th! Registration for individual and team events is now open at the physical education department.',
            'all',
            'normal',
            admin_id,
            NOW()
        );

        -- Announcement for Students
        INSERT INTO public.announcements (title, message, audience, priority, author_id, created_at)
        VALUES (
            'Library Extended Hours',
            'To support your preparation for mid-semester exams, the central library will remain open until 10:00 PM on weekdays for the next two weeks.',
            'student',
            'normal',
            admin_id,
            NOW() - INTERVAL '1 hour'
        );

        -- Announcement for Parents
        INSERT INTO public.announcements (title, message, audience, priority, author_id, created_at)
        VALUES (
            'Parent-Teacher Interaction Day',
            'Semester 1 Parent-Teacher interaction is scheduled for this Saturday, March 7th. Please check your personal messages for your specific time slot.',
            'parent',
            'high',
            admin_id,
            NOW() - INTERVAL '2 hours'
        );

        -- Announcement for Teachers
        INSERT INTO public.announcements (title, message, audience, priority, author_id, created_at)
        VALUES (
            'New Research Grant Applications',
            'The University has announced a new round of funding for inter-departmental research projects. Guidelines and application forms are available on the staff portal.',
            'teacher',
            'normal',
            admin_id,
            NOW() - INTERVAL '3 hours'
        );

        -- Safety Alert: Critical
        INSERT INTO public.safety_alerts (title, message, severity, is_active, created_by, audience, created_at)
        VALUES (
            'Extreme Weather Warning',
            'A severe weather warning has been issued for the next 4 hours. All students and staff are advised to stay indoors. School buses will wait for the weather to clear before departing.',
            'critical',
            true,
            admin_id,
            'all',
            NOW()
        );

        -- Safety Alert: Warning
        INSERT INTO public.safety_alerts (title, message, severity, is_active, created_by, audience, created_at)
        VALUES (
            'Health & Hygiene Notice',
            'Notice for Parents: There has been a slight increase in seasonal flu cases on campus. Please monitor your ward''s health and avoid sending them to campus if they show symptoms.',
            'warning',
            true,
            admin_id,
            'parent',
            NOW() - INTERVAL '30 minutes'
        );
        
        -- Safety Alert: Info
        INSERT INTO public.safety_alerts (title, message, severity, is_active, created_by, audience, created_at)
        VALUES (
            'Scheduled Maintenance',
            'Classroom Wing B will undergo routine electrical maintenance tomorrow between 4:00 PM and 6:00 PM. No classes are scheduled during this time.',
            'info',
            true,
            admin_id,
            'student',
            NOW() - INTERVAL '5 hours'
        );
    END IF;
END $$;
