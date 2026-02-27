import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase-config';

const ParentAnnouncements = () => {
    const navigate = useNavigate();
    const [notices, setNotices] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Fetch Personal Notifications
            const { data: notifs } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            setNotifications(notifs || []);

            // 2. Fetch Campus Announcements
            const { data: anns } = await supabase
                .from('announcements')
                .select('*')
                .in('audience', ['all', 'parent'])
                .order('created_at', { ascending: false });

            setNotices(anns || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const combinedList = [
        ...notifications.map(n => ({ ...n, source: 'personal' })),
        ...notices.map(n => ({ ...n, source: 'campus', priority: n.priority || 'normal' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const displayedList = activeTab === 'all' ? combinedList 
        : activeTab === 'personal' ? combinedList.filter(i => i.source === 'personal')
        : combinedList.filter(i => i.source === 'campus');

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/parent')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.background = '#f1f5f9'} onMouseLeave={(e) => e.target.style.background = 'none'}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Bell size={32} color="#f59e0b" /> Notifications & Notices
                </h1>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0' }}>
                {['all', 'personal', 'campus'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid #f59e0b' : '2px solid transparent',
                            color: activeTab === tab ? '#f59e0b' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading...</div>
            ) : displayedList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ background: '#f8fafc', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Bell size={32} color="#cbd5e1" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>No New Notices</h2>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>Check back later for important campus updates and announcements.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {displayedList.map(item => (
                        <div key={item.id} style={{ 
                            background: 'white', 
                            padding: '1.5rem', 
                            borderRadius: '20px', 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            border: '1px solid #e2e8f0',
                            borderLeft: item.source === 'campus'
                                ? `6px solid ${item.priority === 'emergency' ? '#ef4444' : item.priority === 'high' ? '#f59e0b' : '#3b82f6'}`
                                : `6px solid #8b5cf6` // Purple for personal
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {item.priority === 'emergency' && <AlertTriangle size={20} color="#ef4444" />}
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: 700 }}>{item.title}</h2>
                                    {item.source === 'personal' && <span style={{ fontSize: '0.7rem', background: '#f5f3ff', color: '#8b5cf6', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>PERSONAL</span>}
                                </div>
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
                                    {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            
                            <p style={{ margin: 0, lineHeight: '1.6', color: '#475569', fontSize: '1rem' }}>
                                {item.message}
                            </p>

                            {item.source === 'campus' && item.priority !== 'normal' && (
                                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '8px' }}>
                                    <span style={{ 
                                        fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', 
                                        color: item.priority === 'emergency' ? '#b91c1c' : '#92400e',
                                        background: item.priority === 'emergency' ? '#fee2e2' : '#fef3c7',
                                        padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px'
                                    }}>
                                        {item.priority} PRIORITY
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ParentAnnouncements;
