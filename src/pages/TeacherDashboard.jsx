import React, { useEffect, useState } from 'react';
import { Users, CheckSquare, AlertTriangle, FileText, Bell, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth-service';
import { getTeacherStats, processAutoAbsentees, createAlert, markAttendance, getTeacherAlerts } from '../services/dashboard-service';
import { supabase } from '../supabase-config';
import MobileNav from '../components/MobileNav';
import AlertBanner from '../components/AlertBanner'; // [NEW]
import EmergencyMonitor from '../components/EmergencyMonitor';

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalPresent: 0,
        totalAbsent: 0,
        alertsReceived: 0
    });
    const [loading, setLoading] = useState(true);
    const [activeSafetyAlert, setActiveSafetyAlert] = useState(null); // Safety alerts

    // Modals State
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [showIncomingAlertsModal, setShowIncomingAlertsModal] = useState(false);
    const [incomingAlerts, setIncomingAlerts] = useState([]);

    useEffect(() => {
        const init = async () => {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                navigate('/login');
                return;
            }

            try {
                // Fetch profile logic
                const { data: profile } = await supabase
                    .from('users')
                    .select('username')
                    .eq('uid', currentUser.id)
                    .single();
                
                if (profile) {
                    currentUser.user_metadata = { ...currentUser.user_metadata, username: profile.username };
                }
            } catch (err) {
                console.error("Failed to fetch user profile", err);
            }

            setUser(currentUser);
            loadStats();
            
            // Auto-mark past unmarked attendance as absent
            processAutoAbsentees();
        };
        init();
    }, [navigate]);

    // Safety Alerts Subscription
    useEffect(() => {
        // Fetch initial active safety alerts
        const fetchSafetyAlert = async () => {
            const { data } = await supabase
                .from('safety_alerts')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data) setActiveSafetyAlert(data);
        };
        fetchSafetyAlert();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('teacher_safety_alerts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_alerts' }, payload => {
                if (payload.new && payload.new.is_active) {
                    setActiveSafetyAlert(payload.new);
                } else if (payload.new && !payload.new.is_active) {
                    setActiveSafetyAlert(current => 
                        (current && current.id === payload.new.id) ? null : current
                    );
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []); // Removed [activeSafetyAlert] to stop infinite loop

    const loadStats = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        const data = await getTeacherStats();
        setStats(data);
        if (!isBackground) setLoading(false);
    };

    // Real-time Attendance Subscription
    useEffect(() => {
        const subscription = supabase
            .channel('teacher_attendance_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
                console.log('🔔 Real-time Attendance Event:', payload.eventType, payload.new);
                loadStats(true); // Background refresh
            })
            .subscribe((status) => {
                console.log('📡 Teacher Attendance Subscription Status:', status);
                if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Realtime subscription failed. Ensure Realtime is enabled for the "attendance" table in Supabase.');
                }
            });

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'var(--font-family)', paddingBottom: '80px' }}>
            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav {
                        display: none !important;
                    }
                    .page-container {
                        padding: 1rem !important;
                    }
                    .class-item-stack {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 1rem;
                    }
                    .class-item-right {
                        text-align: left !important;
                        width: 100%;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                }
            `}</style>
            {/* TeacherNavbar removed (Layout handles it) */}
            
            {/* Campus-Wide Safety Alerts */}
            {activeSafetyAlert && (
                <div style={{
                    background: activeSafetyAlert.severity === 'critical' ? '#ef4444' : activeSafetyAlert.severity === 'warning' ? '#eab308' : '#3b82f6',
                    color: 'white',
                    padding: '1rem',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    animation: 'slideDown 0.3s ease-out',
                    zIndex: 1000
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', maxWidth: '1000px', margin: '0 auto' }}>
                        <AlertCircle size={24} />
                        <div>
                            <span style={{ textTransform: 'uppercase', marginRight: '8px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                {activeSafetyAlert.severity}
                            </span>
                            {activeSafetyAlert.title}: {activeSafetyAlert.message}
                        </div>
                    </div>
                </div>
            )}
            
            <AlertBanner /> {/* [NEW] High Visibility Alert Banner */}

            <main className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--spacing-lg)' }}>
                <header className="page-header" style={{ marginBottom: '2.5rem' }}>
                    <h2 className="page-title">Welcome, Prof. {user?.user_metadata?.username || 'Staff'}</h2>
                    <p className="page-subtitle">Here is your daily summary.</p>
                </header>

                {/* Stats Overview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <StatCard 
                        title="Total Present" 
                        value={loading ? "..." : stats.totalPresent} 
                        subtitle="Today"
                        icon={<Users size={24} color="#059669" />} 
                        bgColor="#ecfdf5"
                    />
                    <StatCard 
                        title="Total Absent" 
                        value={loading ? "..." : stats.totalAbsent} 
                        subtitle="Today"
                        icon={<Users size={24} color="#dc2626" />} 
                        bgColor="#fef2f2"
                    />
                    <StatCard 
                        title="Alerts Received" 
                        value={loading ? "..." : stats.alertsReceived} 
                        subtitle="Pending Review"
                        icon={<Bell size={24} color="#d97706" />} 
                        bgColor="#fffbeb"
                    />
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#374151', marginBottom: '1.25rem' }}>Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    
                    {/* Manual Attendance */}
                    <ActionCard 
                        title="Mark Attendance" 
                        description="Update attendance records manually."
                        icon={<CheckSquare size={24} color="#2563eb" />}
                        iconBg="#eff6ff"
                        onClick={() => navigate('/teacher/attendance')}
                    />

                    {/* Send Alert */}
                    <ActionCard 
                        title="Send Alert" 
                        description="Notify students or parents immediately."
                        icon={<AlertTriangle size={24} color="#dc2626" />}
                        iconBg="#fef2f2"
                        onClick={() => setShowAlertModal(true)}
                    />

                     {/* View Students */}
                     <ActionCard 
                        title="My Students" 
                        description="View list of students in your classes."
                        icon={<Users size={24} color="#059669" />}
                        iconBg="#ecfdf5"
                        onClick={() => navigate('/teacher/students')}
                    />

                    {/* Messages */}
                    <ActionCard 
                        title="Messages" 
                        description="Chat with parents and students."
                        icon={<FileText size={24} color="#2563eb" />}
                        iconBg="#eff6ff"
                        onClick={() => navigate('/teacher/chat')}
                    />

                    {/* View Reports */}
                    <ActionCard 
                        title="View Reports" 
                        description="Access detailed class reports."
                        icon={<FileText size={24} color="#7c3aed" />}
                        iconBg="#f5f3ff"
                        onClick={() => navigate('/teacher/reports')}
                    />

                    {/* View Incoming Alerts */}
                     <ActionCard 
                        title="Incoming Alerts" 
                        description="Check SOS messages and other alerts."
                        icon={<Bell size={24} color="#d97706" />}
                        iconBg="#fffbeb"
                        onClick={() => setShowIncomingAlertsModal(true)}
                    />
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#374151', marginBottom: '1.25rem' }}>Today's Classes</h3>
                <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                    <ClassItem time="09:00 AM" subject="Database Management" room="Hall 3" students="58/60" status="Completed" />
                    <ClassItem time="11:30 AM" subject="Advanced Algorithms" room="Lab 1" students="--" status="Upcoming" />
                    <ClassItem time="02:00 PM" subject="Project Review" room="Conf. Room A" students="--" status="Upcoming" />
                </div>
            </main>
            {/* MobileNav removed (Layout handles it) */}

            {/* Modals */}
            {showAttendanceModal && <AttendanceModal onClose={() => setShowAttendanceModal(false)} refreshStats={loadStats} />}
            {showAlertModal && <AlertModal onClose={() => setShowAlertModal(false)} refreshStats={loadStats} currentUser={user} />}
            {showIncomingAlertsModal && <IncomingAlertsModal onClose={() => setShowIncomingAlertsModal(false)} />}
        </div>
    );
};

const StatCard = ({ title, value, subtitle, icon, bgColor }) => (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>{title}</p>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#111827' }}>{value}</h3>
            </div>
            <div style={{ padding: '8px', background: bgColor, borderRadius: '10px' }}>
                {icon}
            </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
            <span style={{ fontWeight: 600 }}>{subtitle}</span>
        </p>
    </div>
);

const ActionCard = ({ title, description, icon, iconBg, onClick }) => (
    <div onClick={onClick} style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}>
        <div style={{ padding: '10px', background: iconBg, borderRadius: '10px', width: 'fit-content', marginBottom: '1rem' }}>
            {icon}
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{title}</h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>{description}</p>
    </div>
);

const ClassItem = ({ time, subject, room, students, status }) => (
    <div className="class-item-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '80px' }}>{time}</span>
            <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{subject}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>Room: {room}</p>
            </div>
        </div>
        <div className="class-item-right" style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: status === 'Completed' ? '#059669' : '#d97706', background: status === 'Completed' ? '#ecfdf5' : '#fffbeb', padding: '4px 10px', borderRadius: '20px', marginBottom: '4px' }}>
                {status}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{students} Attended</span>
        </div>
    </div>
);

// --- Simple Modals ---

const AttendanceModal = ({ onClose, refreshStats }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('present');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingClasses, setLoadingClasses] = useState(true);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            // Get teacher name
            const { data: profile } = await supabase.from('users').select('username').eq('uid', user.id).single();
            const teacherName = profile?.username;

            if (teacherName) {
                // Get today's classes
                const todayIndices = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayName = todayIndices[new Date().getDay()];

                const { data: schedule } = await supabase
                    .from('timetables')
                    .select('id, class_name, start_time, end_time')
                    .eq('teacher_name', teacherName)
                    .eq('day_of_week', todayName)
                    .order('start_time');
                
                setClasses(schedule || []);
                if (schedule && schedule.length > 0) {
                    setSelectedClassId(schedule[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching classes:", error);
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Find student by email
            const { data: users, error } = await supabase.from('users').select('uid').eq('email', email).single();
            if (error || !users) {
                alert('Student not found with that email.');
                setLoading(false);
                return;
            }

            const attendanceData = {
                student_id: users.uid,
                status: status,
                date: new Date().toISOString().split('T')[0]
            };

            // Only add class_id if a class is selected (optional but recommended)
            if (selectedClassId) {
                attendanceData.class_id = selectedClassId;
            }

            await markAttendance(attendanceData);

            alert('Attendance marked successfully');
            refreshStats();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to mark attendance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Mark Attendance</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>Select Class (Today)</label>
                        {loadingClasses ? (
                            <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Loading classes...</p>
                        ) : classes.length > 0 ? (
                            <select 
                                value={selectedClassId} 
                                onChange={e => setSelectedClassId(e.target.value)}
                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }}
                            >
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.class_name} ({c.start_time.slice(0,5)})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p style={{ fontSize: '0.9rem', color: '#ef4444' }}>No classes scheduled for today.</p>
                        )}
                    </div>

                    <input 
                        type="email" 
                        placeholder="Student Email" 
                        required 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }}
                    />
                    <select 
                        value={status} 
                        onChange={e => setStatus(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }}
                    >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                    </select>
                    <button disabled={loading} type="submit" style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        {loading ? 'Saving...' : 'Save Record'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const AlertModal = ({ onClose, refreshStats, currentUser }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('medium');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createAlert({
                title,
                message,
                severity,
                sender_id: currentUser.id,
                status: 'new'
            });
            alert('Alert sent successfully');
            refreshStats();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to send alert');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Send Alert</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input 
                        type="text" 
                        placeholder="Alert Title (e.g. Late Arrival)" 
                        required 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }}
                    />
                    <textarea 
                        placeholder="Message" 
                        required 
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%', minHeight: '80px' }}
                    />
                    <select 
                        value={severity} 
                        onChange={e => setSeverity(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }}
                    >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="critical">Critical</option>
                    </select>
                    <button disabled={loading} type="submit" style={{ padding: '12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        {loading ? 'Sending...' : 'Send Alert'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const IncomingAlertsModal = ({ onClose }) => {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexShrink: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Incoming Alerts</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '8px' }}>
                    <EmergencyMonitor />
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
