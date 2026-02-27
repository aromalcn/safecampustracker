-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'academic', 'safety', 'system'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (
  auth.uid() = user_id
);

-- Teachers and Admins can insert notifications
-- (Actually, anyone should be able to insert if they have a logic to do so, e.g. a trigger or a function)
-- But since we are doing client-side insert from TeacherResults, we need to allow Teachers to insert.
-- We can restrict it to Teachers/Admins targeting other users.
CREATE POLICY "Teachers and Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  exists (
    select 1 from public.users
    where users.uid = auth.uid() and users.role in ('teacher', 'admin')
  )
);
