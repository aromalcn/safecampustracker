import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase-config';
import { Calendar, Filter, Users, Clock, MapPin, User, ChevronRight, BookOpen, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomDropdown from '../components/CustomDropdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';

const AdminAttendance = () => {
    const navigate = useNavigate();
    
    // Core State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [classes, setClasses] = useState([]); // Merged Timetable + Attendance Data
    const [loading, setLoading] = useState(true);

    // Filters
    const [departments, setDepartments] = useState(['All', 'Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology']);
    const [selectedDept, setSelectedDept] = useState('All');
    
    const [teachers, setTeachers] = useState(['All']);
    const [selectedTeacher, setSelectedTeacher] = useState('All');

    const [subjects, setSubjects] = useState(['All']);
    const [selectedSubject, setSelectedSubject] = useState('All');

    // Modal State
    const [viewingClass, setViewingClass] = useState(null); // The class object being viewed
    const [classAttendanceDetails, setClassAttendanceDetails] = useState([]); // Students list for the modal
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchDailyOverview();
    }, [selectedDate]);

    // Fetch Schedule and Attendance for the selected date
    const fetchDailyOverview = async () => {
        setLoading(true);
        try {
            const dateObj = new Date(selectedDate);
            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

            // 1. Fetch Timetable for this Day
            const { data: timetableData, error: timetableError } = await supabase
                .from('timetables')
                .select('*')
                .eq('day_of_week', dayOfWeek)
                .order('start_time');

            if (timetableError) throw timetableError;

            // 2. Fetch Attendance Records for this Date
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance')
                .select('*')
                .eq('date', selectedDate);

            if (attendanceError) throw attendanceError;

            // 3. Merge Data
            // We want to show ALL scheduled classes, and attach attendance counts to them.
            // If a class corresponds to a timetable entry, we match by `class_id` (record.class_id === timetable.id)
            
            const merged = (timetableData || []).map(schedule => {
                // Find all attendance records for this specific class schedule
                const classRecords = (attendanceData || []).filter(r => r.class_id == schedule.id);
                
                const presentCount = classRecords.filter(r => r.status === 'present').length;
                const absentCount = classRecords.filter(r => r.status === 'absent').length;
                const totalMarked = classRecords.length;

                return {
                    ...schedule,
                    attendanceStats: {
                        present: presentCount,
                        absent: absentCount,
                        totalMarked: totalMarked
                    },
                    isAttendanceMarked: totalMarked > 0
                };
            });

            setClasses(merged);

            // 4. Update Filter Options based on fetched data
            const uniqueTeachers = ['All', ...new Set(merged.map(c => c.teacher_name).filter(Boolean))];
            const uniqueSubjects = ['All', ...new Set(merged.map(c => c.class_name).filter(Boolean))];
            
            setTeachers(uniqueTeachers.sort());
            setSubjects(uniqueSubjects.sort());

        } catch (error) {
            console.error("Error fetching daily overview:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredClasses = classes.filter(cls => {
        const matchDept = selectedDept === 'All' || cls.department === selectedDept;
        const matchTeacher = selectedTeacher === 'All' || cls.teacher_name === selectedTeacher;
        const matchSubject = selectedSubject === 'All' || cls.class_name === selectedSubject;
        return matchDept && matchTeacher && matchSubject;
    });

    const openClassModal = async (classItem) => {
        setViewingClass(classItem);
        setLoadingDetails(true);
        try {
            // 1. Fetch detailed attendance for this class
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance')
                .select('*')
                .eq('class_id', classItem.id) // Match by Timetable ID
                .eq('date', selectedDate);

            if (attendanceError) throw attendanceError;

            if (!attendanceData || attendanceData.length === 0) {
                setClassAttendanceDetails([]);
                return;
            }

            // 2. Fetch Student Info manually
            const studentIds = [...new Set(attendanceData.map(a => a.student_id))];
            const { data: students, error: studentsError } = await supabase
                .from('users')
                .select('uid, username, id_number, department')
                .in('uid', studentIds);

            if (studentsError) throw studentsError;

            // 3. Merge
            const studentMap = {};
            students?.forEach(s => studentMap[s.uid] = s);

            const mergedDetails = attendanceData.map(record => ({
                ...record,
                student: studentMap[record.student_id] || { username: 'Unknown', id_number: 'N/A' }
            }));

            setClassAttendanceDetails(mergedDetails);
        } catch (error) {
            console.error("Error fetching class details:", error);
            setClassAttendanceDetails([]);
        } finally {
            setLoadingDetails(false);
        }
    };

    // PDF Logic
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    const generateClassPDF = (classData, attendanceRecords) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text('Class Attendance Report', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Subject: ${classData.class_name}`, 14, 32);
        doc.text(`Teacher: ${classData.teacher_name}`, 14, 38);
        // Fix: Use selectedDate for the report date, not start_time
        doc.text(`Date: ${new Date(selectedDate).toLocaleDateString()}`, 14, 44);
        doc.text(`Time: ${classData.start_time.slice(0, 5)} - ${classData.end_time.slice(0, 5)}`, 14, 50);

        // Attendance Stats
        const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
        const totalCount = attendanceRecords.length;
        const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        
        doc.text(`Total Students: ${totalCount}`, 14, 60);
        doc.text(`Present: ${presentCount} (${percentage}%)`, 14, 66);

        // Table
        const tableColumn = ["Student Name", "ID Number", "Department", "Status"];
        const tableRows = attendanceRecords.map(record => [
            record.student?.username || 'Unknown',
            record.student?.id_number || 'N/A',
            record.student?.department || '-',
            record.status.toUpperCase()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 10, cellPadding: 3 },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 3) {
                    const status = data.cell.raw;
                    if (status === 'PRESENT') data.cell.styles.textColor = [22, 101, 52];
                    if (status === 'ABSENT') data.cell.styles.textColor = [153, 27, 27];
                }
            }
        });

        return doc;
    };

    const handleDownloadPDF = (classData, attendance) => {
        if (!attendance || attendance.length === 0) return;
        const doc = generateClassPDF(classData, attendance);
        doc.save(`Attendance_${classData.class_name.replace(/\s+/g, '_')}_${selectedDate}.pdf`);
    };

    const handlePreviewPDF = (classData, attendance) => {
        if (!attendance || attendance.length === 0) return;
        const doc = generateClassPDF(classData, attendance);
        const blobUrl = doc.output('bloburl');
        setPdfUrl(blobUrl);
        setShowPdfPreview(true);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-family)' }}>
            <main className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
                
                {/* Header & Controls */}
                <div style={{ marginBottom: '2rem' }}>
                    <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h1 className="page-title">Attendance Overview</h1>
                            <p className="page-subtitle">
                                {classes.filter(c => !c.isAttendanceMarked).length} classes pending updates
                            </p>
                        </div>
                        
                        <div className="full-width-mobile" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Calendar size={20} color="#64748b" style={{ marginLeft: '8px' }} />
                            <input 
                                type="date" 
                                className="full-width-mobile"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', padding: '8px', fontFamily: 'inherit', color: '#1e293b', fontWeight: 500, background: 'transparent', width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1.25rem' }}>
                        <div>
                             <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Department</label>
                             <CustomDropdown 
                                options={departments.map(d => ({ value: d, label: d }))} 
                                value={selectedDept} 
                                onChange={setSelectedDept} 
                                placeholder="Department"
                             />
                        </div>
                        <div className="hide-on-mobile">
                             <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Subject / Class</label>
                             <CustomDropdown 
                                options={subjects.map(s => ({ value: s, label: s }))} 
                                value={selectedSubject} 
                                onChange={setSelectedSubject} 
                                placeholder="All Subjects"
                             />
                        </div>
                        <div className="hide-on-mobile">
                             <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Teacher</label>
                             <CustomDropdown 
                                options={teachers.map(t => ({ value: t, label: t }))} 
                                value={selectedTeacher} 
                                onChange={setSelectedTeacher} 
                                placeholder="All Teachers"
                             />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button 
                                className="full-width-mobile"
                                onClick={() => { setSelectedDept('All'); setSelectedTeacher('All'); setSelectedSubject('All'); }}
                                style={{ height: '48px', padding: '0 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer', width: '100%' }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading schedule...</div>
                ) : filteredClasses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', background: '#f1f5f9', borderRadius: '16px', color: '#64748b' }}>
                        <div style={{ marginBottom: '1rem' }}><Filter size={48} opacity={0.5} /></div>
                        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>No classes match your filters for {new Date(selectedDate).toLocaleDateString()}.</p>
                        <button onClick={() => { setSelectedDept('All'); setSelectedTeacher('All'); setSelectedSubject('All'); }} style={{ color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.5rem' }}>Clear Filters</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {filteredClasses.map(item => (
                            <ClassCard 
                                key={item.id} 
                                data={item} 
                                onClick={() => openClassModal(item)} 
                            />
                        ))}
                    </div>
                )}

                {/* Detail Modal */}
                {viewingClass && (
                    <DetailModal 
                        classData={viewingClass} 
                        attendance={classAttendanceDetails} 
                        loading={loadingDetails} 
                        onClose={() => setViewingClass(null)}
                        onDownload={() => handleDownloadPDF(viewingClass, classAttendanceDetails)}
                        onPreview={() => handlePreviewPDF(viewingClass, classAttendanceDetails)}
                    />
                )}

                {/* PDF Preview Modal */}
                {showPdfPreview && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                        <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>PDF Preview</h3>
                                <button onClick={() => setShowPdfPreview(false)} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: '#64748b' }}>
                                    <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>&times;</span>
                                </button>
                            </div>
                            <div style={{ flex: 1, background: '#f8fafc', padding: '1rem' }}>
                                <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} title="PDF Preview"></iframe>
                            </div>
                            <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button 
                                    onClick={() => setShowPdfPreview(false)}
                                    style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                                <button 
                                    onClick={() => {
                                        // Trigger download from preview
                                        const link = document.createElement('a');
                                        link.href = pdfUrl;
                                        link.download = `Attendance_Report.pdf`;
                                        link.click();
                                        setShowPdfPreview(false);
                                    }}
                                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Download size={18} /> Download
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

// --- Subcomponents ---

const ClassCard = ({ data, onClick }) => {
    const { class_name, teacher_name, start_time, end_time, department, semester, details, attendanceStats } = data;
    
    // Status Logic
    const isMarked = attendanceStats.totalMarked > 0;
    const presentPct = isMarked ? Math.round((attendanceStats.present / attendanceStats.totalMarked) * 100) : 0;
    
    let statusColor = '#94a3b8'; // gray
    let statusBg = '#f1f5f9';
    let statusText = 'Pending';

    if (isMarked) {
        if (presentPct >= 75) { statusColor = '#166534'; statusBg = '#dcfce7'; statusText = 'Good'; }
        else if (presentPct >= 50) { statusColor = '#854d0e'; statusBg = '#fef9c3'; statusText = 'Average'; }
        else { statusColor = '#991b1b'; statusBg = '#fee2e2'; statusText = 'Low'; }
    }

    return (
        <div 
            onClick={onClick}
            style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            {/* Status Strip */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: isMarked ? statusColor : '#cbd5e1' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ 
                    background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '20px', 
                    fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' 
                }}>
                    <Clock size={12} /> {start_time.slice(0, 5)} - {end_time.slice(0, 5)}
                </span>
                {isMarked ? (
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: statusColor, background: statusBg, padding: '4px 8px', borderRadius: '6px' }}>
                        {presentPct}% Present
                    </span>
                ) : (
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>Not Marked</span>
                )}
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>{class_name}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} /> {teacher_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} /> {department} • Sem {semester}
                </div>
                {details && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} /> {details}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {isMarked ? (
                        <span><strong style={{ color: '#1e293b' }}>{attendanceStats.present}</strong> student(s) present</span>
                    ) : (
                        <span>Waiting for update...</span>
                    )}
                </div>
                <ChevronRight size={18} color="#94a3b8" />
            </div>
        </div>
    );
};

const DetailModal = ({ classData, attendance, loading, onClose, onDownload, onPreview }) => {
    // Determine status badge helper
    const getStatusBadge = (status) => {
        const styles = {
            present: { bg: '#dcfce7', color: '#166534' },
            absent: { bg: '#fee2e2', color: '#991b1b' },
            late: { bg: '#fef9c3', color: '#854d0e' }
        };
        const s = styles[status] || { bg: '#f1f5f9', color: '#64748b' };
        return (
            <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                {status}
            </span>
        );
    };

    return (
        <div style={{ 
             position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
             background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
             display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 
        }}>
            <div style={{ 
                background: 'white', borderRadius: '16px', width: '90%', maxWidth: '600px', height: '80vh', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column'
            }}>
                {/* Modal Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{classData.class_name}</h2>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                            <span>{classData.start_time.slice(0, 5)} - {classData.end_time.slice(0, 5)}</span>
                            <span>•</span>
                            <span>{classData.teacher_name}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={24} color="#64748b" />
                    </button>
                </div>

                {/* Modal Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading records...</div>
                    ) : attendance.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            <Users size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>No attendance has been marked for this class yet.</p>
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                                <span>Student Name</span>
                                <span>Status</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {attendance.map(record => (
                                    <div key={record.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                                                {record.student?.username?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{record.student?.username}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{record.student?.id_number}</div>
                                            </div>
                                        </div>
                                        {getStatusBadge(record.status)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex-col-mobile" style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button 
                        onClick={onPreview}
                        disabled={attendance.length === 0}
                        className="full-width-mobile"
                        style={{ 
                            padding: '10px 20px', background: 'white', border: '1px solid #d1d5db', color: '#374151', textDecoration: 'none',
                            borderRadius: '10px', cursor: attendance.length === 0 ? 'not-allowed' : 'pointer', 
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', opacity: attendance.length === 0 ? 0.5 : 1,
                            justifyContent: 'center'
                        }}
                    >
                         Preview PDF
                    </button>
                    <button 
                        onClick={onDownload}
                        disabled={attendance.length === 0}
                        className="full-width-mobile"
                        style={{ 
                            padding: '10px 20px', background: 'var(--primary-color)', color: 'white', border: 'none', 
                            borderRadius: '10px', cursor: attendance.length === 0 ? 'not-allowed' : 'pointer', 
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', opacity: attendance.length === 0 ? 0.5 : 1,
                            justifyContent: 'center'
                        }}
                    >
                        <Download size={18} /> Download
                    </button>
                    <button onClick={onClose} 
                        className="full-width-mobile"
                        style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, color: '#475569', justifyContent: 'center' }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminAttendance;
