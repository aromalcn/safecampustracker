
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
  console.log("--- Debugging Alerts ---");

  // 1. Check safety_alerts table
  console.log("\n[safety_alerts table]");
  const { data: safetyAlerts, error: saError } = await supabase
    .from('safety_alerts')
    .select('*');
  
  if (saError) console.error("Error fetching safety_alerts:", saError);
  else {
    console.log(`Found ${safetyAlerts.length} rows.`);
    safetyAlerts.forEach(a => console.log(`- ID: ${a.id}, Title: ${a.title}, Active: ${a.is_active}, Created: ${a.created_at}`));
  }

  // 2. Check alerts table (for the 0 count issue)
  console.log("\n[alerts table (SOS alerts)]");
  const { data: alerts, error: aError } = await supabase
    .from('alerts')
    .select('*');
  
  if (aError) console.error("Error fetching alerts:", aError);
  else {
    console.log(`Found ${alerts.length} rows.`);
    const activeAlerts = alerts.filter(a => ['new', 'viewed'].includes(a.status));
    console.log(`Active (new/viewed): ${activeAlerts.length}`);
    activeAlerts.forEach(a => console.log(`- ID: ${a.id}, Title: ${a.title}, Status: ${a.status}`));
  }

  // 3. Check Admin Users
  console.log("\n[Admin Users]");
  const { data: admins, error: admError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'admin');
  
  if (admError) console.error("Error fetching admin users:", admError);
  else {
    console.log(`Found ${admins.length} admins.`);
    admins.forEach(u => console.log(`- UID: ${u.uid}, Email: ${u.email}, Username: ${u.username}`));
  }

  // check if there are admins with capital 'ADMIN'
  const { data: capAdmins } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'ADMIN');
  if (capAdmins && capAdmins.length > 0) {
    console.log(`Found ${capAdmins.length} users with role 'ADMIN' (Capitalized!)`);
    capAdmins.forEach(u => console.log(`- UID: ${u.uid}, Email: ${u.email}`));
  }
}

debug();
