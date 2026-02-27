
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkValues() {
    console.log("Checking department/semester values...");

    // Timetables
    const { data: tData } = await supabase.from('timetables').select('department, semester').limit(5);
    console.log("Timetables Sample:", tData);

    // Users
    const { data: uData } = await supabase.from('users').select('department, semester').eq('role', 'student').limit(5);
    console.log("Users Sample:", uData);
}

checkValues();
