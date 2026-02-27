import { supabase } from '../supabase-config';

/**
 * Auto-Attendance Service
 * Automatically marks student attendance based on location during class hours
 */

class AutoAttendanceService {
    constructor() {
        this.checkInterval = null;
        this.isRunning = false;
        this.lastCheckTime = null;
        this.CHECK_FREQUENCY_MS = 2 * 60 * 1000; // Check every 2 minutes
    }

    /**
     * Start automatic attendance monitoring for a student
     * @param {Object} user - Current user object
     * @param {Array} todayClasses - Array of today's classes
     * @param {Object} locationMap - Map of location configurations
     * @param {Function} onAttendanceMarked - Callback when attendance is marked
     */
    start(user, todayClasses, locationMap, onAttendanceMarked) {
        if (this.isRunning) {
            console.log('Auto-attendance already running');
            return;
        }

        console.log('🤖 Starting automatic attendance monitoring...');
        this.isRunning = true;

        // Initial check
        this.checkAndMarkAttendance(user, todayClasses, locationMap, onAttendanceMarked);

        // Set up periodic checks
        this.checkInterval = setInterval(() => {
            this.checkAndMarkAttendance(user, todayClasses, locationMap, onAttendanceMarked);
        }, this.CHECK_FREQUENCY_MS);
    }

    /**
     * Stop automatic attendance monitoring
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('🛑 Stopped automatic attendance monitoring');
    }

    /**
     * Check if student is in class and mark attendance automatically
     */
    async checkAndMarkAttendance(user, todayClasses, locationMap, onAttendanceMarked) {
        if (!user || !todayClasses || !locationMap) return;

        const now = new Date();
        
        // Find current class
        const currentClass = todayClasses.find(c => {
            const [startH, startM] = c.start_time.split(':');
            const [endH, endM] = c.end_time.split(':');
            const start = new Date();
            start.setHours(parseInt(startH), parseInt(startM), 0, 0);
            const end = new Date();
            end.setHours(parseInt(endH), parseInt(endM), 0, 0);
            return now >= start && now <= end;
        });

        if (!currentClass) {
            // No class in session
            return;
        }

        // Check if already marked for this class today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingRecord } = await supabase
            .from('attendance')
            .select('id, status')
            .eq('student_id', user.id)
            .eq('class_id', currentClass.id)
            .eq('date', today)
            .maybeSingle();

        if (existingRecord) {
            // Already marked
            return;
        }

        // Get location configuration
        const roomName = currentClass.details;
        const locationConfig = locationMap[roomName];

        if (!locationConfig) {
            console.warn(`No location config found for ${roomName}`);
            return;
        }

        // Check geolocation
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude, altitude } = pos.coords;

                // Check if inside classroom bounds
                const isInside = this.checkInsideBounds(
                    latitude,
                    longitude,
                    locationConfig.latitude,
                    locationConfig.longitude,
                    locationConfig.width,
                    locationConfig.height
                );

                if (!isInside) {
                    console.log(`📍 Student outside classroom: ${currentClass.class_name}`);
                    return;
                }

                // Optional: Altitude check
                const roomAltitude = locationConfig.altitude || 0;
                if (altitude !== null) {
                    const isAltitudeValid = (altitude >= roomAltitude - 15) && (altitude <= roomAltitude + 15);
                    if (!isAltitudeValid) {
                        console.log(`📏 Altitude mismatch: ${altitude.toFixed(1)}m vs ${roomAltitude}m`);
                        return;
                    }
                }

                // Determine status (present vs late)
                const [startH, startM] = currentClass.start_time.split(':');
                const classStart = new Date();
                classStart.setHours(parseInt(startH), parseInt(startM), 0, 0);
                const diffMs = now - classStart;
                const diffMinutes = Math.floor(diffMs / 60000);
                
                const status = diffMinutes > 10 ? 'late' : 'present';

                // Mark attendance
                try {
                    const { error } = await supabase
                        .from('attendance')
                        .insert([{
                            student_id: user.id,
                            class_id: currentClass.id,
                            status: status,
                            date: today,
                            class_name: currentClass.class_name,
                            recorded_at: new Date().toISOString()
                        }]);

                    if (error) {
                        // Check if it's a duplicate error (23505 = unique violation)
                        if (error.code !== '23505') {
                            console.error('Error marking attendance:', error);
                        }
                        return;
                    }

                    console.log(`✅ Auto-marked ${status} for ${currentClass.class_name}`);
                    this.lastCheckTime = now;

                    // Notify callback
                    if (onAttendanceMarked) {
                        onAttendanceMarked({
                            className: currentClass.class_name,
                            status: status,
                            automatic: true
                        });
                    }

                } catch (err) {
                    console.error('Failed to mark attendance:', err);
                }
            },
            (err) => {
                console.warn('Location check failed:', err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000 // Cache location for 30 seconds
            }
        );
    }

    /**
     * Check if coordinates are inside classroom bounds
     */
    checkInsideBounds(userLat, userLng, roomLat, roomLng, width, height) {
        if (!width || !height || !roomLat || !roomLng) return false;

        const BUFFER = 5; // 5 meter buffer for GPS drift
        const halfH = (height / 2) + BUFFER;
        const halfW = (width / 2) + BUFFER;

        const dLat = halfH / 111320;
        const cosLat = Math.cos(roomLat * Math.PI / 180);
        const dLng = (Math.abs(cosLat) > 0.0001) ? halfW / (111320 * cosLat) : 0;

        const minLat = roomLat - dLat;
        const maxLat = roomLat + dLat;
        const minLng = roomLng - dLng;
        const maxLng = roomLng + dLng;

        return (
            userLat >= minLat &&
            userLat <= maxLat &&
            userLng >= minLng &&
            userLng <= maxLng
        );
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheckTime: this.lastCheckTime,
            checkFrequency: this.CHECK_FREQUENCY_MS
        };
    }
}

// Export singleton instance
export const autoAttendanceService = new AutoAttendanceService();
