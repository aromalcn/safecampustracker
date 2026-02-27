import React from 'react';
import { ClipboardList, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/auth-service';

const TeacherNavbar = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    return (
        <nav style={{ background: 'white', padding: '1.25rem 2rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '8px' }}>
                        <ClipboardList size={22} color="#d97706" />
                    </div>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>Staff Portal</h1>
                </div>
                <div className="desktop-nav" style={{ gap: '1.5rem', display: 'flex' }}>
                    <button onClick={() => navigate('/teacher')} style={{ background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: 700, color: '#1f2937', cursor: 'pointer' }}>Dashboard</button>
                    <button onClick={() => navigate('/teacher/attendance')} style={{ background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}>Attendance</button>
                    <button onClick={() => navigate('/teacher/students')} style={{ background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}>Students</button>
                    <button onClick={() => navigate('/teacher/chat')} style={{ background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}>Messages</button>
                    <button onClick={() => navigate('/teacher/safety')} style={{ background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}>Safety</button>
                    <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}>Profile</button>
                </div>
            </div>

            <div className="desktop-nav">
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', color: '#dc2626', fontWeight: 600, cursor: 'pointer' }}>
                    <LogOut size={18} /> Logout
                </button>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav {
                        display: none !important;
                    }
                }
            `}</style>
        </nav>
    );
};

export default TeacherNavbar;
