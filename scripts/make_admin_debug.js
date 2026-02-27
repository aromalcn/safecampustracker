
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use SERVICE_ROLE_KEY to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  console.log("Please add SUPABASE_SERVICE_ROLE_KEY to your .env file to run this admin script.");
  process.exit(1);
}

// Verify Key Role
try {
    const payload = JSON.parse(Buffer.from(supabaseServiceKey.split('.')[1], 'base64').toString());
    console.log("🔑 Key Role detected:", payload.role);
    if (payload.role !== 'service_role') {
        console.error("❌ ERROR: You provided an 'anon' key. You must use the 'service_role' (SECRET) key to bypass permissions.");
        process.exit(1);
    }
} catch (e) {
    console.warn("⚠️ Could not decode key to verify role.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeAdmin(email) {
  console.log(`--- Promoting User to Admin: ${email} ---`);

  // 1. Get User UID
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('uid, username, role')
    .eq('email', email);

  if (fetchError) {
    console.error("Error fetching user:", fetchError);
    return;
  }

  if (!users || users.length === 0) {
    console.error("User not found with email:", email);
    return;
  }

  const user = users[0];
  console.log("Found User:", user);

  // 2. Update Role to 'admin'
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('uid', user.uid)
    .select();

  if (updateError) {
    console.error("Error updating user role:", updateError);
  } else {
    console.log("Successfully promoted to admin:", updatedUser);
  }
}

// Replace with the email address of the user you want to make admin
const targetEmail = 'kiran@gmail.com'; 
makeAdmin(targetEmail);

