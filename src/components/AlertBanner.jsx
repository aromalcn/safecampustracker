import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '../supabase-config';
import { getTeacherAlerts } from '../services/dashboard-service';

const AlertBanner = ({ linkedStudentIds = null }) => {
    const [activeAlert, setActiveAlert] = useState(null);
    const [dismissedId, setDismissedId] = useState(null);

    const checkAlerts = async () => {
        try {
            const alerts = await getTeacherAlerts();
            if (alerts && alerts.length > 0) {
                // Filter: 
                // 1. Must be 'new' status
                // 2. Must be critical/high severity
                // 3. If linkedStudentIds is provided, sender_id MUST be in that list
                
                let relevantAlerts = alerts.filter(a => (a.status === 'new' || a.status === 'read') && (a.severity === 'critical' || a.severity === 'high'));

                if (linkedStudentIds) {
                    relevantAlerts = relevantAlerts.filter(a => linkedStudentIds.includes(a.sender_id));
                }

                if (relevantAlerts.length > 0) {
                    setActiveAlert(relevantAlerts[0]);
                } else {
                    setActiveAlert(null);
                }
            }
        } catch (error) {
            console.error("Banner check failed", error);
        }
    };

    useEffect(() => {
        checkAlerts();

        // Real-time subscription for live SOS alerts
        const subscription = supabase
            .channel('live_sos_portal')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'alerts' 
            }, async (payload) => {
                const newAlert = payload.new;
                // Only act if new and critical/high
                if (newAlert.status === 'new' && (newAlert.severity === 'critical' || newAlert.severity === 'high')) {
                    // If filtering by students, check if this sender is one of them
                    if (!linkedStudentIds || linkedStudentIds.includes(newAlert.sender_id)) {
                        setActiveAlert(newAlert);
                        setDismissedId(null); // Reset dismissed state for new emergency
                    }
                }
            })
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'alerts' 
            }, (payload) => {
                const updated = payload.new;
                // If the currently active alert gets resolved, remove it
                if (activeAlert && updated.id === activeAlert.id) {
                    if (updated.status === 'resolved') {
                        setActiveAlert(null);
                    } else {
                        setActiveAlert(updated);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [linkedStudentIds, activeAlert?.id]);

    if (!activeAlert || activeAlert.id === dismissedId) return null;

    const isCritical = activeAlert.severity === 'critical';

    return (
        <div style={{
            background: isCritical ? '#ef4444' : '#f97316',
            color: 'white',
            padding: '1rem',
            textAlign: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 9998, // Below modal but above nav
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: 'slideDown 0.3s ease-out'
        }}>
            <div style={{ 
                maxWidth: '1200px', 
                margin: '0 auto', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '12px',
                position: 'relative'
            }}>
                <div style={{ 
                    padding: '8px', 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%',
                    animation: isCritical ? 'pulse 1.5s infinite' : 'none'
                }}>
                    <AlertTriangle size={24} strokeWidth={2.5} />
                </div>

                <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.9rem', opacity: 0.9 }}>
                        {activeAlert.severity} ALERT
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 700, fontSize: '1.1rem' }}>
                        {activeAlert.title}: {activeAlert.message}
                    </p>
                </div>

                <button 
                    onClick={() => setDismissedId(activeAlert.id)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    aria-label="Dismiss Alert"
                >
                    <X size={24} />
                </button>
            </div>
            
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes slideDown {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AlertBanner;
