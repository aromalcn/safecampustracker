
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjhzjkwmrdeaooqjpffm.supabase.co';
const supabaseKey = 'sb_publishable_pN4nnM6sxaWZOsftr7ab8g_Ndzwyaab'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Fetching all timetables...");
    const { data, error } = await supabase
        .from('timetables')
        .select('*');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${data.length} entries.`);
        if(data.length > 0) console.log("First entry:", data[0]);
    }
}

checkData();
