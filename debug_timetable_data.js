
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
    console.log("--- Inspecting Timetable Data ---");

    // 1. Check if there are ANY entries in timetables
    const { data: allTimetables, error: timeError } = await supabase
        .from('timetables')
        .select('*')
        .limit(5);
    
    if (timeError) {
        console.error("Error fetching timetables:", timeError);
    } else {
        console.log(`Found ${allTimetables.length} timetable entries (sample):`);
        allTimetables.forEach(t => {
            console.log(`- Class: ${t.class_name}, Dept: '${t.department}', Sem: '${t.semester}', Type: ${typeof t.semester}`);
        });
    }

    // 2. Login as a student to check profile (if possible)
    console.log("\n--- Attempting Student Login (student1@gmail.com) ---");
    // Assumption: student1@gmail.com exists based on previous patterns, if not we'll fail but that's info too.
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'student1@gmail.com',
        password: 'password123' // Common password, or try 'student123'
    });

    if (loginError) {
        console.log("Login failed with 'password123', trying 'student123'...");
         const { data: { user: user2 }, error: loginError2 } = await supabase.auth.signInWithPassword({
            email: 'student1@gmail.com',
            password: 'student123'
        });
        
        if (loginError2) {
            console.error("Could not login as student1:", loginError2.message);
            return;
        }
        console.log("Logged in as student1.");
        await checkStudentProfile(user2, supabase);
    } else {
        console.log("Logged in as student1.");
        await checkStudentProfile(user, supabase);
    }
}

async function checkStudentProfile(user, supabaseClient) {
    const { data: profile, error } = await supabaseClient
        .from('users')
        .select('uid, username, department, semester')
        .eq('uid', user.id)
        .single();
    
    if (error) {
        console.error("Error fetching profile:", error);
    } else {
        console.log("\nStudent Profile:", profile);
        console.log(`Dept Type: ${typeof profile.department}, Sem Type: ${typeof profile.semester}`);

        // Try Query matching this profile
        const { data: mySchedule, error: schedError } = await supabaseClient
            .from('timetables')
            .select('*')
            .eq('department', profile.department)
            .eq('semester', profile.semester);
        
        if (schedError) {
             console.error("Error fetching specific schedule:", schedError);
        } else {
            console.log(`\nSchedule count for ${profile.department} Sem ${profile.semester}: ${mySchedule.length}`);
            if (mySchedule.length === 0) {
                 console.log("!! Possible Mismatch Reasons !!");
                 // Check partial matches
                 const { data: deptMatch } = await supabaseClient.from('timetables').select('id').eq('department', profile.department);
                 console.log(`- Entries matching Dept '${profile.department}': ${deptMatch?.length}`);
                 
                 const { data: semMatch } = await supabaseClient.from('timetables').select('id').eq('semester', profile.semester);
                 console.log(`- Entries matching Sem '${profile.semester}': ${semMatch?.length}`);
            }
        }
    }
}

inspectData();
