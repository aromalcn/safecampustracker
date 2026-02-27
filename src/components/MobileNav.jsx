import React from 'react';
import { Home, ClipboardList, Users, MessageSquare, BookOpen, Calendar, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const MobileNav = () => {
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
            display: 'none'
        }}>
            <NavItem 
                icon={<Home size={24} />} 
                label="Home" 
                active={isActive('/teacher')} 
                onClick={() => navigate('/teacher')} 
            />
             <NavItem 
                icon={<BookOpen size={24} />} 
                label="Classes" 
                active={isActive('/teacher/classes')} 
                onClick={() => navigate('/teacher/classes')} 
            />
            <NavItem 
                icon={<Users size={24} />} 
                label="Attd." 
                active={isActive('/teacher/attendance')} 
                onClick={() => navigate('/teacher/attendance')} 
            />
            <NavItem 
                icon={<Calendar size={24} />} 
                label="Sched." 
                active={isActive('/teacher/schedule')} 
                onClick={() => navigate('/teacher/schedule')} 
            />
            <NavItem 
                icon={<MessageSquare size={24} />} 
                label="Msgs" 
                active={isActive('/teacher/messages')} 
                onClick={() => navigate('/teacher/messages')} 
            />
            <NavItem 
                icon={<AlertTriangle size={24} />} 
                label="Safety" 
                active={isActive('/teacher/safety')} 
                onClick={() => navigate('/teacher/safety')} 
            />
            <NavItem 
                icon={<ClipboardList size={24} />} 
                label="Exams" 
                active={isActive('/teacher/exams')} 
                onClick={() => navigate('/teacher/exams')} 
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
            color: active ? '#7c3aed' : '#94a3b8',
            cursor: 'pointer',
            padding: '0 4px',
            minWidth: '50px'
        }}
    >
        {icon}
        <span style={{ fontSize: '0.65rem', fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
);

export default MobileNav;
