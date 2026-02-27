
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase configuration. Check your .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function autoAbsentAll() {
    console.log("🚀 Starting Bulk Auto-Absent Process...");
    
    const today = new Date();
    // Using local date components to avoid UTC mismatch
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    console.log(`📅 Date: ${dateStr} (${dayOfWeek})`);

    // 1. Fetch all classes for today
    const { data: classes, error: fetchError } = await supabase
        .from('timetables')
        .select('id, class_name, start_time, end_time')
        .eq('day_of_week', dayOfWeek);

    if (fetchError) {
        console.error("❌ Error fetching classes:", fetchError);
        return;
    }

    if (!classes || classes.length === 0) {
        console.log("ℹ️ No classes found for today.");
        return;
    }

    console.log(`📊 Found ${classes.length} classes for today.`);

    let totalMarked = 0;
    
    // 2. Loop through each class and call mark_absent_students
    for (const cls of classes) {
        // Check if class has ended
        const [endH, endM] = cls.end_time.split(':');
        const endTime = new Date();
        endTime.setHours(parseInt(endH), parseInt(endM), 0, 0);

        if (today < endTime) {
            console.log(`⏩ Skipping: ${cls.class_name} (Ends at ${cls.end_time}) - Not yet finished.`);
            continue;
        }

        process.stdout.write(`⏳ Marking absent for: ${cls.class_name} (${cls.end_time})... `);
        
        const { data, error } = await supabase.rpc('mark_absent_students', {
            p_class_id: cls.id,
            p_date: dateStr
        });

        if (error) {
            console.log(`❌ Error: ${error.message}`);
        } else {
            console.log(`✅ Success: ${data} students marked absent.`);
            totalMarked += data;
        }
    }

    console.log("\n" + "=".repeat(30));
    console.log(`🏁 Process Finished!`);
    console.log(`📝 Total students marked absent: ${totalMarked}`);
    console.log("=".repeat(30));
}

autoAbsentAll();
