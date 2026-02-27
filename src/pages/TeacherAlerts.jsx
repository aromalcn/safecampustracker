import React from 'react';
import EmergencyMonitor from '../components/EmergencyMonitor';
import { ShieldAlert } from 'lucide-react';

const TeacherAlerts = () => {
    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldAlert size={32} color="#dc2626" />
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    Campus Safety & Alerts
                </h1>
            </div>
            
            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1.1rem' }}>
                Real-time monitoring of campus safety alerts and SOS signals. Please keep this page open to receive immediate notifications of critical events.
            </p>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <EmergencyMonitor />
            </div>
        </div>
    );
};

export default TeacherAlerts;
