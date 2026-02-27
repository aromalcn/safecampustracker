
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupFutureAbsentees() {
    console.log("🧹 Cleaning up accidental 'absent' marks for upcoming classes...");
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    // 1. Fetch all classes for today
    const { data: classes } = await supabase
        .from('timetables')
        .select('id, class_name, end_time')
        .eq('day_of_week', dayOfWeek);

    if (!classes) return;

    for (const cls of classes) {
        const [h, m] = cls.end_time.split(':');
        const endTime = new Date();
        endTime.setHours(parseInt(h), parseInt(m), 0, 0);

        // If class has NOT ended yet
        if (now < endTime) {
            console.log(`🧼 Cleaning records for: ${cls.class_name} (Ends at ${cls.end_time})`);
            
            const { error, count } = await supabase
                .from('attendance')
                .delete({ count: 'exact' })
                .eq('class_id', cls.id)
                .eq('date', dateStr)
                .eq('status', 'absent');

            if (error) {
                console.error(`❌ Error cleaning ${cls.class_name}:`, error.message);
            } else {
                console.log(`✅ Removed ${count || 0} accidental 'absent' records.`);
            }
        }
    }
}

cleanupFutureAbsentees();
