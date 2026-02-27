
import { supabase } from '../supabase-config';

/**
 * Auto-Absent Service
 * Automatically identifies ended classes and marks unmarked students as absent.
 * This runs in the background for Admin and Teacher roles.
 */

class AutoAbsentService {
    constructor() {
        this.isRunning = false;
        this.checkInterval = null;
        this.CHECK_FREQUENCY_MS = 15 * 60 * 1000; // Check every 15 minutes
        this.STORAGE_KEY = 'last_auto_absent_check';
    }

    /**
     * Start the background monitoring process
     */
    start() {
        if (this.isRunning) return;
        
        console.log('🕒 Starting background Auto-Absent worker...');
        this.isRunning = true;

        // Run immediately on start (forced catch-up)
        this.runCheck(true);

        // Schedule periodic checks
        this.checkInterval = setInterval(() => {
            this.runCheck();
        }, this.CHECK_FREQUENCY_MS);
    }

    /**
     * Stop the monitoring process
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('🕒 Stopped background Auto-Absent worker');
    }

    /**
     * Execute the check for ended classes
     * @param {boolean} force - If true, bypasses the throttle
     */
    async runCheck(force = false) {
        try {
            const now = new Date();
            const dateStr = this.getLocalDateString(now);
            const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
            
            // Throttle check frequency, but allow forced runs (like on initial load)
            const lastCheck = localStorage.getItem(this.STORAGE_KEY);
            if (!force && lastCheck && now.getTime() - parseInt(lastCheck) < 10 * 60 * 1000) {
                return;
            }

            console.log(`🕒 Auto-absent: Syncing attendance for all completed classes today (${dayOfWeek})...`);

            // 1. Fetch all classes for today
            const { data: classes, error: fetchError } = await supabase
                .from('timetables')
                .select('id, class_name, end_time')
                .eq('day_of_week', dayOfWeek);

            if (fetchError || !classes) return;

            // 2. Filter for all classes that have theoretically already finished
            const endedClasses = classes.filter(cls => {
                const [endH, endM] = cls.end_time.split(':');
                const endTime = new Date();
                endTime.setHours(parseInt(endH), parseInt(endM), 0, 0);
                
                // Class ended at least 5 minutes ago (minimum buffer for clock drift)
                return now > new Date(endTime.getTime() + 5 * 60 * 1000);
            });

            if (endedClasses.length === 0) {
                localStorage.setItem(this.STORAGE_KEY, now.getTime().toString());
                return;
            }

            console.log(`🕒 Auto-absent: Checking ${endedClasses.length} completed class sessions...`);

            // 3. Mark absentees for each ended class
            for (const cls of endedClasses) {
                const { data, error } = await supabase.rpc('mark_absent_students', {
                    p_class_id: cls.id,
                    p_date: dateStr
                });

                if (error) {
                    console.error(`❌ Auto-absent error for ${cls.class_name}:`, error.message);
                } else if (data > 0) {
                    console.log(`✅ Auto-absent: Marked ${data} students as absent for ${cls.class_name}`);
                }
            }

            localStorage.setItem(this.STORAGE_KEY, now.getTime().toString());

        } catch (err) {
            console.error('🕒 Auto-absent service failure:', err);
        }
    }

    /**
     * Helper to get YYYY-MM-DD in local time
     */
    getLocalDateString(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
}

export const autoAbsentService = new AutoAbsentService();
