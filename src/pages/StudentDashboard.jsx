import React, { useEffect, useState } from 'react';
import { BookOpen, MapPin, Clock, CheckCircle, AlertCircle, LogOut, Navigation, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import { markAttendance } from '../services/dashboard-service';
import { autoAttendanceService } from '../services/auto-attendance-service';
import MapViewer from '../components/MapViewer';
import StudentMobileNav from '../components/StudentMobileNav';
import SOSButton from '../components/SOSButton'; // [NEW] Import SOS Button

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [todayClasses, setTodayClasses] = useState([]);
    const [showReminder, setShowReminder] = useState(false);
    const [reminderClass, setReminderClass] = useState(null);
    const [notifiedClasses, setNotifiedClasses] = useState(new Set());
    const [selectedClass, setSelectedClass] = useState(null);
    const [locationMap, setLocationMap] = useState({});
    const [viewingMapLocation, setViewingMapLocation] = useState(null);
    const [markingAttendance, setMarkingAttendance] = useState(false);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [activeAlert, setActiveAlert] = useState(null);
    const [isInClass, setIsInClass] = useState(null); // null=checking, true=inside, false=outside

    // Real-time location check for UI indicator
    useEffect(() => {
        if (!todayClasses.length) return;

        const checkLocationStatus = () => {
            const now = new Date();
            const currentClass = todayClasses.find(c => {
                const [startH, startM] = c.start_time.split(':');
                const [endH, endM] = c.end_time.split(':');
                const start = new Date(); start.setHours(startH, startM, 0);
                const end = new Date(); end.setHours(endH, endM, 0);
                return now >= start && now <= end;
            });

            if (!currentClass || !locationMap[currentClass.details] || !navigator.geolocation) {
                setIsInClass(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude, altitude } = pos.coords;
                    const locationConfig = locationMap[currentClass.details];
                    
                    const isInside = checkInsideBounds(
                        latitude, 
                        longitude, 
                        locationConfig.latitude, 
                        locationConfig.longitude, 
                        locationConfig.width, 
                        locationConfig.height
                    );

                    // Optional: Add altitude check here too for accuracy, or just keep it simple for the UI
                    // For UI indicator, simple lat/lng check is often enough to show "You are near/in class"
                    setIsInClass(isInside);
                },
                (err) => {
                    console.warn("Location check failed", err);
                    setIsInClass(null);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        };

        const locTimer = setInterval(checkLocationStatus, 10000); // Check every 10 sec
        checkLocationStatus(); // Initial check

        return () => clearInterval(locTimer);
    }, [todayClasses, locationMap]);

    useEffect(() => {
        // Fetch initial active alerts
        const fetchAlert = async () => {
            const { data } = await supabase
                .from('safety_alerts')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data) setActiveAlert(data);
        };
        fetchAlert();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('public:safety_alerts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_alerts' }, payload => {
                // Should re-fetch or handle payload
                // If INFO is new active alert
                if (payload.new && payload.new.is_active) {
                    setActiveAlert(payload.new);
                } else if (payload.new && !payload.new.is_active && activeAlert?.id === payload.new.id) {
                    setActiveAlert(null); // Dismiss if deactivated
                }
            })
            .subscribe();

        return () => {
             supabase.removeChannel(subscription);
        };
    }, [activeAlert]);


    useEffect(() => {
        const init = async () => {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                navigate('/login');
                return;
            }

                // Fetch real profile to get the username
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('username')
                        .eq('uid', currentUser.id)
                        .single();
                        
                    if (profile) {
                        currentUser.user_metadata = { ...currentUser.user_metadata, ...profile };
                    }
                } catch (err) {
                    console.error("Failed to fetch user profile", err);
                }
            
            setUser(currentUser);
            if (currentUser) {
                fetchStudentTimetable(currentUser);
                fetchTodayAttendance(currentUser.id);
            }
            fetchLocations();
        };
        init();

        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            checkReminders(now);
        }, 1000 * 60); // Check every minute

        return () => clearInterval(timer);
    }, [navigate, todayClasses, notifiedClasses]); // Added dependencies

    // Auto-Attendance Service
    useEffect(() => {
        if (!user || !todayClasses.length || !Object.keys(locationMap).length) {
            return;
        }

        // Start automatic attendance monitoring
        autoAttendanceService.start(
            user,
            todayClasses,
            locationMap,
            (result) => {
                // Callback when attendance is auto-marked
                console.log('🎓 Auto-marked:', result);
                setAttendancePopup({
                    success: true,
                    title: result.status === 'present' ? '✅ Auto-Marked Present!' : '⚠️ Auto-Marked Late',
                    message: `Attendance automatically recorded for ${result.className}`
                });
                // Refresh attendance records
                fetchTodayAttendance(user.id);
            }
        );

        // Cleanup: Stop service when component unmounts or dependencies change
        return () => {
            autoAttendanceService.stop();
        };
    }, [user, todayClasses, locationMap]);

    const checkReminders = (now) => {
        if (!todayClasses.length) return;

        // 1. Check for Auto-Attendance (Current Class)
        const currentClass = todayClasses.find(c => {
            const [startH, startM] = c.start_time.split(':');
            const [endH, endM] = c.end_time.split(':');
            const start = new Date(); start.setHours(startH, startM, 0);
            const end = new Date(); end.setHours(endH, endM, 0);
            return now >= start && now <= end;
        });

        if (currentClass) {
            // Attempt auto-mark periodically
            // We pass isManual=false. Logic inside decides if it should actually send request (based on time/status)
            verifyAndMark(currentClass, false);
        }

        // 2. Check for Reminders (Upcoming Class)
        todayClasses.forEach(cls => {
            // cls.start_time format "HH:MM:SS" or "HH:MM"
            const [hours, minutes] = cls.start_time.split(':');
            const classTime = new Date(now);
            classTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const diffMs = classTime - now;
            const diffMinutes = Math.floor(diffMs / 60000);

            // Check if it's exactly 10 minutes before
            if (diffMinutes >= 9 && diffMinutes <= 10) {
                 const classKey = `${cls.class_name}-${cls.start_time}`;
                 if (!notifiedClasses.has(classKey)) {
                     setReminderClass(cls);
                     setShowReminder(true);
                     setNotifiedClasses(prev => new Set(prev).add(classKey));
                 }
            }
        });
    };

    const fetchStudentTimetable = async (currentUser) => {
        try {
            // Get user details from DB to know department and semester
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('department, semester')
                .eq('uid', currentUser.id)
                .single();

            if (userError) throw userError;

            if (userData) {
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                
                // Map common department names to full names if needed
                const userDept = (userData.department || '').trim();
                let targetDept = userDept;
                
                // Normalize department names
                const normalizedDept = userDept.toUpperCase();
                
                if (normalizedDept === 'CSE' || normalizedDept === 'COMPUTER SCIENCE') targetDept = 'Computer Science';
                else if (normalizedDept === 'ECE' || normalizedDept === 'ELECTRONICS') targetDept = 'Electronics';
                else if (normalizedDept === 'MECH' || normalizedDept === 'MECHANICAL') targetDept = 'Mechanical';
                else if (normalizedDept === 'CIVIL') targetDept = 'Civil';
                else if (normalizedDept === 'IT' || normalizedDept === 'INFORMATION TECHNOLOGY') targetDept = 'Information Technology';
                else if (normalizedDept === 'EEE' || normalizedDept === 'ELECTRICAL') targetDept = 'Electrical';

                console.log(`Fetching timetable for: Dept=${targetDept} (Mapped from ${userDept}), Sem=${userData.semester}, Day=${today}`);

                // Fetch full timetable for the semester
                const { data: schedule, error: scheduleError } = await supabase
                    .from('timetables')
                    .select('*')
                    .eq('department', targetDept) // Use matched department
                    .eq('semester', userData.semester)
                    .order('start_time');

                if (scheduleError) throw scheduleError;
                
                // Filter for today
                const todays = (schedule || []).filter(t => t.day_of_week === today);
                setTodayClasses(todays);
            } else {
                console.warn("User data not found or incomplete for timetable fetch");
            }
        } catch (error) {
            console.error("Error fetching timetable:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodayAttendance = async (userId) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('attendance')
                .select('class_name, status')
                .eq('student_id', userId)
                .eq('date', today);

            if (error) throw error;
            setAttendanceRecords(data || []);
        } catch (error) {
            console.error("Error fetching today's attendance:", error);
        }
    };

    const fetchLocations = async () => {
        try {
            const { data, error } = await supabase
                .from('campus_locations')
                .select('*');
            
            if (error) throw error;

            const map = {};
            (data || []).forEach(loc => {
                map[loc.name] = loc;
            });
            setLocationMap(map);
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    };

    const nextClass = todayClasses.find(c => {
        const now = new Date();
        const [hours, minutes] = c.start_time.split(':');
        const classTime = new Date();
        classTime.setHours(parseInt(hours), parseInt(minutes), 0);
        return classTime > now;
    }) || todayClasses[0]; // Fallback to first class if day over or not started

    const checkInsideBounds = (userLat, userLng, roomLat, roomLng, width, height) => {
        if (!width || !height || !roomLat || !roomLng) return false;

        // 1 deg lat ~ 111320m
        // BUFFER: Add 5 meters to each side to account for GPS drift
        const BUFFER = 5; 
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
    };

    const [attendancePopup, setAttendancePopup] = useState(null);

    // Unified function to verify location and mark attendance
    const verifyAndMark = async (classItem, isManual = false) => {
        if (!user || markingAttendance) return;
        
        // 1. Check if already marked
        const isMarked = attendanceRecords.some(r => r.class_name === classItem.class_name);
        if (isMarked) {
             if (isManual) {
                 setAttendancePopup({
                     success: false,
                     title: "Already Marked",
                     message: "You have already marked attendance for today."
                 });
             }
             return;
        }

        setMarkingAttendance(true);

        const roomName = classItem.details;
        const locationConfig = locationMap[roomName];

        if (!locationConfig) {
            if (isManual) {
                 setAttendancePopup({
                     success: false,
                     title: "Location Error",
                     message: `Location data for '${roomName}' not found.`
                 });
            }
            setMarkingAttendance(false);
            return;
        }

        if (!navigator.geolocation) {
             if (isManual) {
                 setAttendancePopup({
                     success: false,
                     title: "Browser Error",
                     message: "Geolocation is not supported by your browser."
                 });
             }
             setMarkingAttendance(false);
             return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude, altitude } = pos.coords;
                // console.log("User Location:", latitude, longitude, altitude);
                // console.log("Target:", locationConfig.latitude, locationConfig.longitude, "Dims:", locationConfig.width, locationConfig.height);
                
                const isInside = checkInsideBounds(
                    latitude, 
                    longitude, 
                    locationConfig.latitude, 
                    locationConfig.longitude, 
                    locationConfig.width, 
                    locationConfig.height
                );

                if (!isInside && isManual) {
                     console.log("Location Mismatch Debug:", {
                        user: { lat: latitude, lng: longitude },
                        target: { lat: locationConfig.latitude, lng: locationConfig.longitude },
                        isInside
                     });
                }

                if (isInside) {
                    // Altitude Check
                    const roomAltitude = locationConfig.altitude || 0;
                    const userAltitude = altitude;

                    if (userAltitude === null) {
                        // If device doesn't support altitude, we skip this check or warn. 
                        // For now, let's allow it but maybe log it.
                        console.warn("Device did not report altitude. Skipping altitude check.");
                    } else {
                         // Relaxed Altitude Check: +/- 15 meters to account for GPS vertical error
                        // roomAltitude is the floor level. User can be slightly above or below due to error.
                        const isAltitudeValid = (userAltitude >= roomAltitude - 15) && (userAltitude <= roomAltitude + 15);
    
                        if (!isAltitudeValid) {
                             if (isManual) {
                                 setAttendancePopup({
                                     success: false,
                                     title: "Wrong Floor",
                                     message: `Altitude mismatch! You are at ${userAltitude.toFixed(1)}m. Expected ~${roomAltitude}m (+/- 15m).`
                                 });
                             }
                             setMarkingAttendance(false);
                             return;
                        }
                    }

                    // Calculate Status (Present vs Late)
                    const now = new Date();
                    const [startH, startM] = classItem.start_time.split(':');
                    const classStart = new Date();
                    classStart.setHours(parseInt(startH), parseInt(startM), 0, 0);
                    
                    const diffMs = now - classStart;
                    const diffMinutes = Math.floor(diffMs / 60000);
                    
                    let status = 'present';
                    if (diffMinutes > 10) status = 'late';

                    // Prevent auto-marking if it's late (forcing manual button press)
                    if (!isManual && status === 'late') {
                        setMarkingAttendance(false);
                        return; 
                    }
                    
                     try {
                        await markAttendance({
                            student_id: user.id,
                            class_id: classItem.id,
                            status: status,
                            date: new Date().toISOString().split('T')[0],
                            class_name: classItem.class_name
                        });
                        
                        setAttendancePopup({
                            success: true,
                            title: status === 'present' ? "On Time! 🎉" : "Marked Late ⚠️",
                            message: `Attendance marked successfully for ${classItem.class_name}.`
                        });

                        fetchTodayAttendance(user.id);
                     } catch (err) {
                         console.error("Error marking attendance:", err);
                         if (isManual && err.code !== '23505') {
                             setAttendancePopup({
                                 success: false,
                                 title: "Submission Failed",
                                 message: "Failed to mark attendance. Please try again."
                             });
                         }
                     }
                } else {
                    if (isManual) {
                        setAttendancePopup({
                            success: false,
                            title: "Location Mismatch",
                            message: `You are not in the classroom (${roomName}).`
                        });
                    }
                }
                setMarkingAttendance(false);
            },
            (err) => {
                if (isManual) {
                    console.error("Location error:", err);
                    setAttendancePopup({
                        success: false,
                        title: "Location Error",
                        message: "Could not retrieve your location. Check permissions."
                    });
                }
                setMarkingAttendance(false);
            },
            { enableHighAccuracy: true }
        );
    };

    // MANUAL BUTTON CLICK receives no args, needs to find current class
    const handleManualMark = () => {
        const now = new Date();
        const currentClass = todayClasses.find(c => {
            const [startH, startM] = c.start_time.split(':');
            const [endH, endM] = c.end_time.split(':');
            const start = new Date(); start.setHours(startH, startM, 0);
            const end = new Date(); end.setHours(endH, endM, 0);
            return now >= start && now <= end;
        });

        if (currentClass) {
            verifyAndMark(currentClass, true);
        } else {
             setAttendancePopup({
                 success: false,
                 title: "No Class",
                 message: "No class currently in session."
             });
        }
    };

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'var(--font-family)', paddingBottom: '2rem' }}>
            <style>{`
                @media (max-width: 768px) {
                    .mobile-stack {
                         flex-direction: column !important;
                         align-items: stretch !important;
                         gap: 1rem !important;
                    }
                    .mobile-hide {
                        display: none !important;
                    }
                }
            `}</style>
            
            {activeAlert && (
                 <div style={{
                     background: activeAlert.severity === 'critical' ? '#ef4444' : activeAlert.severity === 'warning' ? '#eab308' : '#3b82f6',
                     color: 'white',
                     padding: '1rem',
                     textAlign: 'center',
                     fontWeight: 'bold',
                     position: 'sticky',
                     top: 0,
                     zIndex: 9999,
                     boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                     animation: 'slideDown 0.3s ease-out'
                 }}>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', maxWidth: '1000px', margin: '0 auto' }}>
                        <AlertCircle size={24} />
                        <div>
                            <span style={{ textTransform: 'uppercase', marginRight: '8px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                {activeAlert.severity}
                            </span>
                             {activeAlert.title}: {activeAlert.message}
                        </div>
                     </div>
                 </div>
            )}
            
            {/* Auto-Attendance Status Banner */}
            {autoAttendanceService.getStatus().isRunning && todayClasses.some(c => {
                const now = new Date();
                const [startH, startM] = c.start_time.split(':');
                const [endH, endM] = c.end_time.split(':');
                const start = new Date(); start.setHours(parseInt(startH), parseInt(startM), 0);
                const end = new Date(); end.setHours(parseInt(endH), parseInt(endM), 0);
                return now >= start && now <= end;
            }) && (
                <div style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                    <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        background: '#dcfce7', 
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                    }}></div>
                    🤖 Auto-Attendance Active • Your location is being monitored during class
                </div>
            )}
            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--spacing-lg)' }}>
                <header className="page-header" style={{ marginBottom: '2.5rem' }}>
                    <h2 className="page-title">Hi, {user?.user_metadata?.username || 'Student'}! 👋</h2>
                    <p className="page-subtitle">{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </header>

                <div className="card" style={{ background: 'linear-gradient(135deg, var(--secondary-color), #000428)', color: 'white', marginBottom: '2rem' }}>
                        {(() => {
                            const now = new Date();
                            const currentClass = todayClasses.find(c => {
                                const [startH, startM] = c.start_time.split(':');
                                const [endH, endM] = c.end_time.split(':');
                                const start = new Date(); start.setHours(startH, startM, 0);
                                const end = new Date(); end.setHours(endH, endM, 0);
                                return now >= start && now <= end;
                            });

                            if (currentClass) {
                                const isMarked = attendanceRecords.some(r => r.class_name === currentClass.class_name && r.status === 'present');
                                const isLateMarked = attendanceRecords.some(r => r.class_name === currentClass.class_name && r.status === 'late');
                                
                                // Time Diff Calculation
                                const [startH, startM] = currentClass.start_time.split(':');
                                const classStart = new Date();
                                classStart.setHours(parseInt(startH), parseInt(startM), 0, 0);
                                const diffMs = new Date() - classStart;
                                const diffMinutes = Math.floor(diffMs / 60000);
                                const isLateWindow = diffMinutes > 10;

                                const showButton = !isMarked && !isLateMarked;

                                // Status for UI Badge
                                const locationBadge = isInClass === true 
                                    ? <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> You are in class</span>
                                    : isInClass === false 
                                        ? <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><Navigation size={14} /> You are outside</span>
                                        : <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Locating...</span>;

                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <div style={{ padding: '6px', background: 'white', borderRadius: '50%' }}>
                                                    <div style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.5px', color: '#fef08a' }}>HAPPENING NOW</span>
                                            </div>
                                            {locationBadge}
                                        </div>

                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{currentClass.class_name}</h2>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', opacity: 0.9, marginBottom: '1.5rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {currentClass.start_time.slice(0, 5)} - {currentClass.end_time.slice(0, 5)}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {currentClass.details}</span>
                                        </div>
                                        
                                        {showButton ? (
                                            isLateWindow ? (
                                                <button 
                                                    onClick={handleManualMark}
                                                    disabled={markingAttendance}
                                                    style={{ 
                                                        width: '100%', 
                                                        background: 'white', 
                                                        padding: '1rem', 
                                                        borderRadius: '12px', 
                                                        border: '2px solid #f59e0b', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        gap: '10px',
                                                        color: '#d97706', 
                                                        fontWeight: 700,
                                                        fontSize: '1rem',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    <AlertCircle size={20} />
                                                    {markingAttendance ? 'Verifying...' : 'Mark Late Attendance'}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={handleManualMark}
                                                    disabled={markingAttendance}
                                                    style={{ 
                                                        width: '100%', 
                                                        background: '#ffffff', 
                                                        padding: '1rem', 
                                                        borderRadius: '12px', 
                                                        border: 'none', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        gap: '10px',
                                                        color: '#0f172a',
                                                        fontWeight: 700,
                                                        fontSize: '1rem',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                                    }}
                                                >
                                                     {markingAttendance ? (
                                                        <> <Clock size={20} className="spin" /> Verifying Location... </>
                                                     ) : (
                                                        <> <MapPin size={20} /> Mark Attendance </>
                                                     )}
                                                </button>
                                            )
                                        ) : (
                                            <button 
                                                disabled
                                                style={{ 
                                                    width: '100%', 
                                                    background: isLateMarked ? '#fffbeb' : '#dcfce7', 
                                                    padding: '1rem', 
                                                    borderRadius: '12px', 
                                                    border: 'none', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    gap: '10px',
                                                    color: isLateMarked ? '#b45309' : '#166534',
                                                    fontWeight: 700,
                                                    fontSize: '1rem',
                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                {isLateMarked ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                                                {isLateMarked ? 'Marked Late' : 'Present'}
                                            </button>
                                        )}
                                    </>
                                );
                            } else if (nextClass) {
                                return (
                                    <>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem' }}>
                                            <div style={{ padding: '6px', background: 'white', borderRadius: '50%' }}>
                                                <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.5px' }}>UP NEXT</span>
                                        </div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{nextClass.class_name}</h2>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', opacity: 0.9 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {nextClass.start_time.slice(0, 5)}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {nextClass.details}</span>
                                        </div>
                                    </>
                                );
                            } else {
                                return (
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>No upcoming classes today</h2>
                                );
                            }
                        })()}
                </div>

                <div className="flex-col-mobile" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    {/* View Rooms Button */}
                    <button 
                        onClick={() => navigate('/rooms')}
                        className="full-width-mobile"
                        style={{ 
                            flex: 1,
                            background: 'white', 
                            padding: '1.25rem', 
                            borderRadius: '16px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '12px',
                            color: '#64748b',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        <MapPin size={24} />
                        Campus Rooms
                    </button>

                    {/* View Attendance Button */}
                    <button 
                        onClick={() => navigate('/student/attendance')}
                        className="full-width-mobile"
                        style={{ 
                            flex: 1,
                            background: 'white', 
                            padding: '1.25rem', 
                            borderRadius: '16px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '12px',
                            color: 'var(--primary-color)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        <BookOpen size={24} />
                        Attendance History
                    </button>
                </div>


                {/* Timeline Section */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Today's Timeline</h3>
                {loading ? (
                    <p>Loading schedule...</p>
                ) : todayClasses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {todayClasses.map((item, index) => {
                            const now = new Date();
                            const [startH, startM] = item.start_time.split(':');
                            const [endH, endM] = item.end_time.split(':');
                            const start = new Date(); start.setHours(startH, startM);
                            const end = new Date(); end.setHours(endH, endM);
                            
                            let status = 'upcoming';
                            if (now >= start && now <= end) status = 'current';
                            else if (now > end) status = 'completed';

                            return (
                                <TimelineItem 
                                    key={index}
                                    title={item.class_name} 
                                    time={`${item.start_time.slice(0,5)}`} 
                                    status={status} 
                                    location={item.details || 'Room TBD'}
                                    onClick={() => setSelectedClass(item)}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>No classes scheduled for today.</p>
                    </div>
                )}
            {user && <SOSButton user={user} />}
            {/* Class Details Modal */}
            {selectedClass && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setSelectedClass(null)}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '24px',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        animation: 'popIn 0.3s ease-out',
                        textAlign: 'left'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                                {selectedClass.class_name}
                            </h3>
                            <button onClick={() => setSelectedClass(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '50%' }}>
                                    <Clock size={20} color="#004e92" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TIME</p>
                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                                        {selectedClass.start_time ? selectedClass.start_time.slice(0, 5) : 'N/A'} - {selectedClass.end_time ? selectedClass.end_time.slice(0, 5) : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '50%' }}>
                                    <MapPin size={20} color="#004e92" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>ROOM / LOCATION</p>
                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                                        {selectedClass.details || 'Room TBD'}
                                    </p>
                                    {selectedClass.details && locationMap && locationMap[selectedClass.details] && (
                                        <>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                                {locationMap[selectedClass.details]?.location_details}
                                            </p>
                                            
                                            {locationMap[selectedClass.details]?.latitude && locationMap[selectedClass.details]?.longitude && (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedClass(null); // Close details modal
                                                        setViewingMapLocation(locationMap[selectedClass.details]);
                                                    }}
                                                    style={{ 
                                                        marginTop: '12px', 
                                                        background: '#eff6ff', 
                                                        color: '#2563eb', 
                                                        border: '1px solid #bfdbfe', 
                                                        padding: '8px 12px', 
                                                        borderRadius: '8px', 
                                                        fontSize: '0.85rem', 
                                                        fontWeight: 600, 
                                                        cursor: 'pointer',
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '6px',
                                                        width: '100%',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <Navigation size={14} /> View Location on Map
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '50%' }}>
                                    <BookOpen size={20} color="#004e92" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TEACHER</p>
                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                                        {selectedClass.teacher_name || 'TBA'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setSelectedClass(null)}
                            style={{
                                marginTop: '2rem',
                                background: '#f1f5f9',
                                color: '#334155',
                                border: 'none',
                                padding: '1rem 2rem',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            )}

            {showReminder && reminderClass && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '24px',
                        width: '90%',
                        maxWidth: '400px',
                        textAlign: 'center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        animation: 'popIn 0.3s ease-out'
                    }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            background: '#eff6ff',
                            color: '#004e92',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem auto'
                        }}>
                             <AlertCircle size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                            Class Reminder! 🔔
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            You have <strong>{reminderClass.class_name}</strong> starting in 10 minutes at <strong>{reminderClass.details}</strong>.
                        </p>
                        <button 
                            onClick={() => setShowReminder(false)}
                            style={{
                                background: '#004e92',
                                color: 'white',
                                border: 'none',
                                padding: '1rem 2rem',
                                borderRadius: '12px',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            Okay, got it
                        </button>
                    </div>
                </div>
            )}

            {/* Attendance Status Popup */}
            {attendancePopup && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setAttendancePopup(null)}>
                    <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '24px',
                        width: '90%',
                        maxWidth: '400px',
                        textAlign: 'center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        animation: 'popIn 0.3s ease-out'
                    }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            background: attendancePopup.success ? '#dcfce7' : '#fee2e2',
                            color: attendancePopup.success ? '#16a34a' : '#ef4444',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem auto'
                        }}>
                             {attendancePopup.success ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                            {attendancePopup.title}
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            {attendancePopup.message}
                        </p>
                        <button 
                            onClick={() => setAttendancePopup(null)}
                            style={{
                                background: attendancePopup.success ? '#16a34a' : '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '1rem 2rem',
                                borderRadius: '12px',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            Okay
                        </button>
                    </div>
                </div>
            )}

            {/* Map Viewer Modal */}
            {viewingMapLocation && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', width: '90%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{viewingMapLocation.name}</h2>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>{viewingMapLocation.location_details}</p>
                            </div>
                            <button onClick={() => setViewingMapLocation(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                            <MapViewer lat={viewingMapLocation.latitude} lng={viewingMapLocation.longitude} width={viewingMapLocation.width} height={viewingMapLocation.height} />
                        </div>
                    </div>
                </div>
            )}
            </main>
            <StudentMobileNav />
        </div>
    );
};

const TimelineItem = ({ title, time, status, location, onClick }) => {
    const isCompleted = status === 'completed';
    const isCurrent = status === 'current';
    
    return (
        <div 
            onClick={onClick}
            style={{ 
            display: 'flex', 
            background: isCurrent ? '#ebf8ff' : 'white', 
            padding: '1rem', 
            borderRadius: '16px', 
            borderLeft: `4px solid ${isCurrent ? '#004e92' : isCompleted ? '#22c55e' : '#cbd5e1'}`,
            boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
            opacity: isCompleted ? 0.7 : 1,
            cursor: 'pointer',
            transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
            <div style={{ marginRight: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{time.split(' ')[0]}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{time.split(' ')[1]}</span>
            </div>
            <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#1e293b' }}>{title}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> {location}
                </p>
            </div>
        </div>
    );
};

export default StudentDashboard;
