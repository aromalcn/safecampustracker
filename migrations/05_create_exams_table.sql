
-- Create Exam Schedules Table
CREATE TABLE IF NOT EXISTS exam_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject TEXT NOT NULL,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    department TEXT NOT NULL,
    semester INTEGER NOT NULL,
    room TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Everyone can read (view) exams
CREATE POLICY "Everyone can view exams" 
ON exam_schedules FOR SELECT 
USING (true);


-- 2. Teachers and Admins can insert/update/delete
CREATE POLICY "Teachers and Admins can manage exams" 
ON exam_schedules FOR ALL 
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('teacher', 'admin')
);
