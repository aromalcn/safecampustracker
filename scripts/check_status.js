
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkStatusConstraint() {
    // Try to insert a dummy record with status 'late' and see if it fails
    // We'll use a non-existent ID to ensure it fails on FK but passes constraint check, 
    // or just checking the error message.
    // Actually, cleaner way is to just inspect the error if we try to insert.
    
    // Better: just check text definition if possible, but that's hard via client.
    // Let's assume 'late' is valid or try to add it.
    
    console.log("Checking if 'late' is a valid status...");
    
    // We will assume it might be valid. If it fails during runtime, we can fix it.
    // But let's try to verify via a quick query if possible.
    // Actually, I can just check the `fix_attendance_schema_and_rls.sql` file I might have viewed earlier or just check the constraints via SQL error.
    
    const { error } = await supabase
        .from('attendance')
        .insert({
            student_id: '00000000-0000-0000-0000-000000000000', // Dummy
            class_id: 99999,
            status: 'late',
            date: '2025-01-01',
            class_name: 'Test'
        });

    if (error) {
        console.log("Error:", error.message);
        if (error.message.includes('check constraint')) {
            console.log("Constraint violation likely for status");
        }
    } else {
        console.log("Insert successful (unexpected given dummy IDs, but status valid).");
    }
}

checkStatusConstraint();
