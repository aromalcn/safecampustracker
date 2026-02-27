
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicies() {
  console.log("--- Checking RLS Policies for 'users' table ---");
  
  // Note: pg_policies is a system view, usually requires superuser or specific permissions. 
  // Service role key *might* have access if configured, but often doesn't to system catalogs.
  // We'll try. If this fails, we'll try a different approach or assume manual verification is needed.
  
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'users');

  if (error) {
    console.error("Error fetching policies (likely permission denied on system view):", error.message);
    const { data: testData, error: testError } = await supabase.from('users').select('count').limit(1);
    if(testError) console.error("Error querying users table:", testError);
    else console.log("Service key can query users table successfully.");
  } else {
    console.log("Active Policies:", data);
    if (data.length === 0) console.log("No policies found for 'users' table!");
  }
}

checkPolicies();
