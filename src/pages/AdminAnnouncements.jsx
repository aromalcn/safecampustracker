import React, { useState, useEffect } from 'react';
import { Bell, Send, Trash2, Filter, Edit2, X } from 'lucide-react';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';

const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState('all');
    const [priority, setPriority] = useState('normal');
    const [editingId, setEditingId] = useState(null);
    const [toast, setToast] = useState(null); // { message: '', type: 'success' }

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching announcements:", error);
            } else {
                setAnnouncements(data || []);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        try {
            const user = await getCurrentUser();
            if (!user) return alert("User not found");

            const payload = {
                title,
                message,
                audience,
                priority,
                author_id: user.id
            };

            if (editingId) {
                console.log("Updating announcement:", editingId, payload);
                // When updating, we don't change the author or creation date
                const { author_id, ...updateData } = payload;
                const { data, error } = await supabase
                    .from('announcements')
                    .update(updateData)
                    .eq('id', editingId)
                    .select();
                
                if (error) {
                    console.error("Supabase Update Error:", error);
                    throw error;
                }
                
                // Update local state immediately
                if (data && data[0]) {
                    setAnnouncements(announcements.map(a => a.id === editingId ? data[0] : a));
                }
                
                showToast("Announcement updated successfully!");
                setEditingId(null);
            } else {
                console.log("Creating new announcement:", payload);
                const { data, error } = await supabase
                    .from('announcements')
                    .insert([{ ...payload, created_at: new Date() }])
                    .select();

                if (error) {
                    console.error("Supabase Insert Error:", error);
                    throw error;
                }
                
                if (data && data[0]) {
                    setAnnouncements([data[0], ...announcements]);
                }
                showToast("Announcement posted successfully!");
            }

            setTitle('');
            setMessage('');
            setAudience('all');
            setPriority('normal');
            fetchAnnouncements();
        } catch (error) {
            console.error("Error saving announcement:", error);
            showToast("Failed to save: " + error.message, 'error');
        }
    };

    const handleEdit = (ann) => {
        setEditingId(ann.id);
        setTitle(ann.title);
        setMessage(ann.message);
        setAudience(ann.audience);
        setPriority(ann.priority);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setTitle('');
        setMessage('');
        setAudience('all');
        setPriority('normal');
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchAnnouncements();
        } catch (error) {
            console.error("Error deleting announcement:", error);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Bell size={32} color="#f59e0b" /> Announcements
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
                
                {/* 1. Create Announcement */}
                <section style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', height: 'fit-content', border: editingId ? '2px solid #3b82f6' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#334155' }}>{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
                        {editingId && (
                            <button onClick={cancelEdit} style={{ background: '#f1f5f9', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    <form onSubmit={handlePostAnnouncement} style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#64748b' }}>Title</label>
                            <input 
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }}
                                placeholder="e.g., Campus Closure"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#64748b' }}>Message</label>
                            <textarea 
                                required
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '120px', resize: 'vertical', outline: 'none', fontSize: '1rem' }}
                                placeholder="Type your message here..."
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#64748b' }}>Audience</label>
                                <select 
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', outline: 'none' }}
                                >
                                    <option value="all">Everyone</option>
                                    <option value="student">Students</option>
                                    <option value="teacher">Teachers</option>
                                    <option value="parent">Parents</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#64748b' }}>Priority</label>
                                <select 
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', outline: 'none' }}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" style={{ marginTop: '1rem', background: editingId ? '#2563eb' : '#0f172a', color: 'white', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s ease' }}>
                            {editingId ? <><Send size={18} /> Update Announcement</> : <><Send size={18} /> Post Announcement</>}
                        </button>
                    </form>
                </section>

                {/* 2. History List */}
                <section>
                    <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#334155' }}>Recent Announcements</h2>
                    {loading ? (
                        <div>Loading...</div>
                    ) : announcements.length === 0 ? (
                        <div style={{ padding: '2rem', background: '#f1f5f9', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
                            No announcements yet.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {announcements.map(ann => (
                                <div key={ann.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: `4px solid ${ann.priority === 'emergency' ? '#ef4444' : ann.priority === 'high' ? '#f59e0b' : '#3b82f6'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{ann.title}</h3>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEdit(ann)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '4px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(ann.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px', borderRadius: '4px', transition: 'background 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#cbd5e1'; }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <p style={{ margin: '0 0 12px 0', color: '#64748b', lineHeight: '1.5' }}>{ann.message}</p>
                                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#94a3b8' }}>
                                        <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>To: {ann.audience.toUpperCase()}</span>
                                        <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{new Date(ann.created_at).toLocaleDateString()}</span>
                                        {ann.priority !== 'normal' && (
                                            <span style={{ background: ann.priority === 'emergency' ? '#fee2e2' : '#fef3c7', color: ann.priority === 'emergency' ? '#991b1b' : '#92400e', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                                {ann.priority.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

            </div>

            {/* Success Toast */}
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

export default AdminAnnouncements;
