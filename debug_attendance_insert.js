
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debugAuthenticatedInsert() {
    console.log("--- Testing Authenticated Insert ---");

    // 1. Login as Teacher1
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'teacher1@gmail.com', // Using standard credentials
        password: 'teacher1123'
    });

    if (authError || !user) {
        console.error("Login Failed:", authError);
        return;
    }
    console.log("Logged in as:", user.email);

    // 2. Fetch valid class & student
    const { data: times } = await supabase.from('timetables').select('id, class_name').limit(1);
    if (!times?.length) { console.error("No classes found!"); return; }
    
    const { data: stds } = await supabase.from('users').select('uid').eq('role', 'student').limit(1);
    
    // Check existing status values
    const { data: existing } = await supabase.from('attendance').select('status').limit(5);
    console.log("Existing Statuses:", existing?.map(e => e.status));
    
    // 3. Upsert Attendance
    const testData = {
        student_id: stds[0].uid, 
        class_id: times[0].id, 
        date: '2026-02-12', 
        status: 'late' // Try lowercase LATE
    };

    console.log("Upserting:", testData);

    const { data, error } = await supabase
        .from('attendance')
        .upsert(testData, { onConflict: 'student_id, class_id, date' })
        .select();

    if (error) {
        console.error("Insert Failed:", error);
    } else {
        console.log("Insert Success:", data);
        // Clean up
        await supabase.from('attendance').delete().eq('id', data[0].id);
        console.log("Cleaned up test record.");
    }
}

debugAuthenticatedInsert();
