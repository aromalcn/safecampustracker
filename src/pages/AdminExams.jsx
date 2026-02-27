
import React, { useEffect, useState } from 'react';
import { Calendar, Plus, Clock, MapPin, Trash2, Edit2, Search, FileText, Printer, ChevronRight, TrendingUp, Users as UsersIcon, Clock8 } from 'lucide-react';
import { supabase } from '../supabase-config';
import CustomDropdown from '../components/CustomDropdown';
import { getCurrentUser } from '../services/auth-service';
import AlertBanner from '../components/AlertBanner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './AdminExams.css';

const AdminExams = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, past
    const [formData, setFormData] = useState({
        subject: '',
        exam_date: '',
        start_time: '',
        end_time: '',
        department: 'Computer Science',
        semester: '1',
        room: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    const [currentUser, setCurrentUser] = useState(null);
    const [rooms, setRooms] = useState([]);
    
    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');

    const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology'];

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
        setSubmitting(true);

        try {
            console.log("Submitting form with data:", formData);
            if (!currentUser) {
                console.error("No current user found");
                throw new Error("You must be logged in.");
            }

            const payload = {
                subject: formData.subject,
                exam_date: formData.exam_date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                department: formData.department,
                semester: parseInt(formData.semester),
                room: formData.room,
                created_by: currentUser.id
            };

            console.log("Payload being sent to database:", payload);

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
                if (error) {
                    console.error("Supabase insert error:", error);
                    throw error;
                }
                console.log("Insert successful");
                setFeedback({ message: 'Exam scheduled successfully!', type: 'success' });
            }

            // Small delay for the user to see success message before closing, 
            // OR just close it if you prefer. User said "does nothing", so feedback is key.
            setTimeout(() => {
                setShowForm(false);
                setEditingId(null);
                resetForm();
                fetchExams();
            }, 1000);

        } catch (error) {
            console.error("Error saving exam:", error);
            setFeedback({ message: error.message || 'Failed to save exam. Check console for details.', type: 'error' });
        } finally {
            setSubmitting(false);
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
        if (!window.confirm("Are you sure you want to delete this exam?")) return;
        
        try {
            const { error } = await supabase
                .from('exam_schedules')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setFeedback({ message: 'Exam deleted.', type: 'success' });
            fetchExams();
        } catch (error) {
            console.error("Error deleting exam:", error);
            setFeedback({ message: 'Failed to delete exam', type: 'error' });
        }
    };

    const getExamStatus = (date, startTime, endTime) => {
        const now = new Date();
        const examDate = new Date(date);
        
        // Match just the date part for simplicity
        const todayStr = now.toISOString().split('T')[0];
        const examDateStr = date;

        if (examDateStr < todayStr) return 'completed';
        if (examDateStr === todayStr) {
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            
            const start = new Date(now); start.setHours(startH, startM, 0);
            const end = new Date(now); end.setHours(endH, endM, 0);
            
            if (now >= start && now <= end) return 'ongoing';
            if (now > end) return 'completed';
        }
        return 'upcoming';
    };

    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All' || exam.department === filterDept;
        
        const status = getExamStatus(exam.exam_date, exam.start_time, exam.end_time);
        const matchesTab = activeTab === 'upcoming' ? (status === 'upcoming' || status === 'ongoing') : status === 'completed';
        
        return matchesSearch && matchesDept && matchesTab;
    });

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Campus Exam Schedule', 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        autoTable(doc, {
            startY: 40,
            head: [['Date', 'Subject', 'Time', 'Dept', 'Sem', 'Room']],
            body: filteredExams.map(ex => [
                ex.exam_date,
                ex.subject,
                `${ex.start_time.slice(0, 5)} - ${ex.end_time.slice(0, 5)}`,
                ex.department,
                ex.semester,
                ex.room || '-'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.save(`Exam_Schedule_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Stats calculation
    const totalExams = exams.length;
    const upcomingCount = exams.filter(ex => getExamStatus(ex.exam_date, ex.start_time, ex.end_time) !== 'completed').length;
    const departmentsCovered = new Set(exams.map(ex => ex.department)).size;

    return (
        <div className="admin-exams-container" style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            {/* Premium Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
                        Exam Management
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '6px' }}>
                        Strategic planning and oversight of all campus examinations.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={exportToPDF} style={{ background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', padding: '12px 20px', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Printer size={18} /> Export
                    </button>
                    <button onClick={() => { setEditingId(null); resetForm(); setShowForm(true); }} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.4)' }}>
                        <Plus size={20} /> Schedule New Exam
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="stats-card">
                    <div style={{ background: '#eff6ff', color: '#2563eb', padding: '12px', borderRadius: '12px' }}><FileText size={24} /></div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Total Exams</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{totalExams}</div>
                    </div>
                </div>
                <div className="stats-card">
                    <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px', borderRadius: '12px' }}><TrendingUp size={24} /></div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Upcoming / Active</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{upcomingCount}</div>
                    </div>
                </div>
                <div className="stats-card">
                    <div style={{ background: '#faf5ff', color: '#9333ea', padding: '12px', borderRadius: '12px' }}><UsersIcon size={24} /></div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Depts Involved</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{departmentsCovered}</div>
                    </div>
                </div>
                <div className="stats-card">
                    <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '12px' }}><Clock8 size={24} /></div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>System Status</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Live & Syncing</div>
                    </div>
                </div>
            </div>

            {feedback.message && (
                <div style={{ marginBottom: '2rem' }}>
                    <AlertBanner message={feedback.message} type={feedback.type} onClose={() => setFeedback({ message: '', type: '' })} />
                </div>
            )}

            {/* Filter Hub */}
            <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '2rem' }}>
                    <button onClick={() => setActiveTab('upcoming')} className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}>Upcoming & Ongoing</button>
                    <button onClick={() => setActiveTab('past')} className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}>Past Examinations</button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Find by subject or exam title..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '14px', border: '1px solid #e2e8f0', outline: 'none', background: 'white', fontSize: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                        />
                    </div>
                    <div style={{ width: '250px' }}>
                        <CustomDropdown 
                            options={[{ value: 'All', label: 'All Departments' }, ...departments.map(d => ({ value: d, label: d }))]}
                            value={filterDept}
                            onChange={(val) => setFilterDept(val)}
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ color: '#64748b', fontWeight: 500 }}>Synchronizing exam database...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                    {filteredExams.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', background: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                            <Calendar size={64} style={{ marginBottom: '1.5rem', opacity: 0.1, color: '#0f172a' }} />
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>Clear Schedules</h3>
                            <p style={{ color: '#64748b', margin: '8px 0 0 0' }}>No examinations found matching your current filters.</p>
                        </div>
                    ) : (
                        filteredExams.map(exam => {
                            const status = getExamStatus(exam.exam_date, exam.start_time, exam.end_time);
                            return (
                                <div key={exam.id} className="exam-card" style={{ background: 'white', borderRadius: '20px', padding: '1.75rem', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span className={`status-badge status-${status}`}>{status}</span>
                                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>•</span>
                                            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Sem {exam.semester}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => handleEdit(exam)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><Edit2 size={18} /></button>
                                            <button onClick={() => handleDelete(exam.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    
                                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{exam.subject}</h3>
                                    
                                    <div style={{ display: 'grid', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}><Calendar size={18} color="#0f172a" /></div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Date</div>
                                                <div style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>
                                                    {new Date(exam.exam_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}><Clock size={18} color="#0f172a" /></div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Schedule</div>
                                                <div style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>{exam.start_time.slice(0, 5)} — {exam.end_time.slice(0, 5)}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}><MapPin size={18} color="#0f172a" /></div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Venue</div>
                                                <div style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>{exam.room || 'Location Pending'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '10px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{exam.department}</span>
                                        <ChevronRight size={16} color="#cbd5e1" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modal Form */}
            {showForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{editingId ? 'Edit Examination' : 'Schedule New Exam'}</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>Close</button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {feedback.message && (
                                <div style={{ 
                                    padding: '12px', 
                                    borderRadius: '12px', 
                                    background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                    color: feedback.type === 'success' ? '#16a34a' : '#dc2626',
                                    border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                                    fontSize: '0.9rem',
                                    fontWeight: 600
                                }}>
                                    {feedback.message}
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', fontWeight: 700, color: '#334155' }}>Subject Title</label>
                                <input required type="text" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="e.g. Advanced Mathematics II" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1rem' }} />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', fontWeight: 700, color: '#334155' }}>Department</label>
                                    <CustomDropdown 
                                        options={departments.map(d => ({ value: d, label: d }))}
                                        value={formData.department}
                                        onChange={(val) => setFormData({ ...formData, department: val })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', fontWeight: 700, color: '#334155' }}>Academic Semester</label>
                                    <CustomDropdown 
                                        options={Array.from({length: 8}, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }))}
                                        value={formData.semester}
                                        onChange={(val) => setFormData({ ...formData, semester: val })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', fontWeight: 700, color: '#334155' }}>Examination Date</label>
                                <input required type="date" name="exam_date" value={formData.exam_date} onChange={handleInputChange} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1rem' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', fontWeight: 700, color: '#334155' }}>Official Start Time</label>
                                    <input required type="time" name="start_time" value={formData.start_time} onChange={handleInputChange} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', fontWeight: 700, color: '#334155' }}>Scheduled End Time</label>
                                    <input required type="time" name="end_time" value={formData.end_time} onChange={handleInputChange} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1rem' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', fontWeight: 700, color: '#334155' }}>Designated Room / Venue</label>
                                <CustomDropdown
                                    options={rooms.map(r => ({ value: r.name, label: r.name }))}
                                    value={formData.room}
                                    onChange={(val) => setFormData({ ...formData, room: val })}
                                    placeholder="Assign Classroom"
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} disabled={submitting} style={{ background: '#f8fafc', color: '#64748b', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={submitting} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '12px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.4)', opacity: submitting ? 0.7 : 1 }}>
                                    {submitting ? 'Processing...' : (editingId ? 'Update Schedule' : 'Confirm Schedule')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AdminExams;
