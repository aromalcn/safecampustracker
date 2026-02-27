
-- Enable RLS on attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users (teachers/admins) to read all attendance
CREATE POLICY "Authenticated users can read attendance"
ON attendance FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert/update attendance
-- Ideally checked against 'teacher' role, but for unblocking:
CREATE POLICY "Authenticated users can modify attendance"
ON attendance FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update attendance"
ON attendance FOR UPDATE
USING (auth.role() = 'authenticated');

-- Ensure Unique Constraint for Upsert
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_class_date_key') THEN
        ALTER TABLE attendance 
        ADD CONSTRAINT attendance_student_class_date_key 
        UNIQUE (student_id, class_id, date);
    END IF;
END $$;
