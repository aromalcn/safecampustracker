import React from 'react';
import { Home, ClipboardList, User, Calendar, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const StudentMobileNav = () => {
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
            justifyContent: 'space-around', // space-around helps center items if fewer than 4
            alignItems: 'center',
            zIndex: 100,
            boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)'
        }}>
            <NavItem 
                icon={<Home size={24} />} 
                label="Home" 
                active={isActive('/student')} 
                onClick={() => navigate('/student')} 
            />
            <NavItem 
                icon={<ClipboardList size={24} />} 
                label="History" 
                active={isActive('/student/attendance')} 
                onClick={() => navigate('/student/attendance')} 
            />
            <NavItem 
                icon={<Calendar size={24} />} 
                label="Timetable" 
                active={isActive('/student/timetable')} 
                onClick={() => navigate('/student/timetable')} 
            />
            <NavItem 
                icon={<FileText size={24} />} 
                label="Exams" 
                active={isActive('/student/exams')} 
                onClick={() => navigate('/student/exams')} 
            />
            {/* Can add Profile or Account later */}
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
            color: active ? '#2563eb' : '#94a3b8',
            cursor: 'pointer',
            padding: '0 8px'
        }}
    >
        {icon}
        <span style={{ fontSize: '0.7rem', fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
);

export default StudentMobileNav;
