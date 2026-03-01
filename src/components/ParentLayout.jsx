import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Bell, LogOut, MessageSquare, User, Trophy } from 'lucide-react';
import { logoutUser } from '../services/auth-service';
import './Layout.css';
import ParentMobileNav from './ParentMobileNav';
import NotificationBell from './NotificationBell';

const ParentSidebar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <span className="logo-icon">👪</span>
                <span className="logo-text">Parent Portal</span>
            </div>
            <nav className="sidebar-nav" style={{ height: '100%' }}>
                <NavLink to="/parent" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/parent/tracking" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MapPin size={20} />
                    <span>Live Tracking</span>
                </NavLink>
                <NavLink to="/parent/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Bell size={20} />
                    <span>Alerts</span>
                </NavLink>
                 <NavLink to="/parent/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MessageSquare size={20} />
                    <span>Chat</span>
                </NavLink>
                <NavLink to="/parent/announcements" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Bell size={20} />
                    <span>Announcements</span>
                </NavLink>
                <NavLink to="/parent/results" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Trophy size={20} />
                    <span>Academic Reports</span>
                </NavLink>
                <NavLink to="/parent/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <User size={20} />
                    <span>My Profile</span>
                </NavLink>

                <div style={{ flex: 1 }}></div>

                <div className="sidebar-footer">
                    <div 
                        className="user-profile" 
                        onClick={() => navigate('/parent/profile')}
                        style={{ marginBottom: '1rem', width: '100%', cursor: 'pointer' }}
                    >
                        <div className="avatar" style={{ background: '#004e92' }}>P</div>
                        <div className="user-info">
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block' }}>Parent View</span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>View Profile</span>
                        </div>
                    </div>
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
                </div>
            </nav>
        </aside>
    );
};

const Header = () => {
    return (
        <header className="top-header">
            <div className="header-actions">
                <NotificationBell />
                 <div className="user-profile">
                    <div className="avatar" style={{ background: '#004e92', color: 'white' }}>P</div>
                    <span className="role-badge">Parent</span>
                </div>
            </div>
        </header>
    );
};

const ParentLayout = () => {
    return (
        <div className="layout-container">
            <ParentSidebar />
            <div className="main-content" style={{ background: '#f8f9fa' }}>
                <Header />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
            <ParentMobileNav />
        </div>
    );
};

export default ParentLayout;
