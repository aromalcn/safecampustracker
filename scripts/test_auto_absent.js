
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    console.log("Testing mark_absent_students RPC...");

    // We need a valid class ID and date to test.
    // Fetch one timetable entry first.
    const { data: schedule } = await supabase.from('timetables').select('id, class_name').limit(1).single();

    if (!schedule) {
        console.error("No timetable found to test with.");
        return;
    }

    console.log(`Testing with Class: ${schedule.class_name} (${schedule.id})`);

    const date = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase.rpc('mark_absent_students', {
        p_class_id: schedule.id,
        p_date: date
    });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success. Result:", data);
    }
}

testRpc();
