import { supabase } from '../supabase-config';

// stats: { totalPresent: number, totalAbsent: number, alertsCount: number }
export const getTeacherStats = async () => {
    const today = new Date().toISOString().split('T')[0];

    try {
        // Fetch Attendance Stats for Today
        const { count: presentCount, error: presentError } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('date', today)
            .in('status', ['present', 'late', 'Present', 'Late']);
        
        if (presentError) throw presentError;

        const { count: absentCount, error: absentError } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('date', today)
            .eq('status', 'absent');

        if (absentError) throw absentError;

        // Fetch Alerts (New/Pending)
        const { count: alertsCount, error: alertsError } = await supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'new');

        if (alertsError) throw alertsError;

        return {
            totalPresent: presentCount || 0,
            totalAbsent: absentCount || 0,
            alertsReceived: alertsCount || 0
        };
    } catch (error) {
        console.error("Error fetching teacher stats:", error);
        return { totalPresent: 0, totalAbsent: 0, alertsReceived: 0 };
    }
};

export const getTeacherAlerts = async () => {
    const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
};

export const getAdminStats = async () => {
    try {
        // Total Students
        const { count: studentCount, error: studentError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
            
        if (studentError) throw studentError;

        // 1. Active SOS/Incoming Alerts (from alerts table)
        const { count: alertsCount, error: alertsError } = await supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .in('status', ['new', 'read']);

        if (alertsError) throw alertsError;

        // 2. Active Campus-Wide Broadcasts (from safety_alerts table)
        const { count: safetyCount, error: safetyError } = await supabase
            .from('safety_alerts')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
            
        if (safetyError) throw safetyError;

        // Simple Attendance Rate Calculation (Present / (Present + Absent)) * 100
        // Ideally checking ONLY today
        const today = new Date().toISOString().split('T')[0];
        const { count: presentCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('date', today)
            .in('status', ['present', 'late', 'Present', 'Late']);

        const { count: absentCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('date', today)
            .eq('status', 'absent');
        
        const total = (presentCount || 0) + (absentCount || 0);
        const rate = total > 0 ? Math.round(((presentCount || 0) / total) * 100) : 0;

        return {
            totalStudents: studentCount || 0,
            activeAlerts: (alertsCount || 0) + (safetyCount || 0),
            attendanceRate: rate
        };

    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return { totalStudents: 0, activeAlerts: 0, attendanceRate: 0 };
    }
};

export const createAlert = async (alertData) => {
    const { data, error } = await supabase
        .from('alerts')
        .insert([alertData]);
    if (error) throw error;
    return data;
};

export const markAttendance = async (attendanceData) => {
    // attendanceData: { student_id, status, date, class_id }
    const { data, error } = await supabase
        .from('attendance')
        .insert([attendanceData]);
    if (error) throw error;
    return data;
};

/**
 * Automatically identifies unmarked attendance for past classes 
 * and records them as 'absent' by calling the back-end RPC.
 */
export const processAutoAbsentees = async () => {
    try {
        // We'll check the last 5 days
        for (let i = 0; i <= 5; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            await cleanupUnmarkedForDate(dateStr);
        }
    } catch (error) {
        console.warn("🤖 Auto-absent process interrupted or failed:", error);
    }
};

/**
 * Cleanup unmarked students for a specific date
 */
export const cleanupUnmarkedForDate = async (targetDateStr) => {
    try {
        const now = new Date();
        const isToday = targetDateStr === now.toISOString().split('T')[0];
        const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false });
        
        // Parse date to get day of week correctly
        const [y, m, d] = targetDateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

        // 1. Fetch relevant schedules for this day
        let query = supabase.from('timetables').select('id, class_name').eq('day_of_week', dayOfWeek);
        
        // If checking today, only look at classes that have ALREADY ended
        if (isToday) {
            query = query.lt('end_time', currentTimeStr);
        }

        const { data: schedules, error: tError } = await query;
        if (tError || !schedules || schedules.length === 0) return;

        // 2. Run the database function for each class
        for (const schedule of schedules) {
            const { data: markedCount, error: rpcError } = await supabase.rpc('mark_absent_students', {
                p_class_id: schedule.id,
                p_date: targetDateStr
            });

            if (markedCount > 0) {
                console.log(`🤖 Auto-absent: Logged ${markedCount} for ${schedule.class_name} (${targetDateStr})`);
            }
        }
    } catch (err) {
        console.error("❌ Cleanup failed for date", targetDateStr, err);
    }
};

export const sendSOS = async (studentData) => {
    // studentData: { uid, username, location: { lat, lng } (optional) }
    const title = `SOS: ${studentData.username}`;
    let message = `SOS Button Pressed by ${studentData.username} at ${new Date().toLocaleTimeString()}`;
    
    if (studentData.location) {
        message += `\nLocation: ${studentData.location.lat}, ${studentData.location.lng}`;
        // Generate Google Maps link if possible
        message += `\nMap: https://www.google.com/maps?q=${studentData.location.lat},${studentData.location.lng}`;
    }

    const errors = [];

    // 1. Alert for Teachers (alerts table)
    const { error: teacherError } = await supabase
        .from('alerts')
        .insert([{
            title: title,
            message: message,
            severity: 'critical',
            sender_id: studentData.uid,
            status: 'new'
        }]);
    
    if (teacherError) {
        console.error("SOS Teacher Alert Error:", teacherError);
        errors.push("Teacher Alert: " + teacherError.message);
    }

    // 2. Alert for Students (safety_alerts table) - Students might not have permission here
    const { error: studentError } = await supabase
        .from('safety_alerts')
        .insert([{
            title: "SOS Alert",
            message: `${studentData.username} requested help!`,
            severity: 'critical',
            is_active: true,
            created_at: new Date().toISOString()
        }]);

    if (studentError) {
        console.error("SOS Student Alert Error:", studentError);
        errors.push("Student Alert: " + studentError.message);
    }

    // If both failed, throw error. If partial success, we consider it a success but maybe warn?
    // For SOS, if at least one went through, it's better than nothing.
    if (errors.length > 0) {
        if (errors.length === 2) {
             throw new Error(errors.join(" | "));
        } else {
             console.warn("Partial SOS success:", errors);
             // We can return warnings to UI if we want, but for now lets assume success if at least one worked
             // OR we can decide that Teacher Alert is critical.
        }
    }

    return { success: true, errors: errors };
};

export const updateAlertStatus = async (alertId, newStatus) => {
    const { data, error } = await supabase
        .from('alerts')
        .update({ status: newStatus })
        .eq('id', alertId)
        .select();

    if (error) throw error;
    return data;
};
