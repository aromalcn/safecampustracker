import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, AlertTriangle, Bell, LogOut, FileText, Settings as SettingsIcon, HelpCircle, Calendar, MessageSquare, Trophy } from 'lucide-react';
import { logoutUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import './Layout.css';
import AdminMobileNav from './AdminMobileNav';
import { autoAbsentService } from '../services/auto-absent-service';
import NotificationBell from './NotificationBell';

const Sidebar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <span className="logo-icon">🛡️</span>
                <span className="logo-text">SafeCampus Tracker</span>
            </div>
            <nav className="sidebar-nav" style={{ height: '100%' }}> {/* Ensure nav takes height for flex spacer */}
                <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Users size={20} />
                    <span>Users</span>
                </NavLink>
                <NavLink to="/admin/attendance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Users size={20} />
                    <span>Attendance</span>
                </NavLink>
                <NavLink to="/admin/timetable" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Calendar size={20} />
                    <span>Timetable</span>
                </NavLink>
                <NavLink to="/admin/exams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <FileText size={20} />
                    <span>Exams</span>
                </NavLink>
                <NavLink to="/admin/results" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Trophy size={20} />
                    <span>Results</span>
                </NavLink>
                <NavLink to="/admin/locations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MapPin size={20} />
                    <span>Classrooms</span>
                </NavLink>
                <NavLink to="/admin/safety" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <AlertTriangle size={20} />
                    <span>Safety & SOS</span>
                </NavLink>
                <NavLink to="/admin/tracking" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MapPin size={20} />
                    <span>Live Tracking</span>
                </NavLink>
                <div style={{ height: '1px', background: '#e0e0e0', margin: '10px 16px' }}></div>
                <NavLink to="/admin/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <FileText size={20} />
                    <span>Reports</span>
                </NavLink>
                <NavLink to="/admin/announcements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Bell size={20} />
                    <span>Announcements</span>
                </NavLink>
                <NavLink to="/admin/messages" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MessageSquare size={20} />
                    <span>Messages</span>
                </NavLink>
                <NavLink to="/admin/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <SettingsIcon size={20} />
                    <span>Settings</span>
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
                        color: '#d32f2f', // Red color
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
                    <div className="avatar">AD</div>
                    <span className="role-badge">Admin</span>
                </div>
            </div>
        </header>
    );
};

const Layout = () => {
    React.useEffect(() => {
        autoAbsentService.start();
        return () => autoAbsentService.stop();
    }, []);

    return (
        <div className="layout-container">
            <Sidebar />
            <div className="main-content">
                <Header />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
            <AdminMobileNav />
        </div>
    );
};

export default Layout;
