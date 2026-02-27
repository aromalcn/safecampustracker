
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase keys in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log("Checking if 'exam_schedules' table exists...");
    
    // Try to select 1 record. If table doesn't exist, it will error.
    const { data, error } = await supabase
        .from('exam_schedules')
        .select('*')
        .limit(1);

    if (error) {
        if (error.code === '42P01') { // undefined_table code in Postgres
             console.error("❌ Table 'exam_schedules' does NOT exist.");
             console.log("Please run the migration '05_create_exams_table.sql' in your Supabase SQL Editor.");
        } else {
            console.error("❌ Error accessing table:", error.message);
        }
        process.exit(1);
    } else {
        console.log("✅ Table 'exam_schedules' exists and is accessible!");
        console.log("Exams found:", data.length);
    }
}

checkTable();
