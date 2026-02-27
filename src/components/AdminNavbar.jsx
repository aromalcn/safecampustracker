import React, { useEffect, useState } from 'react';
import { Activity, Calendar, MapPin, LogOut, FileText, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../services/auth-service';
import { supabase } from '../supabase-config';

const AdminNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const init = async () => {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                // Fetch real profile to get the username
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('username')
                        .eq('uid', currentUser.id)
                        .single();
                        
                    if (profile) {
                        currentUser.user_metadata = { ...currentUser.user_metadata, ...profile };
                    }
                } catch (err) {
                    console.error("Failed to fetch user profile", err);
                }

                setUser(currentUser);
            }
        };
        init();
    }, []);

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="flex-col-mobile" style={{ background: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div 
                    onClick={() => navigate('/admin')}
                    style={{ padding: '8px', background: '#e3f2fd', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    <Activity size={24} color="#004e92" />
                </div>
                <h1 
                    onClick={() => navigate('/admin')}
                    style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b', cursor: 'pointer', marginRight: '1rem' }}
                >
                    Admin
                </h1>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={() => navigate('/admin/safety')} 
                        style={{ 
                            background: isActive('/admin/safety') ? '#fef2f2' : 'transparent', 
                            border: 'none', 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            fontSize: '0.9rem', 
                            fontWeight: 600, 
                            color: '#dc2626', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            lineHeight: '1',
                            opacity: isActive('/admin/safety') ? 1 : 0.8,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <AlertTriangle size={18} style={{ display: 'block', transform: 'translateY(-1px)' }} /> 
                        <span>Safety</span>
                    </button>

                    <button 
                        onClick={() => navigate('/admin/timetable')} 
                        style={{ 
                            background: isActive('/admin/timetable') ? '#eff6ff' : 'transparent', 
                            border: 'none', 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            fontSize: '0.9rem', 
                            fontWeight: 600, 
                            color: '#2563eb', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            lineHeight: '1',
                            opacity: isActive('/admin/timetable') ? 1 : 0.8,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Calendar size={18} style={{ display: 'block', transform: 'translateY(-1px)' }} /> 
                        <span>Timetable</span>
                    </button>

                    <button 
                        onClick={() => navigate('/admin/locations')} 
                        style={{ 
                            background: isActive('/admin/locations') ? '#ecfdf5' : 'transparent',
                            border: 'none', 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            fontSize: '0.9rem', 
                            fontWeight: 600, 
                            color: '#059669', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            lineHeight: '1',
                            opacity: isActive('/admin/locations') ? 1 : 0.8,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <MapPin size={18} style={{ display: 'block', transform: 'translateY(-1px)' }} /> 
                        <span>Classrooms</span>
                    </button>

                    <button 
                        onClick={() => navigate('/admin/reports')} 
                        style={{ 
                            background: isActive('/admin/reports') ? '#f3e8ff' : 'transparent',
                            border: 'none', 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            fontSize: '0.9rem', 
                            fontWeight: 600, 
                            color: '#7e22ce', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            lineHeight: '1',
                            opacity: isActive('/admin/reports') ? 1 : 0.8,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <FileText size={18} style={{ display: 'block', transform: 'translateY(-1px)' }} /> 
                        <span>Reports</span>
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                <span 
                    onClick={() => navigate('/profile')}
                    style={{ color: '#64748b', fontSize: '0.85rem', cursor: 'pointer' }} 
                    className="hide-on-mobile username-link"
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                >
                    {user?.user_metadata?.username || 'Admin'}
                </span>
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <LogOut size={16} /> Logout
                </button>
            </div>
        </nav>
    );
};

export default AdminNavbar;
