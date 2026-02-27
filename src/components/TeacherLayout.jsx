import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, MessageSquare, LogOut, BookOpen, AlertTriangle, ClipboardList, Bell, FileText } from 'lucide-react';
import { logoutUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import './Layout.css'; // Reuse main layout styles for consistency
import MobileNav from './MobileNav';
import { autoAbsentService } from '../services/auto-absent-service';

const TeacherSidebar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <span className="logo-icon">👩‍🏫</span>
                <span className="logo-text">Faculty Portal</span>
            </div>
            <nav className="sidebar-nav" style={{ height: '100%' }}>
                <NavLink to="/teacher" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/teacher/students" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Users size={20} />
                    <span>Students</span>
                </NavLink>
                <NavLink to="/teacher/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <ClipboardList size={20} />
                    <span>Attendance</span>
                </NavLink>
                <NavLink to="/teacher/schedule" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Calendar size={20} />
                    <span>Schedule</span>
                </NavLink>
                <NavLink to="/teacher/messages" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MessageSquare size={20} />
                    <span>Messages</span>
                </NavLink>
                <NavLink to="/teacher/safety" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <AlertTriangle size={20} />
                    <span>Safety</span>
                </NavLink>
                <NavLink to="/teacher/exams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <ClipboardList size={20} />
                    <span>Exams</span>
                </NavLink>
                <NavLink to="/teacher/results" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <FileText size={20} />
                    <span>Results</span>
                </NavLink>
                <NavLink to="/teacher/announcements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Bell size={20} />
                    <span>Announcements</span>
                </NavLink>
                <div style={{ height: '1px', background: '#e0e0e0', margin: '10px 16px' }}></div>
                <NavLink to="/teacher/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <BookOpen size={20} />
                    <span>Profile</span>
                </NavLink>

                <div style={{ flex: 1 }}></div>

                <button
                    onClick={handleLogout}
                    className="nav-item"
                    style={{
                        background: 'none',
                        border: 'none',
                        width: '100%',
                        cursor: 'pointer',
                        color: '#d32f2f',
                        marginTop: 'auto'
                    }}
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </nav>
        </aside>
    );
};

const Header = () => {
    const [showNotifications, setShowNotifications] = React.useState(false);
    const [recentAnnouncements, setRecentAnnouncements] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!showNotifications) {
            fetchRecents();
        }
    }, [showNotifications]);

    const fetchRecents = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get user settings
            const { data: userData } = await supabase
                .from('users')
                .select('settings')
                .eq('uid', user.id)
                .single();

            const lastRead = userData?.settings?.last_read_announcements_at || new Date(0).toISOString();
            
            // 2. Fetch announcements tailored for teachers or all
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .or(`audience.eq.all,audience.eq.teacher`)
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) {
                setRecentAnnouncements(data);
                const unread = data.filter(ann => new Date(ann.created_at) > new Date(lastRead)).length;
                setUnreadCount(unread); 
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    const handleBellClick = async () => {
        const nextShow = !showNotifications;
        setShowNotifications(nextShow);
        
        if (nextShow && unreadCount > 0) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: userData } = await supabase
                    .from('users')
                    .select('settings')
                    .eq('uid', user.id)
                    .single();
                
                const currentSettings = userData?.settings || {};
                const updatedSettings = {
                    ...currentSettings,
                    last_read_announcements_at: new Date().toISOString()
                };

                await supabase
                    .from('users')
                    .update({ settings: updatedSettings })
                    .eq('uid', user.id);
                
                setUnreadCount(0);
            } catch (err) {
                console.error("Error updating read status:", err);
            }
        }
    };



    return (
        <header className="top-header" style={{ position: 'relative' }}>
            <div className="header-actions">
                <div style={{ position: 'relative' }}>
                    <button className="icon-btn" onClick={handleBellClick}>
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '-5px', right: '-5px',
                                background: '#ef4444', color: 'white', fontSize: '10px',
                                fontWeight: 'bold', height: '16px', width: '16px',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div style={{
                            position: 'absolute', top: '120%', right: '0',
                            width: '320px', background: 'white', borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            border: '1px solid #f1f5f9', zIndex: 50, overflow: 'hidden'
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>Notifications</h3>
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {recentAnnouncements.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                                        No new announcements
                                    </div>
                                ) : (
                                    recentAnnouncements.map(ann => (
                                        <div key={ann.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', cursor: 'default' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                {ann.priority === 'emergency' && <AlertTriangle size={14} color="#ef4444" />}
                                                <span style={{
                                                    fontSize: '0.75rem', fontWeight: 700,
                                                    color: ann.priority === 'emergency' ? '#ef4444' : ann.priority === 'high' ? '#f59e0b' : '#3b82f6',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {ann.priority}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>
                                                    {new Date(ann.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#334155' }}>{ann.title}</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {ann.message}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="user-profile">
                    <div className="avatar" style={{ background: '#7c3aed', color: 'white' }}>TR</div>
                    <span className="role-badge" style={{ background: '#f3e8ff', color: '#7c3aed' }}>Teacher</span>
                </div>
            </div>
        </header>
    );
};

const TeacherLayout = () => {
    React.useEffect(() => {
        autoAbsentService.start();
        return () => autoAbsentService.stop();
    }, []);

    return (
        <div className="layout-container">
            <TeacherSidebar />
            <div className="main-content" style={{ background: '#f5f3ff' }}> {/* Light Purple Tint */}
                <Header />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
            <MobileNav />
        </div>
    );
};

export default TeacherLayout;
