import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Bell, User, LogOut, MessageSquare, ShieldAlert, Calendar, FileText, Trophy } from 'lucide-react';
import { logoutUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import './Layout.css'; // Reusing the main Layout CSS for consistency
import StudentMobileNav from './StudentMobileNav';
import NotificationBell from './NotificationBell';

const StudentSidebar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <span className="logo-icon">🎓</span>
                <span className="logo-text">Student Portal</span>
            </div>
            <nav className="sidebar-nav" style={{ height: '100%' }}>
                <NavLink to="/student" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/student/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <ClipboardList size={20} />
                    <span>My Attendance</span>
                </NavLink>
                <NavLink to="/student/timetable" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Calendar size={20} />
                    <span>Timetable</span>
                </NavLink>
                <NavLink to="/student/exams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <FileText size={20} />
                    <span>Exams</span>
                </NavLink>
                <NavLink to="/student/results" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Trophy size={20} />
                    <span>Academic Results</span>
                </NavLink>
                <NavLink to="/student/notices" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Bell size={20} />
                    <span>Announcements</span>
                </NavLink>
                <NavLink to="/student/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <User size={20} />
                    <span>My Profile</span>
                </NavLink>
                <NavLink to="/student/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MessageSquare size={20} />
                    <span>Messages</span>
                </NavLink>
                <NavLink to="/student/safety" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <ShieldAlert size={20} />
                    <span>Safety</span>
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
                    <div className="avatar" style={{ background: '#0056b3', color: 'white' }}>ST</div>
                    <span className="role-badge">Student</span>
                </div>
            </div>
        </header>
    );
};

const StudentLayout = () => {
    return (
        <div className="layout-container">
            <StudentSidebar />
            <div className="main-content">
                <Header />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
            <StudentMobileNav />
        </div>
    );
};

export default StudentLayout;
