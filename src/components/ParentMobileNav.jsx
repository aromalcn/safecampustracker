import React from 'react';
import { LayoutDashboard, MapPin, Bell, MessageSquare, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const ParentMobileNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div className="mobile-nav-container" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 24px',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 100,
            boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)',
            display: 'none' // Hidden by default, shown via CSS media query
        }}>
            <NavItem 
                icon={<LayoutDashboard size={24} />} 
                label="Home" 
                active={isActive('/parent')} 
                onClick={() => navigate('/parent')} 
            />
            <NavItem 
                icon={<MapPin size={24} />} 
                label="Tracking" 
                active={isActive('/parent/tracking')} 
                onClick={() => navigate('/parent/tracking')} 
            />
            <NavItem 
                icon={<Bell size={24} />} 
                label="Alerts" 
                active={isActive('/parent/alerts')} 
                onClick={() => navigate('/parent/alerts')} 
            />
             <NavItem 
                icon={<MessageSquare size={24} />} 
                label="Chat" 
                active={isActive('/parent/chat')} 
                onClick={() => navigate('/parent/chat')} 
            />
            <NavItem 
                icon={<User size={24} />} 
                label="Profile" 
                active={isActive('/profile')} 
                onClick={() => navigate('/profile')} 
            />
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            border: 'none',
            background: 'none',
            color: active ? '#4f46e5' : '#94a3b8',
            cursor: 'pointer',
            padding: '0 8px'
        }}
    >
        {icon}
        <span style={{ fontSize: '0.7rem', fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
);

export default ParentMobileNav;
