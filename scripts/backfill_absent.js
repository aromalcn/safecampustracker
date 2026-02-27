
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillAbsent(daysBack = 30) {
    console.log(`⏳ Starting Backfill for the last ${daysBack} days...`);
    
    const now = new Date();
    let totalMarked = 0;

    for (let i = 0; i <= daysBack; i++) {
        const currentDate = new Date();
        currentDate.setDate(now.getDate() - i);
        
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

        console.log(`\n📅 Checking ${dateStr} (${dayOfWeek})...`);

        // Get classes for this day
        const { data: classes, error: fetchError } = await supabase
            .from('timetables')
            .select('id, class_name, end_time')
            .eq('day_of_week', dayOfWeek);

        if (fetchError || !classes) {
            console.error(`❌ Error fetching classes for ${dateStr}`);
            continue;
        }

        if (classes.length === 0) {
            console.log(`ℹ️ No classes scheduled for ${dayOfWeek}.`);
            continue;
        }

        for (const cls of classes) {
            // Safety: If processing 'today', skip classes that haven't finished yet
            if (i === 0) {
                const [h, m] = cls.end_time.split(':');
                const endTime = new Date();
                endTime.setHours(parseInt(h), parseInt(m), 0, 0);
                if (now < endTime) {
                    console.log(`⏩ Skipping ${cls.class_name}: Not yet finished today.`);
                    continue;
                }
            }

            const { data, error } = await supabase.rpc('mark_absent_students', {
                p_class_id: cls.id,
                p_date: dateStr
            });

            if (error) {
                console.error(`❌ Error for ${cls.class_name}:`, error.message);
            } else if (data > 0) {
                console.log(`✅ Marked ${data} students absent for ${cls.class_name}`);
                totalMarked += data;
            } else {
                // Already marked or no students eligible
                // console.log(`ℹ️ ${cls.class_name}: No missing attendance.`);
            }
        }
    }

    console.log("\n" + "=".repeat(30));
    console.log(`🏁 Backfill Finished!`);
    console.log(`📝 Total students marked absent across past days: ${totalMarked}`);
    console.log("=".repeat(30));
}

// Default to last 30 days
backfillAbsent(30);
