import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase-config';
import { AlertTriangle, CheckCircle, XCircle, MapPin, ExternalLink } from 'lucide-react';
import { updateAlertStatus } from '../services/dashboard-service';

const EmergencyMonitor = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef(null);
    const [soundEnabled, setSoundEnabled] = useState(true);

    useEffect(() => {
        fetchActiveAlerts();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('public:alerts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, handleNewAlert)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, handleUpdatedAlert)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchActiveAlerts = async () => {
        try {
            const { data, error } = await supabase
                .from('alerts')
                .select('*')
                .in('status', ['new', 'read']) // Fetch both new and read(but not resolved)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAlerts(data || []);
        } catch (err) {
            console.error("Error fetching alerts:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleNewAlert = (payload) => {
        const newAlert = payload.new;
        if (newAlert.status === 'resolved') return;

        setAlerts(prev => [newAlert, ...prev]);
        
        if (newAlert.severity === 'critical' || newAlert.severity === 'high') {
             triggerSound();
        }
    };

    const handleUpdatedAlert = (payload) => {
        const updatedAlert = payload.new;
        setAlerts(prev => {
            if (updatedAlert.status === 'resolved') {
                return prev.filter(a => a.id !== updatedAlert.id);
            }
            return prev.map(a => a.id === updatedAlert.id ? updatedAlert : a);
        });
    };

    const triggerSound = () => {
        if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed (user interaction needed first):", e));
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await updateAlertStatus(id, newStatus);
            // Optimistic update
            setAlerts(prev => {
                if (newStatus === 'resolved') {
                    return prev.filter(a => a.id !== id);
                }
                return prev.map(a => a.id === id ? { ...a, status: newStatus } : a);
            });
        } catch (err) {
            console.error("Failed to update status:", err);
            alert("Failed to update alert status.");
        }
    };

    const parseLocation = (message) => {
        // Try to extract lat,lng from message if structured in a known way
        // Message format from service: "... \nLocation: lat, lng \nMap: ..."
        const locRegex = /Location:\s*([-\d.]+),\s*([-\d.]+)/;
        const match = message.match(locRegex);
        if (match) {
            return { lat: match[1], lng: match[2] };
        }
        return null;
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading Monitor...</div>;

    if (alerts.length === 0) {
        return (
            <div style={{ 
                padding: '3rem', 
                textAlign: 'center', 
                background: '#f8fafc',
                borderRadius: '16px',
                border: '2px dashed #e2e8f0',
                color: '#94a3b8'
            }}>
                <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>All Systems Secure</h3>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>No active emergency alerts at the moment.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                 <h3 style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={24} className="animate-pulse" />
                    Active Emergencies ({alerts.length})
                 </h3>
                 <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        fontSize: '0.8rem',
                        color: soundEnabled ? '#10b981' : '#64748b'
                    }}
                >
                    {soundEnabled ? '🔔 Sound On' : '🔕 Sound Off'}
                </button>
            </div>
            
            {alerts.map(alert => {
                const location = parseLocation(alert.message);
                const isCritical = alert.severity === 'critical';

                return (
                    <div key={alert.id} style={{
                        background: isCritical ? '#fef2f2' : '#fff7ed',
                        border: `1px solid ${isCritical ? '#fecaca' : '#fed7aa'}`,
                        borderLeft: `6px solid ${isCritical ? '#dc2626' : '#ea580c'}`,
                        padding: '1.5rem',
                        borderRadius: '12px',
                        position: 'relative',
                        animation: isCritical ? 'flashBorder 2s infinite' : 'none'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                    <span style={{ 
                                        background: isCritical ? '#dc2626' : '#ea580c', 
                                        color: 'white', 
                                        padding: '4px 8px', 
                                        borderRadius: '4px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 800,
                                        textTransform: 'uppercase'
                                    }}>
                                        {alert.severity}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        {new Date(alert.created_at).toLocaleTimeString()}
                                    </span>
                                    {alert.status === 'read' && (
                                        <span style={{ fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                                            Acknowledged
                                        </span>
                                    )}
                                </div>
                                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                                    {alert.title}
                                </h4>
                                <p style={{ margin: 0, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                    {alert.message}
                                </p>
                                
                                {location && (
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                        <a 
                                            href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: '#2563eb',
                                                textDecoration: 'none',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                background: 'white',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #bfdbfe'
                                            }}
                                        >
                                            <MapPin size={16} /> View Location on Map <ExternalLink size={14} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {alert.status === 'new' && (
                                    <button 
                                        onClick={() => handleStatusUpdate(alert.id, 'read')}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <CheckCircle size={18} /> Acknowledge
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleStatusUpdate(alert.id, 'resolved')}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'white',
                                        color: '#334155',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <XCircle size={18} /> Resolve
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Hidden Audio Element for Sound Alert */}
            <audio ref={audioRef} src="/assets/alert-sound.mp3" preload="auto" />
            
            <style>{`
                @keyframes flashBorder {
                    0% { border-color: #fecaca; box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
                    50% { border-color: #dc2626; box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
                    100% { border-color: #fecaca; box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
                }
            `}</style>
        </div>
    );
};

export default EmergencyMonitor;
