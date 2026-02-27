
-- Drop the existing foreign key constraint
ALTER TABLE attendance
DROP CONSTRAINT IF EXISTS attendance_class_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE attendance
ADD CONSTRAINT attendance_class_id_fkey
FOREIGN KEY (class_id)
REFERENCES timetables(id)
ON DELETE CASCADE;
