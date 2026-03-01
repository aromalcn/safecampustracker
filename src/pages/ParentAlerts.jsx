import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, ShieldCheck, Clock, ArrowLeft, Filter } from 'lucide-react';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';

const ParentAlerts = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState([]);
    const [linkedStudentIds, setLinkedStudentIds] = useState([]);
    const [filter, setFilter] = useState('all'); // all, broadcast, emergency

    useEffect(() => {
        const fetchContext = async () => {
            const user = await getCurrentUser();
            if (!user) {
                navigate('/login');
                return;
            }

            const { data: links } = await supabase
                .from('parent_student_links')
                .select('student_id')
                .eq('parent_id', user.id);
            
            const sIds = links?.map(l => l.student_id) || [];
            setLinkedStudentIds(sIds);
            
            await fetchAlerts(sIds);
            setLoading(false);
        };

        fetchContext();
    }, [navigate]);

    const fetchAlerts = async (sIds) => {
        try {
            // 1. Campus-wide Broadcasts (audience: all, parent)
            const { data: broadcasts } = await supabase
                .from('safety_alerts')
                .select('*')
                .or(`audience.eq.all,audience.eq.parent`)
                .order('created_at', { ascending: false });

            // 2. High-Severity Emergency Alerts related to linked students (SOS, etc)
            let emergencies = [];
            if (sIds.length > 0) {
                const { data } = await supabase
                    .from('alerts')
                    .select('*, users!alerts_sender_id_fkey(username)')
                    .in('sender_id', sIds)
                    .order('created_at', { ascending: false });
                emergencies = data || [];
            }

            // Combine and sort
            const unified = [
                ...(broadcasts || []).map(b => ({ ...b, type: 'broadcast' })),
                ...emergencies.map(e => ({ 
                    ...e, 
                    type: 'emergency', 
                    title: `Emergency: ${e.users?.username || 'Ward'} triggered SOS`,
                    severity: e.severity || 'critical'
                }))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setAlerts(unified);
        } catch (err) {
            console.error("Alerts fetch error:", err);
        }
    };

    const filteredAlerts = alerts.filter(a => {
        if (filter === 'all') return true;
        return a.type === filter;
    });

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading alerts...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/parent')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Safety Alerts</h1>
                </div>

                <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                    <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
                    <FilterButton active={filter === 'broadcast'} onClick={() => setFilter('broadcast')} label="Campus" />
                    <FilterButton active={filter === 'emergency'} onClick={() => setFilter('emergency')} label="Emergency" />
                </div>
            </div>

            {filteredAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ background: '#f0fdf4', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldCheck size={32} color="#16a34a" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Campus is Safe</h2>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>There are no active alerts or emergency notifications for your account at this time.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {filteredAlerts.map(alert => (
                        <AlertCard key={alert.id} alert={alert} />
                    ))}
                </div>
            )}
        </div>
    );
};

const FilterButton = ({ active, onClick, label }) => (
    <button 
        onClick={onClick}
        style={{
            padding: '6px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            background: active ? 'white' : 'transparent',
            color: active ? '#1e293b' : '#64748b',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
        }}
    >
        {label}
    </button>
);

const AlertCard = ({ alert }) => {
    const isCritical = alert.severity === 'critical';
    const isWarning = alert.severity === 'warning';
    
    return (
        <div style={{ 
            background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0',
            borderLeft: `6px solid ${isCritical ? '#dc2626' : isWarning ? '#f97316' : '#3b82f6'}`,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: isCritical ? '#dc2626' : isWarning ? '#f97316' : '#3b82f6' }}>
                        <AlertTriangle size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{alert.title}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Clock size={14} />
                    {new Date(alert.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
            </div>
            
            <p style={{ margin: '0 0 1rem 0', color: '#475569', lineHeight: 1.5, fontSize: '0.95rem' }}>
                {alert.message}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                    background: alert.type === 'emergency' ? '#fef2f2' : '#eff6ff',
                    color: alert.type === 'emergency' ? '#b91c1c' : '#1e40af'
                }}>
                    {alert.type}
                </span>

                {/* Status Badge for Emergency Alerts */}
                {alert.type === 'emergency' && (
                    <span style={{ 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                        background: alert.status === 'new' ? '#fee2e2' : alert.status === 'viewed' ? '#dbeafe' : '#f1f5f9',
                        color: alert.status === 'new' ? '#dc2626' : alert.status === 'viewed' ? '#2563eb' : '#64748b'
                    }}>
                        {alert.status || 'NEW'}
                    </span>
                )}

                {/* Status Badge for Broadcasts */}
                {alert.type === 'broadcast' && (
                    <span style={{ 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                        background: alert.is_active ? '#dcfce7' : '#f1f5f9',
                        color: alert.is_active ? '#15803d' : '#64748b'
                    }}>
                        {alert.is_active ? 'ACTIVE' : 'RESOLVED'}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ParentAlerts;
