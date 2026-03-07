
-- Update RPC to be more robust with department matching
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
    SELECT department, semester, class_name, end_time 
    INTO v_department, v_semester, v_class_name, v_end_time
    FROM timetables
    WHERE id = p_class_id;

    IF v_department IS NULL THEN
        RAISE EXCEPTION 'Class not found';
    END IF;

    -- 2. Identify students with flexible department matching
    WITH missing_students AS (
        SELECT u.uid
        FROM users u
        WHERE u.role = 'student'
          AND u.semester::text = v_semester::text
          AND (
              u.department ILIKE v_department -- Direct match
              OR (v_department = 'Computer Science' AND u.department IN ('CSE', 'CS', 'IT'))
              OR (v_department = 'Information Technology' AND u.department IN ('IT', 'CS'))
              OR (v_department = 'Electronics' AND u.department IN ('ECE', 'EC'))
              OR (v_department = 'Mechanical' AND u.department IN ('MECH', 'ME'))
              OR (v_department = 'Civil' AND u.department IN ('CIVIL', 'CE'))
          )
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
        ON CONFLICT (student_id, class_id, date) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_count FROM inserted_rows;

    RETURN v_count;
END;
$$;
