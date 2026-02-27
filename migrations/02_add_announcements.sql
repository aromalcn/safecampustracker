-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    audience TEXT NOT NULL CHECK (audience IN ('all', 'student', 'teacher', 'parent')),
    priority TEXT NOT NULL CHECK (priority IN ('normal', 'high', 'emergency')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    author_id UUID REFERENCES users(uid)
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access to all authenticated users" ON announcements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert access to admins only" ON announcements
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

CREATE POLICY "Allow delete access to admins only" ON announcements
    FOR DELETE TO authenticated USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));
