import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, MessageSquare, LogOut, BookOpen, AlertTriangle, ClipboardList, Bell, FileText } from 'lucide-react';
import { logoutUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import './Layout.css'; // Reuse main layout styles for consistency
import MobileNav from './MobileNav';
import { autoAbsentService } from '../services/auto-absent-service';
import NotificationBell from './NotificationBell';

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
    const navigate = useNavigate();



    return (
        <header className="top-header" style={{ position: 'relative' }}>
            <div className="header-actions">
                <NotificationBell />

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
