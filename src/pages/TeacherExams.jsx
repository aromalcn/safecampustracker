
import React, { useEffect, useState } from 'react';
import { Calendar, Plus, Clock, MapPin, Trash2, Edit2, Search, FileText } from 'lucide-react';
import { supabase } from '../supabase-config';
import CustomDropdown from '../components/CustomDropdown';
import { getCurrentUser } from '../services/auth-service';
import AlertBanner from '../components/AlertBanner';

const TeacherExams = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        exam_date: '',
        start_time: '',
        end_time: '',
        department: 'Computer Science', // Default
        semester: '1',
        room: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    const [currentUser, setCurrentUser] = useState(null);

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');

    const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology'];
    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        fetchUserAndExams();
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const { data, error } = await supabase
                .from('campus_locations')
                .select('name')
                .order('name');
            if (error) throw error;
            setRooms(data || []);
        } catch (error) {
            console.error("Error fetching rooms:", error);
        }
    };

    const fetchUserAndExams = async () => {
        const user = await getCurrentUser();
        setCurrentUser(user);
        fetchExams();
    };

    const fetchExams = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('exam_schedules')
                .select('*')
                .order('exam_date', { ascending: true });

            if (error) throw error;
            setExams(data || []);
        } catch (error) {
            console.error("Error fetching exams:", error);
            setFeedback({ message: 'Failed to load exams', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFeedback({ message: '', type: '' });

        try {
            if (!currentUser) throw new Error("You must be logged in.");

            const payload = {
                ...formData,
                semester: parseInt(formData.semester),
                created_by: currentUser.id
            };

            if (editingId) {
                const { error } = await supabase
                    .from('exam_schedules')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
                setFeedback({ message: 'Exam updated successfully!', type: 'success' });
            } else {
                const { error } = await supabase
                    .from('exam_schedules')
                    .insert([payload]);
                if (error) throw error;
                setFeedback({ message: 'Exam scheduled successfully!', type: 'success' });
            }

            setShowForm(false);
            setEditingId(null);
            resetForm();
            fetchExams();

        } catch (error) {
            console.error("Error saving exam:", error);
            setFeedback({ message: error.message || 'Failed to save exam', type: 'error' });
        }
    };

    const resetForm = () => {
        setFormData({
            subject: '',
            exam_date: '',
            start_time: '',
            end_time: '',
            department: 'Computer Science',
            semester: '1',
            room: ''
        });
    };

    const handleEdit = (exam) => {
        setEditingId(exam.id);
        setFormData({
            subject: exam.subject,
            exam_date: exam.exam_date,
            start_time: exam.start_time,
            end_time: exam.end_time,
            department: exam.department,
            semester: String(exam.semester),
            room: exam.room || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this exam?")) return;
        
        try {
            const { error } = await supabase
                .from('exam_schedules')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setFeedback({ message: 'Exam cancelled.', type: 'success' });
            fetchExams();
        } catch (error) {
            console.error("Error deleting exam:", error);
            setFeedback({ message: 'Failed to delete exam', type: 'error' });
        }
    };

    const filteredExams = exams.filter(exam => 
        exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Exam Schedules</h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Manage upcoming exams and assessments.</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        resetForm();
                        setShowForm(true);
                    }}
                    style={{ 
                        background: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', 
                        borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)'
                    }}
                >
                    <Plus size={20} /> Schedule Exam
                </button>
            </div>

            {feedback.message && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <AlertBanner message={feedback.message} type={feedback.type} onClose={() => setFeedback({ message: '', type: '' })} />
                </div>
            )}

            {/* Search/Filter Bar */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Search by subject or department..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                </div>
            </div>

            {loading ? (
                <p>Loading exams...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {filteredExams.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>No exams scheduled yet.</p>
                        </div>
                    ) : (
                        filteredExams.map(exam => (
                            <div key={exam.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                                        {exam.department} • Sem {exam.semester}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleEdit(exam)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(exam.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#1e293b' }}>{exam.subject}</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#475569', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={16} />
                                        <span>{new Date(exam.exam_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={16} />
                                        <span>{exam.start_time.slice(0, 5)} - {exam.end_time.slice(0, 5)}</span>
                                    </div>
                                    {exam.room && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <MapPin size={16} />
                                            <span>{exam.room}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal Form */}
            {showForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Exam' : 'Schedule New Exam'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Subject</label>
                                <input required type="text" name="subject" value={formData.subject} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Department</label>
                                    <CustomDropdown 
                                        options={departments.map(d => ({ value: d, label: d }))}
                                        value={formData.department}
                                        onChange={(val) => setFormData({ ...formData, department: val })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Semester</label>
                                    <CustomDropdown 
                                        options={Array.from({length: 8}, (_, i) => ({ value: String(i + 1), label: `Sem ${i + 1}` }))}
                                        value={formData.semester}
                                        onChange={(val) => setFormData({ ...formData, semester: val })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Exam Date</label>
                                <input required type="date" name="exam_date" value={formData.exam_date} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Start Time</label>
                                    <input required type="time" name="start_time" value={formData.start_time} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>End Time</label>
                                    <input required type="time" name="end_time" value={formData.end_time} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Room / Venue</label>
                                <CustomDropdown
                                    options={rooms.map(r => ({ value: r.name, label: r.name }))}
                                    value={formData.room}
                                    onChange={(val) => setFormData({ ...formData, room: val })}
                                    placeholder="Select Room"
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                                <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Save Exam</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherExams;
