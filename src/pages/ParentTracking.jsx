import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';

const ParentTracking = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [currentClass, setCurrentClass] = useState(null);
    const [statusData, setStatusData] = useState({ status: 'offline', lastUpdate: null });

    useEffect(() => {
        const fetchLinkedStudents = async () => {
            const user = await getCurrentUser();
            if (!user) {
                navigate('/login');
                return;
            }

            const { data: links } = await supabase
                .from('parent_student_links')
                .select('student_id')
                .eq('parent_id', user.id);

            if (links && links.length > 0) {
                const studentIds = links.map(l => l.student_id);
                const { data: studentProfiles } = await supabase
                    .from('users')
                    .select('*')
                    .in('uid', studentIds);
                
                setStudents(studentProfiles || []);
                if (studentProfiles && studentProfiles.length > 0) {
                    setSelectedStudent(studentProfiles[0]);
                }
            }
            setLoading(false);
        };

        fetchLinkedStudents();
    }, [navigate]);

    useEffect(() => {
        if (!selectedStudent) return;

        const fetchLiveStatus = async () => {
            try {
                // 1. Get Scheduled Class
                const now = new Date();
                const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
                const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

                const { data: classes } = await supabase
                    .from('timetables')
                    .select('*')
                    .eq('day_of_week', dayName)
                    .eq('department', selectedStudent.department || 'Computer Science')
                    .eq('semester', selectedStudent.semester || '1')
                    .lte('start_time', timeStr)
                    .gte('end_time', timeStr)
                    .single();

                setCurrentClass(classes);

                // 2. Get Attendance/Location Status
                const today = now.toISOString().split('T')[0];
                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('*, campus_locations(latitude, longitude, name)')
                    .eq('student_id', selectedStudent.uid)
                    .eq('date', today)
                    .eq('class_id', classes?.id || -1) // -1 if no class
                    .single();

                if (attendance) {
                    setStatusData({
                        status: 'inside', // Marked as present for current class
                        location: classes?.details || 'Classroom',
                        lastUpdate: attendance.created_at,
                        coords: attendance.campus_locations
                    });
                } else {
                    setStatusData({
                        status: classes ? 'outside' : 'no_class',
                        location: classes ? classes.details : 'On Campus',
                        lastUpdate: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error("Tracking fetch error:", err);
            }
        };

        fetchLiveStatus();
        const interval = setInterval(fetchLiveStatus, 30000);
        return () => clearInterval(interval);
    }, [selectedStudent]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tracking data...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/parent')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Live Child Tracking</h1>
            </div>

            {students.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <p style={{ color: '#64748b' }}>No linked students found. Please link a student from the dashboard first.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                    {/* Status View (Replaces Map) */}
                    <div style={{ background: 'white', borderRadius: '24px', padding: '3rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                        <div style={{ 
                            width: '120px', height: '120px', borderRadius: '50%', 
                            background: statusData.status === 'inside' ? '#f0fdf4' : statusData.status === 'no_class' ? '#f1f5f9' : '#fef2f2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem'
                        }}>
                             <div style={{ 
                                width: '24px', height: '24px', 
                                background: statusData.status === 'inside' ? '#16a34a' : statusData.status === 'no_class' ? '#94a3b8' : '#dc2626', 
                                borderRadius: '50%', animation: statusData.status !== 'no_class' ? 'pulse 2s infinite' : 'none' 
                            }}></div>
                        </div>

                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '1rem' }}>
                            {statusData.status === 'inside' ? 'Present in Class' : statusData.status === 'no_class' ? 'No Class Now' : 'Not in Class'}
                        </h2>
                        
                        <div style={{ background: '#f8fafc', padding: '1.25rem 2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem', fontWeight: 600 }}>
                                <MapPin size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                {statusData.location}
                            </p>
                        </div>

                        {statusData.status === 'inside' && (
                            <p style={{ marginTop: '2rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={18} /> Verified by class attendance
                            </p>
                        )}
                    </div>

                    {/* Right Info Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Student Tabs if multiple */}
                        {students.length > 1 && (
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {students.map(s => (
                                    <button 
                                        key={s.uid}
                                        onClick={() => setSelectedStudent(s)}
                                        style={{
                                            padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600,
                                            background: selectedStudent?.uid === s.uid ? '#4f46e5' : 'white',
                                            color: selectedStudent?.uid === s.uid ? 'white' : '#64748b',
                                            cursor: 'pointer', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {s.username}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Child Details</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>FULL NAME</label>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedStudent?.username}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>DEPARTMENT</label>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedStudent?.department} - Semester {selectedStudent?.semester}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>ID NUMBER</label>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedStudent?.id_number}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={18} color="#4f46e5" /> Current Schedule
                            </h2>
                            {currentClass ? (
                                <div>
                                    <div style={{ color: '#1e293b', fontWeight: 700, marginBottom: '4px' }}>{currentClass.class_name}</div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                        {currentClass.start_time.slice(0,5)} - {currentClass.end_time.slice(0,5)}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                                        Location: {currentClass.details}
                                    </div>
                                </div>
                            ) : (
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No active class at this time.</p>
                            )}
                        </div>

                        <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '16px', border: '1px solid #fee2e2' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 700, fontSize: '0.9rem' }}>
                                <AlertTriangle size={16} /> 24/7 Safety Support
                             </div>
                             <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#991b1b' }}>
                                Campus security is monitoring all zones. You will be notified of any emergency alerts immediately.
                             </p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ParentTracking;
