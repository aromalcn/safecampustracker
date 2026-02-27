
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  const migrationPath = path.resolve('/Users/nattianchira/Aromal/Websites/SafeCampusTracker/migrations/14_fix_exam_rls.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log("Applying Migration 14...");
  
  // Note: Standard Supabase client doesn't have a direct 'sql' method for raw queries.
  // We usually use RPC for this or rely on the user applying it in the dashboard.
  // However, I can try to use the internal admin endpoint if available or just 
  // remind the user.
  
  // Since I cannot run raw SQL easily via the JS client without a stored procedure,
  // I will check if I can create a helper RPC once and then use it.
  
  console.log("SQL to apply:\n", sql);
  console.log("\nAction: Please ensure this SQL is executed in your Supabase SQL Editor.");
}

applyMigration();
