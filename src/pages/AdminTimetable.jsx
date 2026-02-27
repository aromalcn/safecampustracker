import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Calendar, Clock, User, BookOpen, Lock, MapPin, Filter, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth-service';
import CustomDropdown from '../components/CustomDropdown';
import { supabase } from '../supabase-config';

const AdminTimetable = () => {
    const navigate = useNavigate();
    const [departments] = useState(['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology']);
    const [selectedDept, setSelectedDept] = useState('Computer Science');
    const [selectedSemester, setSelectedSemester] = useState('1'); // Default Semester 1
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [filterDay, setFilterDay] = useState('Monday');
    // const [filterTeacher, setFilterTeacher] = useState('All Teachers');

    // Teachers State
    const [teachers, setTeachers] = useState([]);
    
    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        day_of_week: 'Monday',
        start_time: '',
        end_time: '',
        class_name: '',
        teacher_name: '',
        details: '',
        semester: '1'
    });

    // const [userDept, setUserDept] = useState(null); // Removed department locking for admin

    const [customLocationMode, setCustomLocationMode] = useState(false);

    // Location State
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        fetchLocations();
    }, []);
    
    const fetchLocations = async () => {
        try {
            const { data, error } = await supabase
                .from('campus_locations')
                .select('*')
                .order('name');
            if (error) throw error;
            setLocations(data || []);
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    };

    // Removed the useEffect that fetches user profile and locks department

    useEffect(() => {
        fetchTimetable();
        fetchTeachers();
    }, [selectedDept, selectedSemester]);

    useEffect(() => {
        fetchTimetable();
        fetchTeachers();
    }, [selectedDept, selectedSemester]);

    const fetchTeachers = async () => {
        try {
            // Map full department names to common shortcodes
            let searchTerms = [selectedDept];
            if (selectedDept === 'Computer Science') searchTerms.push('CSE', 'CS');
            else if (selectedDept === 'Electronics') searchTerms.push('ECE', 'Electronics and Communication');
            else if (selectedDept === 'Mechanical') searchTerms.push('ME', 'Mech');
            else if (selectedDept === 'Civil') searchTerms.push('CE', 'Civil Engineering');
            else if (selectedDept === 'Information Technology') searchTerms.push('IT');

            // Construct OR query: department.ilike.%Term1%,department.ilike.%Term2%,...
            const orQuery = searchTerms.map(term => `department.ilike.%${term}%`).join(',');

            const { data, error } = await supabase
                .from('users')
                .select('username, uid, department, role') 
                .eq('role', 'teacher')
                .or(orQuery);

            if (error) throw error;
            
            setTeachers(data || []);

        } catch (error) {
            console.error("Error fetching teachers:", error);
            setTeachers([]); // Set empty array on error
        }
    };

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('timetables')
                .select('*')
                .eq('department', selectedDept)
                .eq('semester', parseInt(selectedSemester)) // Filter by semester
                .order('start_time');

            if (error) throw error;
            setTimetable(data || []);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            day_of_week: item.day_of_week,
            start_time: item.start_time,
            end_time: item.end_time,
            class_name: item.class_name,
            teacher_name: item.teacher_name,
            details: item.details || '',
            semester: String(item.semester)
        });
        setCustomLocationMode(false); 
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Include semester in payload
            const payload = { 
                ...formData, 
                department: selectedDept,
                semester: parseInt(formData.semester) 
            };
            
            if (editingId) {
                const { error } = await supabase
                    .from('timetables')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('timetables')
                    .insert([payload]);
                if (error) throw error;
            }

            setShowForm(false);
            setEditingId(null);
            setFormData({
                day_of_week: 'Monday',
                start_time: '',
                end_time: '',
                class_name: '',
                teacher_name: '',
                details: '',
                semester: selectedSemester // Reset to current selected view
            });
            fetchTimetable();
        } catch (error) {
            console.error("Error submitting form:", error);
            alert('Failed to save entry: ' + error.message);
        }
    };

    const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, id: null });

    const handleDelete = (id) => {
        setDeleteConfirmation({ show: true, id });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation.id) return;
        
        try {
            const { error } = await supabase
                .from('timetables')
                .delete()
                .eq('id', deleteConfirmation.id);
            
            if (error) throw error;
            fetchTimetable();
            setDeleteConfirmation({ show: false, id: null });
        } catch (error) {
            console.error("Error deleting:", error);
            alert('Failed to delete entry: ' + error.message);
        }
    };

    // Group by Day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const groupedTimetable = days.reduce((acc, day) => {
        acc[day] = timetable.filter(t => t.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
        return acc;
    }, {});

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'var(--font-family)' }}>
            <style>{`
                @media (max-width: 768px) {
                    .mobile-stack {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        width: 100% !important;
                    }
                    .mobile-full-width-btn {
                        width: 100% !important;
                        margin-top: 1rem;
                    }
                }
            `}</style>
            
            <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                    <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '1rem', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Timetable Management</h1>
                </div>

                {loading && <p>Loading timetable...</p>}
                
                {/* Controls & Day Tabs */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
                     {/* Top Row: Department & Add Button */}
                    <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="mobile-stack" style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Department</label>
                                <CustomDropdown
                                    options={departments.map(d => ({ value: d, label: d }))}
                                    value={selectedDept}
                                    onChange={(val) => setSelectedDept(val)}
                                    placeholder="Select Department"
                                />
                            </div>
                            
                            <div style={{ width: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Semester</label>
                                <CustomDropdown
                                    options={Array.from({length: 10}, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }))}
                                    value={selectedSemester}
                                    onChange={(val) => setSelectedSemester(val)}
                                    placeholder="Select Sem"
                                />
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setEditingId(null);
                                setFormData({
                                    day_of_week: 'Monday',
                                    start_time: '',
                                    end_time: '',
                                    class_name: '',
                                    teacher_name: '',
                                    details: '',
                                    semester: selectedSemester
                                });
                                setCustomLocationMode(false);
                                setShowForm(true);
                            }}
                            className="mobile-full-width-btn"
                            style={{ 
                                background: '#0f172a', color: 'white', border: 'none', padding: '12px 24px', 
                                borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                transition: 'transform 0.1s',
                                boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <Plus size={18} /> Add Class
                        </button>
                    </div>

                    {/* Day Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px', borderBottom: '2px solid #f1f5f9' }}>
                        {days.map(day => {
                            const isActive = filterDay === day; // We reuse filterDay state as activeDay
                            return (
                                <button
                                    key={day}
                                    onClick={() => setFilterDay(day)}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                                        color: isActive ? '#2563eb' : '#64748b',
                                        fontWeight: isActive ? 700 : 500,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        marginBottom: '-2px', // Align with border
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Single Day View */}
                <div>
                     {/* We reuse the loop strictly for the active day */}
                    {days
                        .filter(day => day === filterDay) 
                        .map(day => {
                            const daysClasses = groupedTimetable[day] || [];
                            return (
                                <div key={day} style={{ animation: 'fadeIn 0.3s ease' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{day}'s Schedule</h3>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                                            {selectedDept} - Semester {selectedSemester} • {daysClasses.length} Classes
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                        {daysClasses.length === 0 ? (
                                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                                <Calendar size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                                <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>No classes scheduled for {day}</p>
                                                <button 
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, semester: selectedSemester }));
                                                        setCustomLocationMode(false);
                                                        setShowForm(true);
                                                    }}
                                                    style={{ marginTop: '1rem', color: '#2563eb', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    Add a class now
                                                </button>
                                            </div>
                                        ) : (
                                            daysClasses.map((item) => (
                                                <div key={item.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
                                                     onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                                                     onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0,0,0,0.05)'; }}
                                                >
                                                    <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => handleEdit(item)}
                                                            className="edit-btn"
                                                            style={{ background: '#eff6ff', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Edit Class"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(item.id)}
                                                            className="delete-btn"
                                                            style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Delete Class"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>
                                                        <Clock size={14} />
                                                        {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                                                    </div>
                                                    
                                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>{item.class_name}</h4>
                                                    
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#475569' }}>
                                                            <User size={16} color="#94a3b8" /> 
                                                            <span style={{ fontWeight: 500 }}>{item.teacher_name}</span>
                                                        </div>
                                                        {item.details && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#475569' }}>
                                                                <MapPin size={16} color="#94a3b8" />
                                                                <span>{item.details}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>

                {/* Add Entry Modal */}
                {showForm && (
                     <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', color: '#1e293b' }}>{editingId ? 'Edit Entry' : 'Add Timetable Entry'}</h2>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                
                                {/* Semester Select in Form */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Semester</label>
                                    <CustomDropdown
                                        options={Array.from({length: 10}, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }))}
                                        value={formData.semester}
                                        onChange={(val) => setFormData({ ...formData, semester: val })}
                                        placeholder="Select Semester"
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Day</label>
                                    <CustomDropdown
                                        options={days.map(d => ({ value: d, label: d }))}
                                        value={formData.day_of_week}
                                        onChange={(val) => setFormData({ ...formData, day_of_week: val })}
                                        placeholder="Select Day"
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Start Time</label>
                                        <input 
                                            type="time" 
                                            name="start_time" 
                                            required 
                                            value={formData.start_time} 
                                            onChange={handleInputChange} 
                                            style={{ 
                                                width: '100%', 
                                                padding: '14px', 
                                                borderRadius: '8px', 
                                                border: '1px solid #e2e8f0',
                                                fontSize: '1rem',
                                                fontFamily: 'inherit'
                                            }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>End Time</label>
                                        <input 
                                            type="time" 
                                            name="end_time" 
                                            required 
                                            value={formData.end_time} 
                                            onChange={handleInputChange} 
                                            style={{ 
                                                width: '100%', 
                                                padding: '14px', 
                                                borderRadius: '8px', 
                                                border: '1px solid #e2e8f0',
                                                fontSize: '1rem',
                                                fontFamily: 'inherit'
                                            }} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Class / Subject</label>
                                    <input 
                                        type="text" 
                                        name="class_name" 
                                        required 
                                        value={formData.class_name} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. Data Structures" 
                                        style={{ 
                                            width: '100%', 
                                            padding: '14px', 
                                            borderRadius: '8px', 
                                            border: '1px solid #e2e8f0',
                                            fontSize: '1rem',
                                            fontFamily: 'inherit'
                                        }} 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Teacher</label>
                                    <CustomDropdown
                                         options={teachers.map(t => ({ value: t.username, label: t.username }))}
                                         value={formData.teacher_name}
                                         onChange={(val) => setFormData({ ...formData, teacher_name: val })}
                                         placeholder="Select Teacher"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Details / Room</label>
                                    {customLocationMode ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input 
                                                type="text" 
                                                name="details"
                                                value={formData.details}
                                                onChange={handleInputChange}
                                                placeholder="Enter custom room details"
                                                style={{ 
                                                    width: '100%', 
                                                    padding: '14px', 
                                                    borderRadius: '8px', 
                                                    border: '1px solid #e2e8f0',
                                                    fontSize: '1rem',
                                                    fontFamily: 'inherit'
                                                }} 
                                                autoFocus
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    setCustomLocationMode(false);
                                                    setFormData({ ...formData, details: '' });
                                                }}
                                                style={{ 
                                                    background: '#fee2e2', 
                                                    color: '#ef4444', 
                                                    border: 'none', 
                                                    borderRadius: '8px', 
                                                    padding: '0 16px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <CustomDropdown
                                            options={[
                                                ...locations.map(l => ({ value: l.name, label: `${l.name} (${l.location_details || 'No details'})` })),
                                                { value: 'Other', label: 'Other / Custom' } 
                                            ]}
                                            value={locations.some(l => l.name === formData.details) ? formData.details : ''}
                                            onChange={(val) => {
                                                if (val === 'Other') {
                                                    setCustomLocationMode(true);
                                                    setFormData({ ...formData, details: '' }); 
                                                } else {
                                                    setFormData({ ...formData, details: val });
                                                }
                                            }}
                                            placeholder="Select Room"
                                        />
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Save Entry</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirmation.show && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', animation: 'popIn 0.2s ease-out' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                <Trash2 size={32} />
                            </div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#1e293b', fontWeight: 800 }}>Delete Entry?</h3>
                            <p style={{ margin: '0 0 2rem 0', color: '#64748b', lineHeight: 1.5 }}>
                                Are you sure you want to remove this class from the timetable? This action cannot be undone.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button 
                                    onClick={() => setDeleteConfirmation({ show: false, id: null })}
                                    style={{ background: 'white', border: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    style={{ background: '#ef4444', border: 'none', color: 'white', fontWeight: 600, padding: '12px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(239, 68, 68, 0.4)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(239, 68, 68, 0.3)'; }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Location Manager Modal removed - functionality moved to AdminLocations page */}
            </main>
        </div>
    );
};

export default AdminTimetable;
