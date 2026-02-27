import React from 'react';
import { LayoutDashboard, Users, MapPin, AlertTriangle, FileText, Settings, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminMobileNav = () => {
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
            padding: '12px 16px',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 100,
            boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)',
            display: 'none' // Hidden by default, shown via CSS media query
        }}>
            <NavItem 
                icon={<LayoutDashboard size={24} />} 
                label="Home" 
                active={isActive('/admin')} 
                onClick={() => navigate('/admin')} 
            />
            <NavItem 
                icon={<Users size={24} />} 
                label="Attd." 
                active={isActive('/admin/attendance')} 
                onClick={() => navigate('/admin/attendance')} 
            />
             <NavItem 
                icon={<AlertTriangle size={24} />} 
                label="Safety" 
                active={isActive('/admin/safety')} 
                onClick={() => navigate('/admin/safety')} 
            />
            <NavItem 
                icon={<FileText size={24} />} 
                label="Exams" 
                active={isActive('/admin/exams')} 
                onClick={() => navigate('/admin/exams')} 
            />
            <NavItem 
                icon={<MapPin size={24} />} 
                label="Track" 
                active={isActive('/admin/tracking')} 
                onClick={() => navigate('/admin/tracking')} 
            />
            <NavItem 
                icon={<FileText size={24} />} 
                label="Reports" 
                active={isActive('/admin/reports')} 
                onClick={() => navigate('/admin/reports')} 
            />
            <NavItem 
                icon={<MessageSquare size={24} />} 
                label="Chat" 
                active={isActive('/admin/messages')} 
                onClick={() => navigate('/admin/messages')} 
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
            color: active ? '#7e22ce' : '#94a3b8',
            cursor: 'pointer',
            padding: '0 4px',
            minWidth: '50px'
        }}
    >
        {icon}
        <span style={{ fontSize: '0.65rem', fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
);

export default AdminMobileNav;
