import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Check, X, Clock, MapPin, Filter, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCurrentUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import StudentMobileNav from '../components/StudentMobileNav';

const StudentAttendance = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, percentage: 0 });
    const [filter, setFilter] = useState('all'); // all, present, absent
    const [user, setUser] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);


    useEffect(() => {
        const init = async () => {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                navigate('/login');
                return;
            }
            setUser(currentUser);
            fetchHistory(currentUser.id);
        };
        init();
    }, [navigate]);

    // Real-time Attendance Subscription
    useEffect(() => {
        if (!user) return;

        const subscription = supabase
            .channel(`student_attendance_history_${user.id}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${user.id}` }, 
                () => {
                    console.log('Attendance record changed, refreshing history...');
                    fetchHistory(user.id);
                }
            )
            .subscribe();

        return () => {
             supabase.removeChannel(subscription);
        };
    }, [user]);

    const fetchHistory = async (userId) => {
        try {
            // 1. Fetch User Profile for filtering
            const { data: profile } = await supabase.from('users').select('department, semester').eq('uid', userId).single();
            if (!profile) throw new Error('Profile not found');

            // 2. Fetch Relevant Timetable entries for this student's Dept/Sem
            const { data: timetableData } = await supabase
                .from('timetables')
                .select('id, department, day_of_week')
                .eq('semester', profile.semester || 1);

            // Filter for student's department (fuzzy match)
            const studentSchedule = (timetableData || []).filter(t => {
                const target = (profile.department || '').toLowerCase();
                const source = (t.department || '').toLowerCase();
                return source.includes(target) || 
                       target.includes(source) || 
                       (target.includes('computer') && source.includes('cse')) ||
                       (target.includes('cse') && source.includes('computer'));
            });

            // Map class_id -> day_of_week for strict validation
            const validClassSchedule = Object.fromEntries(studentSchedule.map(t => [t.id, t.day_of_week]));
            const validClassIds = new Set(studentSchedule.map(t => t.id));

            // 3. Fetch History
            const { data: attendanceData, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('student_id', userId)
                .order('date', { ascending: false });

            if (error) throw error;
            
            // 4. Filter records strictly based on the student's timetable and the correct day of week
            const filteredRecords = (attendanceData || []).filter(rec => {
                // Must be a class in their curriculum
                if (!validClassIds.has(rec.class_id)) return false;
                
                // Must be recorded on the day the class is actually scheduled
                const date = new Date(rec.date);
                const actualDay = date.toLocaleDateString('en-US', { weekday: 'long' });
                const scheduledDay = validClassSchedule[rec.class_id];
                
                return actualDay === scheduledDay;
            });

            setRecords(filteredRecords);
            calculateStats(filteredRecords);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const present = data.filter(r => r.status === 'present').length;
        const absent = data.filter(r => r.status === 'absent').length;
        const late = data.filter(r => r.status === 'late').length;
        const total = data.length;
        
        // Count `late` as present effectively for simple attendance, or handle separately?
        // Usually present + late / total. 
        const effectivePresent = present + late;
        const percentage = total > 0 ? ((effectivePresent / total) * 100).toFixed(1) : 0;

        setStats({ present, absent, late, percentage });
    };

    const generatePDF = (shouldDownload = false) => {
        const doc = new jsPDF();
        
        // Add Title
        doc.setFontSize(18);
        doc.text('Attendance History Report', 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Student: ${user?.user_metadata?.username || 'Student'}`, 14, 35);
        doc.text(`Attendance Percentage: ${stats.percentage}%`, 14, 40);
        
        const tableData = getFilteredRecords().map(rec => [
            rec.class_name,
            new Date(rec.date).toLocaleDateString(),
            rec.recorded_at ? new Date(rec.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            rec.status.charAt(0).toUpperCase() + rec.status.slice(1)
        ]);
        
        autoTable(doc, {
            startY: 50,
            head: [['Class Name', 'Date', 'Time', 'Status']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] }, // Blue matching the student theme
            margin: { top: 45 },
            didDrawPage: (data) => {
                const str = 'Page ' + doc.internal.getNumberOfPages();
                doc.setFontSize(10);
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.text(str, data.settings.margin.left, pageHeight - 10);
            }
        });
        
        if (shouldDownload) {
            doc.save(`Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } else {
            const blob = doc.output('bloburl');
            setPreviewUrl(blob);
            setShowPreview(true);
        }
    };

    const getFilteredRecords = () => {
        if (filter === 'all') return records;
        return records.filter(r => r.status === filter);
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-family)', paddingBottom: '80px' }}>
             {/* Header */}
             <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 10 }}>
                <button onClick={() => navigate('/student')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', color: '#64748b' }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Attendance History</h1>
                <button 
                    onClick={() => generatePDF(false)}
                    disabled={loading || records.length === 0}
                    style={{ 
                        marginLeft: 'auto',
                        background: 'white', 
                        color: '#475569', 
                        border: '1px solid #e2e8f0', 
                        padding: '8px 16px', 
                        borderRadius: '8px', 
                        fontWeight: 600, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: records.length === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    <Printer size={18} /> Print to PDF
                </button>
            </div>

            <main className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', padding: '1.5rem', borderRadius: '16px', color: 'white' }}>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>Attendance</p>
                        <h2 style={{ margin: '4px 0 0 0', fontSize: '2rem', fontWeight: 800 }}>{stats.percentage}%</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                         <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Present</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>{stats.present + stats.late}</span>
                         </div>
                         <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Absent</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>{stats.absent}</span>
                         </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
                    {['all', 'present', 'absent', 'late'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{ 
                                padding: '8px 16px', 
                                borderRadius: '20px', 
                                border: 'none', 
                                background: filter === f ? '#1e293b' : 'white', 
                                color: filter === f ? 'white' : '#64748b',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                // border: filter === f ? 'none' : '1px solid #cbd5e1' // Removed duplicate
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {loading ? (
                         <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading records...</div>
                    ) : getFilteredRecords().length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                            <p>No records found.</p>
                        </div>
                    ) : (
                        getFilteredRecords().map((record) => (
                            <div key={record.id} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{record.class_name}</h4>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} /> {formatDate(record.date)}
                                        {record.recorded_at && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                                                <Clock size={14} /> {new Date(record.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div style={{ 
                                    padding: '6px 12px', 
                                    borderRadius: '8px', 
                                    fontSize: '0.85rem', 
                                    fontWeight: 700, 
                                    background: record.status === 'present' ? '#dcfce7' : record.status === 'late' ? '#fef3c7' : '#fee2e2',
                                    color: record.status === 'present' ? '#16a34a' : record.status === 'late' ? '#d97706' : '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {record.status === 'present' ? <Check size={14} /> : record.status === 'late' ? <Clock size={14} /> : <X size={14} />}
                                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* PDF Preview Modal */}
            {showPreview && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', width: '90%', maxWidth: '800px', height: '90vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>PDF Preview</h3>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button 
                                    onClick={() => generatePDF(true)} 
                                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Download
                                </button>
                                <button 
                                    onClick={() => { setShowPreview(false); setPreviewUrl(null); }} 
                                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <iframe 
                            src={previewUrl} 
                            style={{ width: '100%', flex: 1, border: '1px solid #e2e8f0', borderRadius: '12px' }} 
                            title="Attendance PDF Preview"
                        />
                    </div>
                </div>
            )}

            {/* StudentMobileNav handled by StudentLayout */}
        </div>
    );
};

export default StudentAttendance;
