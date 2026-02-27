
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchemas() {
    console.log("--- Timetables ---");
    const { data: tData } = await supabase.from('timetables').select('*').limit(1);
    console.log(tData?.[0] ? Object.keys(tData[0]) : "No timetable data");

    console.log("--- Users ---");
    const { data: uData } = await supabase.from('users').select('*').limit(1);
    console.log(uData?.[0] ? Object.keys(uData[0]) : "No user data");
}

checkSchemas();
