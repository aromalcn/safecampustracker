
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTimetable() {
  console.log("--- Inspecting Timetable Table ---");
  
  // 4. Check Day of Week Logic
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  console.log("Calculated Day of Week for Today:", dayName);

  const { data: dayData, error: dayError } = await supabase
    .from('timetables')
    .select('*')
    .eq('day_of_week', dayName)
    .limit(5);

  if (dayError) console.log("Error fetching by day:", dayError.message);
  else console.log(`Found ${dayData.length} classes for TODAY (${dayName}):`, dayData);

  // 5. Test Specific Teacher Query (Hardcoded)
  const testTeacher = 'Teacher1';
  console.log(`Testing query for teacher: '${testTeacher}'`);
  const { data: specificData, error: specificError } = await supabase
    .from('timetables')
    .select('*')
    .ilike('teacher_name', testTeacher);
    
  if (specificError) console.log("Error specific query:", specificError.message);
  else console.log(`Found ${specificData.length} records for ${testTeacher}`);
}

inspectTimetable();
