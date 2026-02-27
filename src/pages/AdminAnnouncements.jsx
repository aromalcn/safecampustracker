import React, { useState, useEffect } from 'react';
import { Bell, Send, Trash2, Filter } from 'lucide-react';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';

const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState('all');
    const [priority, setPriority] = useState('normal');

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

            const { error } = await supabase
                .from('announcements')
                .insert([{
                    title,
                    message,
                    audience,
                    priority,
                    created_at: new Date(),
                    author_id: user.id
                }]);

            if (error) throw error;

            alert("Announcement posted successfully!");
            setTitle('');
            setMessage('');
            fetchAnnouncements();
        } catch (error) {
            console.error("Error posting announcement:", error);
            alert("Failed to post announcement: " + error.message);
        }
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
                <section style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', height: 'fit-content' }}>
                    <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#334155' }}>New Announcement</h2>
                    <form onSubmit={handlePostAnnouncement} style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#64748b' }}>Title</label>
                            <input 
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                placeholder="e.g., Campus Closure"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#64748b' }}>Message</label>
                            <textarea 
                                required
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '100px', resize: 'vertical' }}
                                placeholder="Type your message here..."
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#64748b' }}>Audience</label>
                                <select 
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
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
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" style={{ marginTop: '1rem', background: '#0f172a', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Send size={18} /> Post Announcement
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
                                        <button onClick={() => handleDelete(ann.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}>
                                            <Trash2 size={18} />
                                        </button>
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
        </div>
    );
};

export default AdminAnnouncements;
