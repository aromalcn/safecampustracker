
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjhzjkwmrdeaooqjpffm.supabase.co';
const supabaseKey = 'sb_publishable_pN4nnM6sxaWZOsftr7ab8g_Ndzwyaab';
const supabase = createClient(supabaseUrl, supabaseKey);

async function compareDepts() {
    console.log("--- Checking Departments ---");
    
    // Check timetables (Teacher1's classes first, then general)
    const { data: times } = await supabase.from('timetables').select('department, teacher_name').limit(20);
    const timeDepts = [...new Set(times?.map(t => `${t.department} (Teacher: ${t.teacher_name})`))];
    console.log("Timetable Departments:", timeDepts);

    // Check users
    const { data: students } = await supabase.from('users').select('department, username').eq('role', 'student').limit(20);
    const studentDepts = [...new Set(students?.map(s => s.department))];
    console.log("Student Departments:", studentDepts);
}

compareDepts();
