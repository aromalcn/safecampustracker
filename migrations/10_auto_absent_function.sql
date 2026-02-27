
-- Function to mark students as absent for a specific class instance
-- This logic assumes that if a student hasn't marked 'present' or 'late' by the time this is called, they are absent.

CREATE OR REPLACE FUNCTION mark_absent_students(p_class_id UUID, p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_department TEXT;
    v_semester TEXT;
    v_class_name TEXT;
    v_end_time TIME;
BEGIN
    -- 1. Get class details
    SELECT department, semester, class_name, end_time INTO v_department, v_semester, v_class_name, v_end_time
    FROM timetables
    WHERE id = p_class_id;

    IF v_department IS NULL THEN
        RAISE EXCEPTION 'Class not found';
    END IF;

    -- 2. Identify students who should have attended but have NO record
    
    -- Map Department Name to Code
    DECLARE 
        v_dept_code TEXT;
    BEGIN
        v_dept_code := CASE v_department
            WHEN 'Computer Science' THEN 'CSE'
            WHEN 'Information Technology' THEN 'IT'
            WHEN 'Electronics' THEN 'ECE'
            WHEN 'Mechanical' THEN 'MECH'
            WHEN 'Civil' THEN 'CIVIL'
            ELSE v_department -- Fallback
        END;

        WITH missing_students AS (
            SELECT u.uid
            FROM users u
            WHERE u.role = 'student'
            -- Use the mapped code OR try direct match if mapping failed/ambiguous
              AND (u.department::text = v_dept_code OR u.department::text = v_department::text)
              AND u.semester::text = v_semester::text
              AND NOT EXISTS (
                  SELECT 1 FROM attendance a 
                  WHERE a.student_id = u.uid 
                    AND a.class_id = p_class_id 
                    AND a.date = p_date
              )
        ),
        inserted_rows AS (
            INSERT INTO attendance (student_id, class_id, date, status, class_name, recorded_at)
            SELECT 
                uid, 
                p_class_id, 
                p_date, 
                'absent', 
                v_class_name,
                (p_date + v_end_time)::timestamp
            FROM missing_students
            RETURNING 1
        )
        SELECT COUNT(*) INTO v_count FROM inserted_rows;

        RETURN v_count;
    END;
END;
$$;
