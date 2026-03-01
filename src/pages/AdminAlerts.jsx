import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase-config';
import { AlertTriangle, Trash2, CheckCircle, Plus, Edit2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmergencyMonitor from '../components/EmergencyMonitor';

const AdminAlerts = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [newAlert, setNewAlert] = useState({ title: '', message: '', severity: 'info' });
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        const { data, error } = await supabase
            .from('safety_alerts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) console.error('Error fetching alerts:', error);
        else setAlerts(data || []);
        setLoading(false);
    };

    const handleCreateAlert = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (editingId) {
            console.log("Updating safety alert:", editingId, newAlert);
            const { data, error } = await supabase
                .from('safety_alerts')
                .update({ ...newAlert })
                .eq('id', editingId)
                .select();

            if (error) {
                console.error("Supabase Alert Update Error:", error);
                showToast('Failed to update: ' + error.message, 'error');
            } else {
                if (data && data[0]) {
                    setAlerts(alerts.map(a => a.id === editingId ? data[0] : a));
                }
                setEditingId(null);
                setNewAlert({ title: '', message: '', severity: 'info' });
                showToast('Alert updated successfully!');
            }
        } else {
            console.log("Broadcasting new safety alert:", newAlert);
            const { data, error } = await supabase
                .from('safety_alerts')
                .insert([{ ...newAlert, created_by: user.id }])
                .select();

            if (error) {
                console.error("Supabase Alert Insert Error:", error);
                showToast('Failed to create: ' + error.message, 'error');
            } else {
                if (data && data[0]) {
                    setAlerts([data[0], ...alerts]);
                }
                setNewAlert({ title: '', message: '', severity: 'info' });
                showToast('Alert broadcasted successfully!');
            }
        }
    };

    const handleEdit = (alert) => {
        setEditingId(alert.id);
        setNewAlert({
            title: alert.title,
            message: alert.message,
            severity: alert.severity
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setNewAlert({ title: '', message: '', severity: 'info' });
    };

    const toggleActive = async (id, currentStatus) => {
        const { error } = await supabase
            .from('safety_alerts')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) showToast('Error updating status', 'error');
        else {
            showToast(`Alert ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
            fetchAlerts();
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>← Back</button>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Safety Alerts</h1>
            </div>

            {/* Emergency Monitor Section */}
            <div style={{ marginBottom: '3rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                    <AlertTriangle size={20} /> Active Emergency Monitor
                </h2>
                <EmergencyMonitor />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* Create Form */}
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: editingId ? '2px solid #3b82f6' : '1px solid #e2e8f0', height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {editingId ? <Edit2 size={20} /> : <Plus size={20} />} {editingId ? 'Edit Alert' : 'Broadcast New Alert'}
                        </h2>
                        {editingId && (
                            <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 600 }}>Title</label>
                            <input 
                                type="text" 
                                value={newAlert.title}
                                onChange={e => setNewAlert({...newAlert, title: e.target.value})}
                                required
                                placeholder="e.g., Fire Drill in 10 mins"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 600 }}>Message</label>
                            <textarea 
                                value={newAlert.message}
                                onChange={e => setNewAlert({...newAlert, message: e.target.value})}
                                required
                                placeholder="Details..."
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '100px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 600 }}>Severity</label>
                            <select 
                                value={newAlert.severity}
                                onChange={e => setNewAlert({...newAlert, severity: e.target.value})}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="info">Info (Blue)</option>
                                <option value="warning">Warning (Yellow)</option>
                                <option value="critical">Critical (Red)</option>
                            </select>
                        </div>
                        <button type="submit" style={{ background: editingId ? '#2563eb' : '#dc2626', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' }}>
                            {editingId ? 'Update Alert' : 'Broadcast Alert'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div>
                    {/* Incoming Alerts History */}
                    <IncomingHistory />
                    
                    {/* Broadcast History */}
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', marginTop: '3rem' }}>Broadcast History</h2>
                    {loading ? <p>Loading...</p> : alerts.length === 0 ? <p style={{ color: '#94a3b8' }}>No broadcast alerts found.</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {alerts.map(alert => (
                                <div key={alert.id} style={{ 
                                    background: 'white', 
                                    padding: '1.5rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid #e2e8f0',
                                    borderLeft: `4px solid ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#ca8a04' : '#2563eb'}`,
                                    opacity: alert.is_active ? 1 : 0.6
                                }}>
                                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                       <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{alert.title}</h3>
                                       <span style={{ 
                                           padding: '4px 8px', 
                                           borderRadius: '12px', 
                                           fontSize: '0.75rem', 
                                           fontWeight: 700,
                                           background: alert.is_active ? '#dcfce7' : '#f1f5f9',
                                           color: alert.is_active ? '#16a34a' : '#64748b'
                                       }}>
                                           {alert.is_active ? 'ACTIVE' : 'INACTIVE'}
                                       </span>
                                   </div>
                                   <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.95rem' }}>{alert.message}</p>
                                   
                                   <div style={{ display: 'flex', gap: '8px' }}>
                                       <button 
                                           onClick={() => toggleActive(alert.id, alert.is_active)}
                                           style={{ 
                                               padding: '6px 12px', 
                                               borderRadius: '6px', 
                                               border: '1px solid #cbd5e1', 
                                               background: 'white', 
                                               cursor: 'pointer',
                                               fontSize: '0.85rem',
                                               color: '#334155'
                                           }}
                                       >
                                           {alert.is_active ? 'Deactivate' : 'Activate'}
                                       </button>
                                       <button 
                                           onClick={() => handleEdit(alert)}
                                           style={{ 
                                               padding: '6px 12px', 
                                               borderRadius: '6px', 
                                               border: '1px solid #cbd5e1', 
                                               background: 'white', 
                                               cursor: 'pointer',
                                               fontSize: '0.85rem',
                                               color: '#334155',
                                               display: 'flex',
                                               alignItems: 'center',
                                               gap: '4px'
                                           }}
                                       >
                                           <Edit2 size={14} /> Edit
                                       </button>
                                   </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Notification Toast */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 10000,
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    <X size={20} style={{ cursor: 'pointer' }} onClick={() => setToast(null)} />
                    <span style={{ fontWeight: 600 }}>{toast.message}</span>
                    <style>{`
                        @keyframes slideUp {
                            from { transform: translateY(100%); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};

const IncomingHistory = () => {
    const [incoming, setIncoming] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIncoming = async () => {
            const { data, error } = await supabase
                .from('alerts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10); // Last 10 alerts
            
            if (!error) setIncoming(data || []);
            setLoading(false);
        };
        fetchIncoming();
    }, []);

    return (
         <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Incoming Alert History</h2>
            {loading ? <p>Loading...</p> : incoming.length === 0 ? <p style={{ color: '#94a3b8' }}>No incoming history.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {incoming.map(alert => (
                        <div key={alert.id} style={{ 
                            background: '#f8fafc',
                            padding: '1rem', 
                            borderRadius: '8px', 
                            border: '1px solid #e2e8f0',
                            borderLeft: `4px solid ${alert.severity === 'critical' ? '#dc2626' : '#64748b'}`
                        }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                               <span style={{ fontWeight: 600, color: '#334155' }}>{alert.title}</span>
                               <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                   {new Date(alert.created_at).toLocaleString()}
                               </span>
                           </div>
                           <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{alert.message}</p>
                           <div style={{ marginTop: '0.5rem', display: 'flex', gap: '8px' }}>
                                <span style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px', 
                                    background: alert.status === 'resolved' ? '#f1f5f9' : alert.status === 'viewed' ? '#ecfdf5' : '#eff6ff',
                                    color: alert.status === 'resolved' ? '#64748b' : alert.status === 'viewed' ? '#059669' : '#2563eb',
                                    textTransform: 'uppercase',
                                    fontWeight: 700
                                }}>
                                    {alert.status}
                                </span>
                           </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
    );
};

export default AdminAlerts;
