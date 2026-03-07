import React, { useEffect, useState } from 'react';
import { Users, AlertTriangle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../services/auth-service';
import { getAdminStats } from '../services/dashboard-service';
import { supabase } from '../supabase-config';

import EmergencyMonitor from '../components/EmergencyMonitor';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeAlerts: 0,
        attendanceRate: 0
    });
    const [activities, setActivities] = useState([]);

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
            fetchDashboardData();
        };
        init();
    }, [navigate]);

    // Real-time Attendance Subscription
    useEffect(() => {
        const subscription = supabase
            .channel('admin_attendance_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
                console.log('🔔 Admin: Real-time Attendance Event:', payload.eventType);
                fetchDashboardData(true); // Background refresh
            })
            .subscribe((status) => {
                console.log('📡 Admin Attendance Subscription Status:', status);
            });

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchDashboardData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            // 1. Fetch Stats
            const data = await getAdminStats();
            setStats(data);
            
            // 2. Fetch Recent Alerts for Activities
            const { data: recentAlerts } = await supabase
                .from('alerts')
                .select('title, created_at')
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentAlerts) {
                setActivities(recentAlerts.map(a => ({
                    id: a.created_at,
                    text: `Alert: ${a.title}`,
                    time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                })));
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logoutUser();
        navigate('/');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'var(--font-family)' }}>
            {/* AdminNavbar removed (Layout handles it) */}

            <main style={{ padding: 'var(--spacing-lg)', maxWidth: '1200px', margin: '0 auto' }}>
                <div className="page-header" style={{ marginBottom: '2rem' }}>
                    <h2 className="page-title">Dashboard Overview</h2>
                </div>
                
                {/* Emergency Monitor Section */}
                <div style={{ marginBottom: '2rem' }}>
                    <EmergencyMonitor />
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <StatCard 
                        title="Total Students" 
                        value={stats.totalStudents} 
                        icon={<Users size={24} color="white" />} 
                        gradient="linear-gradient(135deg, #004e92, #000428)" 
                    />
                    <StatCard 
                        title="Attendance Rate" 
                        value={`${stats.attendanceRate}%`} 
                        icon={<Calendar size={24} color="white" />} 
                        gradient="linear-gradient(135deg, #00c6ff, #0072ff)" 
                    />
                    <StatCard 
                        title="Active Alerts" 
                        value={stats.activeAlerts} 
                        icon={<AlertTriangle size={24} color="white" />} 
                        gradient="linear-gradient(135deg, #ff416c, #ff4b2b)" 
                    />
                </div>

                {/* Recent Activity Section */}
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div className="card" style={{ flex: '2 1 400px', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Recent Activity</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {activities.length === 0 ? (
                                <p style={{ color: '#94a3b8' }}>No recent activity.</p>
                            ) : (
                                activities.map((act) => (
                                    <ActivityItem key={act.id} text={act.text} time={act.time} />
                                ))
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ flex: '1 1 250px', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Campus Status</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <StatusItem label="Main Gate" status="Secure" color="#10b981" />
                            <StatusItem label="Library" status="Open" color="#10b981" />
                            <StatusItem label="Science Block" status="Restricted" color="#f59e0b" />
                            <StatusItem label="Server Room" status="Locked" color="#ef4444" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const StatCard = ({ title, value, icon, gradient }) => (
    <div style={{ background: gradient, padding: '1.5rem', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
        <div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', marginBottom: '4px' }}>{title}</p>
            <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{value}</h3>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
            {icon}
        </div>
    </div>
);

const ActivityItem = ({ text, time }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#004e92' }}></div>
        <div style={{ flex: 1 }}>
            <p style={{ margin: 0, color: '#334155', fontWeight: 500 }}>{text}</p>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>{time}</p>
        </div>
    </div>
);

const StatusItem = ({ label, status, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#475569', fontWeight: 600 }}>{label}</span>
        <span style={{ color: color, background: `${color}15`, padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>{status}</span>
    </div>
);

export default AdminDashboard;
