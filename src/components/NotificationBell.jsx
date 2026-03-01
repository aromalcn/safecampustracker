
import React, { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { supabase } from '../supabase-config';

const NotificationBell = () => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
        
        // Subscribe to real-time notifications
        const setupSubscription = async () => {
             const { data: { user } } = await supabase.auth.getUser();
             if (!user) return;

             const subscription = supabase
                .channel('personal_notifications')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, payload => {
                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);
                })
                .subscribe();

            return () => supabase.removeChannel(subscription);
        };
        
        setupSubscription();
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) {
                setNotifications(data);
                const unread = data.filter(n => !n.is_read).length;
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    const handleBellClick = () => {
        setShowNotifications(!showNotifications);
    };

    const markAsRead = async (id) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
            
            if (!error) {
                setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error("Error marking read:", err);
        }
    };

    const markAllRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
            
            if (!error) {
                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteNotification = async (e, id) => {
        e.stopPropagation();
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
            
            if (!error) {
                setNotifications(notifications.filter(n => n.id !== id));
                const n = notifications.find(noti => noti.id === id);
                if (n && !n.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <button 
                onClick={handleBellClick}
                style={{
                    background: 'none', border: 'none', padding: '8px', cursor: 'pointer',
                    color: '#64748b', position: 'relative', display: 'flex', alignItems: 'center'
                }}
            >
                <Bell size={22} color={unreadCount > 0 ? '#1e293b' : '#64748b'} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '0', right: '0',
                        background: '#ef4444', color: 'white', fontSize: '9px',
                        fontWeight: 'bold', height: '16px', minWidth: '16px', padding: '0 4px',
                        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid white'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {showNotifications && (
                <div style={{
                    position: 'absolute', top: '120%', right: '0',
                    width: '350px', background: 'white', borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden'
                }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Personal Inbox</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                <div style={{ background: '#f8fafc', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                    <Bell size={24} color="#cbd5e1" />
                                </div>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>You don't have any notifications yet.</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => !n.is_read && markAsRead(n.id)}
                                    style={{ 
                                        padding: '16px', borderBottom: '1px solid #f8fafc', cursor: n.is_read ? 'default' : 'pointer',
                                        background: n.is_read ? 'white' : '#f0f9ff',
                                        transition: 'background 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ 
                                            padding: '8px', borderRadius: '10px', height: 'fit-content',
                                            background: n.type === 'safety' ? '#fee2e2' : n.type === 'academic' ? '#dcfce7' : '#eff6ff',
                                            color: n.type === 'safety' ? '#ef4444' : n.type === 'academic' ? '#16a34a' : '#3b82f6'
                                        }}>
                                            {n.type === 'safety' ? <ShieldAlert size={18} /> : n.type === 'academic' ? <Info size={18} /> : <Info size={18} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>{n.title}</h4>
                                                <button onClick={(e) => deleteNotification(e, n.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>{n.message}</p>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                    {!n.is_read && (
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    {notifications.length > 0 && (
                         <div style={{ padding: '12px', textAlign: 'center', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Latest 10 updates</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
