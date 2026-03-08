import React, { useEffect, useState } from 'react';
import CustomDropdown from '../components/CustomDropdown';
import { Users, AlertTriangle, MessageSquare, LogOut, CheckCircle, Smartphone, Printer, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import AlertBanner from '../components/AlertBanner'; // [NEW]

const ParentDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [stats, setStats] = useState({ present: false, location: 'Unknown', alerts: 0 });
    const [loading, setLoading] = useState(true);
    const [activeSafetyAlert, setActiveSafetyAlert] = useState(null); // Safety alerts

    // Linking Logic State
    const [linkInput, setLinkInput] = useState('');
    const [linking, setLinking] = useState(false);
    const [linkError, setLinkError] = useState('');

    const fetchLinkedStudents = async (userId) => {
        const { data: links } = await supabase
            .from('parent_student_links')
            .select('student_id')
            .eq('parent_id', userId);

        if (links && links.length > 0) {
            const studentIds = links.map(l => l.student_id);
            const { data: studentProfiles } = await supabase
                .from('users')
                .select('*')
                .in('uid', studentIds);
            
            setStudents(studentProfiles || []);
            if (studentProfiles && studentProfiles.length > 0) {
                // If not already selected or logic change
                if (!selectedStudent) setSelectedStudent(studentProfiles[0]);
            }
        }
    };

    useEffect(() => {
        const init = async () => {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                navigate('/login');
                return;
            }

            try {
                // Fetch real profile
                const { data: profile } = await supabase
                    .from('users')
                    .select('username')
                    .eq('uid', currentUser.id)
                    .single();
                    
                if (profile) {
                    currentUser.user_metadata = { ...currentUser.user_metadata, ...profile };
                }
                setUser(currentUser);

                // Fetch linked students
                await fetchLinkedStudents(currentUser.id);
            } catch (err) {
                console.error("Failed to fetch parent data", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [navigate]);

    // Safety Alerts Subscription
    useEffect(() => {
        // Fetch initial active safety alerts
        const fetchSafetyAlert = async () => {
            const { data } = await supabase
                .from('safety_alerts')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data) setActiveSafetyAlert(data);
        };
        fetchSafetyAlert();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('parent_safety_alerts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_alerts' }, payload => {
                if (payload.new && payload.new.is_active) {
                    setActiveSafetyAlert(payload.new);
                } else if (payload.new && !payload.new.is_active) {
                    setActiveSafetyAlert(current => 
                        (current && current.id === payload.new.id) ? null : current
                    );
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []); // Removed [activeSafetyAlert] to stop infinite loop

    const handleLinkStudent = async () => {
        if (!linkInput.trim()) return;
        setLinking(true);
        setLinkError('');

        try {
            const { data, error } = await supabase
                .rpc('link_parent_to_student', { child_id_text: linkInput.trim() });

            if (error) throw error;

            if (data.success) {
                // Refresh list
                await fetchLinkedStudents(user.id);
                setLinkInput('');
            } else {
                setLinkError(data.message || 'Failed to link student.');
            }
        } catch (err) {
            console.error(err);
            setLinkError(err.message || 'An error occurred.');
        } finally {
            setLinking(false);
        }
    };

    const fetchStudentData = async () => {
        if (!selectedStudent) return;
        // Fetch today's attendance
        const today = new Date().toISOString().split('T')[0];
        const { data: attendance } = await supabase
            .from('attendance')
            .select('status')
            .eq('student_id', selectedStudent.uid)
            .eq('date', today)
            .single();

        // 2. Fetch active broadcast alerts
        const { count: safetyCount } = await supabase
            .from('safety_alerts')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        
        // 3. Fetch active SOS alerts specifically for this student
        const { count: emergencyCount } = await supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', selectedStudent.uid)
            .in('status', ['new', 'viewed']);
        
        const status = attendance?.status;
        let location = 'No Status';
        if (status === 'present' || status === 'late') {
            location = 'On Campus';
        } else if (status === 'absent') {
            location = 'Off Campus';
        }

        setStats({
            present: status === 'present' || status === 'late',
            location: location,
            alerts: (safetyCount || 0) + (emergencyCount || 0)
        });
    };

    useEffect(() => {
        fetchStudentData();

        if (!selectedStudent) return;

        // Attendance Subscription for this student
        const subscription = supabase
            .channel(`parent_attendance_${selectedStudent.uid}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${selectedStudent.uid}` }, 
                () => {
                    console.log('Student attendance updated, refreshing parent view...');
                    fetchStudentData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [selectedStudent]);

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f5f7fa', fontFamily: 'var(--font-family)' }}>
            {/* Navigation handled by ParentLayout */}
            
            {/* Campus-Wide Safety Alerts */}
            {activeSafetyAlert && (
                <div style={{
                    background: activeSafetyAlert.severity === 'critical' ? '#ef4444' : activeSafetyAlert.severity === 'warning' ? '#eab308' : '#3b82f6',
                    color: 'white',
                    padding: '1rem',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    animation: 'slideDown 0.3s ease-out',
                    zIndex: 1000
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', maxWidth: '1000px', margin: '0 auto' }}>
                        <AlertCircle size={24} />
                        <div>
                            <span style={{ textTransform: 'uppercase', marginRight: '8px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                {activeSafetyAlert.severity}
                            </span>
                            {activeSafetyAlert.title}: {activeSafetyAlert.message}
                        </div>
                    </div>
                </div>
            )}
            
            <AlertBanner linkedStudentIds={students.map(s => s.uid)} /> {/* [NEW] Filtered High Visibility Alert Banner */}

            <main style={{ padding: 'var(--spacing-lg)', maxWidth: '1200px', margin: '0 auto' }}>
                <header className="page-header" style={{ marginBottom: '2.5rem' }}>
                    <h2 className="page-title">Welcome, {user?.user_metadata?.username || 'Parent'}</h2>
                    <p className="page-subtitle">Tracking updates for your ward.</p>
                </header>

                {loading ? (
                    <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>Loading data...</div>
                ) : students.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ background: 'var(--primary-light)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <Smartphone size={32} color="var(--primary-color)" />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>Link Your Child</h3>
                        <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto 2rem' }}>
                            Enter your child's <b>Student ID</b> (Roll Number) below to start tracking their status.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
                            <input 
                                type="text" 
                                className="full-width-mobile"
                                placeholder="Student ID (e.g. CS21B1024)"
                                value={linkInput}
                                onChange={(e) => setLinkInput(e.target.value)}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    background: 'white'
                                }}
                            />
                            <button 
                                className="full-width-mobile"
                                onClick={handleLinkStudent}
                                disabled={linking}
                                style={{
                                    padding: '12px',
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    opacity: linking ? 0.7 : 1
                                }}
                            >
                                {linking ? 'Verifying...' : 'Link Student'}
                            </button>
                            {linkError && <p style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '0.5rem' }}>{linkError}</p>}
                        </div>
                    </div>
                ) : (
                    <>
                        <style>{`
                            @media (max-width: 768px) {
                                .mobile-grid {
                                    grid-template-columns: 1fr !important;
                                }
                                .mobile-stack {
                                    flex-direction: column !important;
                                }
                                .mobile-scroll-table {
                                    overflow-x: auto;
                                }
                                .mobile-filter-stack {
                                    grid-template-columns: 1fr 1fr !important;
                                }
                            }
                            @media (max-width: 480px) {
                                .mobile-filter-stack {
                                    grid-template-columns: 1fr !important;
                                }
                            }
                        `}</style>

                        {/* Layout Container */}
                        <div className="flex-col-mobile" style={{ display: 'flex', gap: '2rem', alignItems: 'start' }}>
                            
                            {/* Left Column: Student Detail & Stats */}
                            <div className="full-width-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: '0 0 350px' }}>
                                {/* Student Selector if multiple */}
                                {students.length > 1 && (
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {students.map(s => (
                                            <button 
                                                key={s.uid}
                                                className="full-width-mobile"
                                                onClick={() => setSelectedStudent(s)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    borderRadius: '12px',
                                                    border: '1px solid #d1d5db',
                                                    background: selectedStudent?.uid === s.uid ? 'var(--primary-color)' : 'white',
                                                    color: selectedStudent?.uid === s.uid ? 'white' : '#4b5563',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                {s.username}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="card" style={{ padding: '1.5rem' }}>
                                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>
                                                {selectedStudent?.username}
                                            </h3>
                                            <span style={{ 
                                                background: stats.present ? '#ecfdf5' : '#fef2f2', 
                                                color: stats.present ? '#059669' : '#dc2626', 
                                                padding: '4px 10px', 
                                                borderRadius: '20px', 
                                                fontWeight: 700, 
                                                fontSize: '0.8rem' 
                                            }}>
                                                {stats.location}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                                            {selectedStudent?.id_number || 'N/A'} • {selectedStudent?.department || 'General'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '12px', border: '1px solid #d1d5db' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                                                <CheckCircle size={18} color={stats.present ? "#059669" : "#dc2626"} />
                                                <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Today's Attendance</span>
                                            </div>
                                            <p style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                                                {stats.present ? "Present" : "Absent"}
                                            </p>
                                        </div>
                                        <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '12px', border: '1px solid #d1d5db' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                                                <AlertTriangle size={18} color={stats.alerts > 0 ? "#d97706" : "#9ca3af"} />
                                                <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Active Alerts</span>
                                            </div>
                                            <p style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                                                {stats.alerts === 0 ? "None" : `${stats.alerts} Alert(s)`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => navigate('/parent/chat')}
                                    className="full-width-mobile"
                                    style={{ width: '100%', padding: '12px', background: 'white', border: '1px solid #d1d5db', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <MessageSquare size={18} />
                                    Message Teacher
                                </button>
                            </div>

                            {/* Right Column: Detailed Report */}
                            <div className="full-width-mobile" style={{ flex: 1 }}>
                                <AttendanceReport 
                                    studentId={selectedStudent.uid} 
                                    department={selectedStudent.department}
                                    semester={selectedStudent.semester}
                                />
                            </div>
                        </div>
                    </>
                )}

            </main>
        </div>
    );
};

const AttendanceReport = ({ studentId, department, semester }) => {
    const [filters, setFilters] = useState({
        subject: 'all',
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Last 30 days
        endDate: new Date().toISOString().split('T')[0]
    });
    const [subjects, setSubjects] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch available subjects from timetables for this specific student's department and semester
        const fetchSubjects = async () => {
            let query = supabase
                .from('timetables')
                .select('class_name');

            if (department) {
                // Map short codes to full names as used in timetables table
                const deptMap = {
                    'CSE': 'Computer Science',
                    'ECE': 'Electronics', // Assuming these map to typical names, or if only CS exists in seed, this fixes CS.
                    'MECH': 'Mechanical',
                    'CIVIL': 'Civil'
                };
                // Use mapped value if exists, else original (fallback)
                const queryDept = deptMap[department] || department;
                query = query.eq('department', queryDept);
            }
            if (semester) {
                query = query.eq('semester', semester);
            }

            const { data } = await query.order('class_name');
            
            if (data) {
                // Unique subjects
                const unique = [...new Set(data.map(item => item.class_name))];
                setSubjects(unique);
            }
        };
        fetchSubjects();
    }, [department, semester]);

    const subjectOptions = [
        { value: 'all', label: 'All Subjects' },
        ...subjects.map(s => ({ value: s, label: s }))
    ];

    const fetchReport = async () => {
        setLoading(true);
        try {
            // 1. Fetch valid timetable IDs for this student's profile
            const { data: timetableData } = await supabase
                .from('timetables')
                .select('id, department, day_of_week')
                .eq('semester', semester);
            
            const studentSchedule = (timetableData || [])
                .filter(t => {
                    const target = (department || '').toLowerCase();
                    const source = (t.department || '').toLowerCase();
                    return source.includes(target) || 
                           target.includes(source) || 
                           (target.includes('computer') && source.includes('cse')) ||
                           (target.includes('cse') && source.includes('computer'));
                });
            
            const validClassIds = new Set(studentSchedule.map(t => t.id));
            const validClassSchedule = Object.fromEntries(studentSchedule.map(t => [t.id, t.day_of_week]));

            // 2. Fetch history
            let query = supabase
                .from('attendance')
                .select('*, timetables(class_name, start_time, end_time)')
                .eq('student_id', studentId)
                .gte('date', filters.startDate)
                .lte('date', filters.endDate)
                .order('date', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            // 3. Filter records strictly by curriculum and day of week
            let filteredData = (data || []).filter(rec => {
                // Must belong to their timetable
                if (!validClassIds.has(rec.class_id)) return false;

                // Must match the scheduled day
                const date = new Date(rec.date);
                const actualDay = date.toLocaleDateString('en-US', { weekday: 'long' });
                const scheduledDay = validClassSchedule[rec.class_id];
                return actualDay === scheduledDay;
            });
            
            if (filters.subject !== 'all') {
                filteredData = filteredData.filter(r => r.timetables?.class_name === filters.subject);
            }

            setReportData(filteredData);
        } catch (err) {
            console.error("Report Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="report-container" style={{ background: 'white', padding: '2rem', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #d1d5db' }}>
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .report-container, .report-container * {
                            visibility: visible;
                        }
                        .report-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 0 !important;
                            margin: 0 !important;
                            border: none !important;
                            box-shadow: none !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        /* Add a print header */
                        .print-header {
                            display: block !important;
                            text-align: center;
                            margin-bottom: 20px;
                        }
                    }
                    .print-header {
                        display: none;
                    }
                `}
            </style>
            
            <div className="print-header">
                <h1>Attendance Report</h1>
                <p>Generated on: {new Date().toLocaleDateString()}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>
                    Detailed Attendance Report
                </h3>
                <button 
                    onClick={handlePrint}
                    className="no-print"
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', 
                        borderRadius: '8px', color: '#4b5563', fontWeight: 600, cursor: 'pointer' 
                    }}
                >
                    <Printer size={18} /> Print
                </button>
            </div>
            
            <div className="no-print mobile-filter-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.5rem' }}>Start Date</label>
                    <input 
                        type="date" 
                        value={filters.startDate}
                        onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                        style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.5rem' }}>End Date</label>
                    <input 
                        type="date" 
                        value={filters.endDate}
                        onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                        style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.5rem' }}>Subject</label>
                    <CustomDropdown 
                        options={subjectOptions}
                        value={filters.subject}
                        onChange={(val) => setFilters({...filters, subject: val})}
                        placeholder="Select Subject"
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'end' }}>
                     <button 
                        onClick={fetchReport}
                        disabled={loading}
                        style={{ 
                            width: '100%', padding: '14px', background: '#111827', color: 'white', 
                            border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                            opacity: loading ? 0.7 : 1,
                            fontSize: '1rem'
                        }}
                    >
                        {loading ? 'Fetching...' : 'Get Report'}
                    </button>
                </div>
            </div>

            <div className="mobile-scroll-table" style={{ border: '1px solid #d1d5db', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f9fafb' }}>
                        <tr>
                            <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Time</th>
                            <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Subject</th>
                            <th style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                                    No records found for selected filters.
                                </td>
                            </tr>
                        ) : (
                            reportData.map((record) => (
                                <tr key={record.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#111827' }}>{record.date}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#111827' }}>
                                        {record.timetables?.start_time ? 
                                            `${record.timetables.start_time.slice(0,5)} - ${record.timetables.end_time.slice(0,5)}` 
                                            : '-'
                                        }
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#111827' }}>{record.timetables?.class_name || 'N/A'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                                            background: record.status === 'present' ? '#ecfdf5' : record.status === 'late' ? '#fffbeb' : '#fef2f2',
                                            color: record.status === 'present' ? '#047857' : record.status === 'late' ? '#b45309' : '#b91c1c'
                                        }}>
                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ParentDashboard;
