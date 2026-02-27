
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

async function inspectUser() {
  const userId = '09b6bbd9-94c4-4ada-aa4e-fc2158cd0154'; // Provided by user
  console.log(`--- Inspecting User: ${userId} ---`);

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', userId)
    .single();

  if (error) {
      console.log("Error fetching user:", error.message);
  } else {
      console.log("User Data:", user);
  }
}

inspectUser();
