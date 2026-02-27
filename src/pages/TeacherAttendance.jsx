
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';
import { Calendar, Filter, Users, Clock, MapPin, User, ChevronRight, BookOpen, X, Download, Save, Search, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomDropdown from '../components/CustomDropdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TeacherAttendance = () => {
    const navigate = useNavigate();
    
    // Core State
    const [teacher, setTeacher] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [classes, setClasses] = useState([]); 
    const [loading, setLoading] = useState(true);

    // Filters
    const [subjects, setSubjects] = useState(['All']);
    const [selectedSubject, setSelectedSubject] = useState('All');

    // Modal State
    const [viewingClass, setViewingClass] = useState(null); 
    const [classAttendanceDetails, setClassAttendanceDetails] = useState([]); 
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    // PDF State
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    useEffect(() => {
        const init = async () => {
            const user = await getCurrentUser();
            if (!user) {
                navigate('/login');
                return;
            }
            
            // Fetch Profile to get 'username' (Teacher1)
            const { data: profile } = await supabase
                .from('users')
                .select('username, email')
                .eq('uid', user.id)
                .single();

            if (profile) {
                setTeacher({ ...user, username: profile.username });
            } else {
                setTeacher(user);
            }
        };
        init();
    }, [navigate]);

    useEffect(() => {
        if (teacher) fetchDailyOverview();
    }, [teacher, selectedDate]);

    // Fetch Schedule and Attendance
    const fetchDailyOverview = async () => {
        setLoading(true);
        try {
            // Fix timezone issue
            const [year, month, day] = selectedDate.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            const dayOfWeek = localDate.toLocaleDateString('en-US', { weekday: 'long' });

            // 1. Fetch Timetable
            const { data: timetableData, error: timetableError } = await supabase
                .from('timetables')
                .select('*')
                .ilike('teacher_name', teacher.username) // Teacher specific
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
            const merged = (timetableData || []).map(schedule => {
                const classRecords = (attendanceData || []).filter(r => r.class_id == schedule.id);
                const presentCount = classRecords.filter(r => r.status === 'Present' || r.status === 'present').length; // Handle case variants
                const totalMarked = classRecords.length;

                return {
                    ...schedule,
                    attendanceStats: {
                        present: presentCount,
                        totalMarked: totalMarked
                    },
                    isAttendanceMarked: totalMarked > 0
                };
            });

            setClasses(merged);

            // 4. Update Filter Options
            const uniqueSubjects = ['All', ...new Set(merged.map(c => c.class_name).filter(Boolean))];
            setSubjects(uniqueSubjects.sort());

        } catch (error) {
            console.error("Error fetching daily overview:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredClasses = classes.filter(cls => {
        return selectedSubject === 'All' || cls.class_name === selectedSubject;
    });

    const openClassModal = async (classItem) => {
        setViewingClass(classItem);
        setLoadingDetails(true);
        try {
            // 1. Fetch Students (Eligible for this class)
            // Assuming students are mapped by department/semester logic roughly or just fetching filtered list
            // For now, let's fetch students matching the department/year of the class if available
            // OR checks against existing attendance to see who was supposed to be there.
            
            // Mapping for Timetable departments to User departments
            const DEPT_MAP = {
                'Computer Science': ['CSE', 'CS'],
                'Electronics': ['ECE', 'EC'],
                'Mechanical': ['MECH', 'ME'],
                'Civil': ['CIVIL', 'CE'],
                'Information Technology': ['IT', 'CS'] // Sometimes IT falls under CS
            };

            const deptQuery = DEPT_MAP[classItem.department] || [classItem.department];

            let query = supabase.from('users').select('*').eq('role', 'student');
            
            // Check if deptQuery is array or string
            if (Array.isArray(deptQuery)) {
                query = query.in('department', deptQuery);
            } else {
                query = query.eq('department', deptQuery);
            }
            // if (classItem.year) query = query.eq('year', classItem.year); // If you have year in timetable
            if (classItem.semester) query = query.eq('semester', classItem.semester);

            const { data: eligibleStudents } = await query.order('username');

            // 2. Fetch Existing Attendance
            const { data: existingRecords } = await supabase
                .from('attendance')
                .select('*')
                .eq('class_id', classItem.id)
                .eq('date', selectedDate);

            // 3. Merge
            const mergedDetails = eligibleStudents?.map(student => {
                const record = existingRecords?.find(r => r.student_id === student.uid);
                return {
                    student: student,
                    status: record ? record.status : 'Pending', // Default state
                    recordId: record ? record.id : null
                };
            }) || [];

            setClassAttendanceDetails(mergedDetails);

        } catch (error) {
            console.error("Error fetching class details:", error);
            setClassAttendanceDetails([]);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Attendance Actions
    const handleMarkStatus = (studentId, status) => {
        setClassAttendanceDetails(prev => prev.map(item => 
            item.student.uid === studentId ? { ...item, status: status } : item
        ));
    };

    const saveAttendance = async () => {
        if (!viewingClass) return;
        setLoadingDetails(true);

        // Filter out 'Pending' if you don't want to save them, OR save them as Absent? 
        // Let's save only marked ones, or assume 'Pending' means not present? 
        // Safest: Warn if pending? Or just save valid statuses.
        // Let's map 'Pending' to 'Absent' if saving? Or leave it. 
        // For now, let's save explicit statuses.
        
        const updates = classAttendanceDetails
            .filter(item => item.status !== 'Pending')
            .map(item => ({
                class_id: viewingClass.id,
                student_id: item.student.uid,
                date: selectedDate,
                status: item.status.toLowerCase(),
                // recorded_at: new Date().toISOString() // Let DB handle or add if column exists
            }));

        if (updates.length === 0) {
            alert("No changes to save.");
            setLoadingDetails(false);
            return;
        }

        try {
            const { error } = await supabase
                .from('attendance')
                .upsert(updates, { onConflict: 'student_id, class_id, date' });

            if (error) throw error;

            await fetchDailyOverview(); // Refresh grid
            setViewingClass(null); // Close modal on success (or stay open?) -> Close for now
            // alert("Attendance saved successfully!"); 

        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("Failed to save attendance.");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleAutoAbsent = async () => {
        if (!viewingClass) return;
        if (!window.confirm("Are you sure? This will mark all students without a record as 'Absent' for this class.")) return;

        setLoadingDetails(true);
        try {
            const { data, error } = await supabase.rpc('mark_absent_students', {
                p_class_id: viewingClass.id,
                p_date: selectedDate
            });

            if (error) throw error;

            alert(`Successfully marked ${data} student(s) as Absent.`);
            
            // Refresh
            await openClassModal(viewingClass); // Reload local details
            await fetchDailyOverview(); // Reload grid stats

        } catch (error) {
            console.error("Error running auto-absent:", error);
            alert("Failed to mark students absent. Ensure the database function exists.");
        } finally {
            setLoadingDetails(false);
        }
    };

    // PDF Logic
    const generateClassPDF = (classData, attendanceRecords) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text('Class Attendance Report', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Subject: ${classData.class_name}`, 14, 32);
        doc.text(`Teacher: ${classData.teacher_name}`, 14, 38);
        doc.text(`Date: ${new Date(selectedDate).toLocaleDateString()}`, 14, 44);
        doc.text(`Time: ${classData.start_time.slice(0, 5)} - ${classData.end_time.slice(0, 5)}`, 14, 50);

        // Stats
        const presentCount = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'present').length;
        const totalCount = attendanceRecords.length;
        const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        
        doc.text(`Total Students: ${totalCount}`, 14, 60);
        doc.text(`Present: ${presentCount} (${percentage}%)`, 14, 66);

        // Table
        const tableColumn = ["Student Name", "ID Number", "Status"];
        const tableRows = attendanceRecords.map(item => [
            item.student?.username || 'Unknown',
            item.student?.id_number || 'N/A',
            item.status === 'Pending' ? 'Not Marked' : item.status.toUpperCase()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 2) {
                    const status = data.cell.raw;
                    if (status === 'PRESENT') data.cell.styles.textColor = [22, 101, 52];
                    if (status === 'ABSENT') data.cell.styles.textColor = [153, 27, 27];
                }
            }
        });

        return doc;
    };

    const handleDownloadPDF = () => {
        if (!classAttendanceDetails.length) return;
        const doc = generateClassPDF(viewingClass, classAttendanceDetails);
        doc.save(`Attendance_${viewingClass.class_name.replace(/\s+/g, '_')}_${selectedDate}.pdf`);
    };

    const handlePreviewPDF = () => {
        if (!classAttendanceDetails.length) return;
        const doc = generateClassPDF(viewingClass, classAttendanceDetails);
        const blobUrl = doc.output('bloburl');
        setPdfUrl(blobUrl);
        setShowPdfPreview(true);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-family)' }}>
            <main className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
                
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>My Attendance</h1>
                            <p style={{ color: '#64748b', marginTop: '4px' }}>
                                Manage attendance for your classes.
                            </p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Calendar size={20} color="#64748b" style={{ marginLeft: '8px' }} />
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', padding: '8px', fontFamily: 'inherit', color: '#1e293b', fontWeight: 500 }}
                            />
                        </div>
                    </div>

                    {/* Filter Bar - Simplified for Teacher */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'flex-end', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ flex: 1, maxWidth: '300px' }}>
                             <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Subject / Class</label>
                             <CustomDropdown 
                                options={subjects.map(s => ({ value: s, label: s }))} 
                                value={selectedSubject} 
                                onChange={setSelectedSubject} 
                                placeholder="All Subjects"
                             />
                        </div>
                         <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: '1px' }}>
                            <button 
                                onClick={() => setSelectedSubject('All')}
                                style={{ height: '48px', padding: '0 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer', marginTop: 'auto' }}
                            >
                                Reset
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

                {/* Detail/Marking Modal */}
                {viewingClass && (
                    <DetailModal 
                        classData={viewingClass} 
                        attendance={classAttendanceDetails} 
                        loading={loadingDetails} 
                        onClose={() => setViewingClass(null)}
                        onMark={handleMarkStatus}
                        onSave={saveAttendance}
                        onPreview={handlePreviewPDF}
                        onPreview={handlePreviewPDF}
                        onDownload={handleDownloadPDF}
                        onMarkAbsent={handleAutoAbsent}
                    />
                )}

                 {/* PDF Preview Modal */}
                 {showPdfPreview && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                        <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                             <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>PDF Preview</h3>
                                <button onClick={() => setShowPdfPreview(false)} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: '#64748b' }}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div style={{ flex: 1, background: '#f8fafc', padding: '1rem' }}>
                                <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} title="PDF Preview"></iframe>
                            </div>
                             <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button onClick={() => setShowPdfPreview(false)} style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600 }}>Close</button>
                                <button onClick={() => { const link = document.createElement('a'); link.href = pdfUrl; link.download = 'Report.pdf'; link.click(); }} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', borderRadius: '8px', fontWeight: 600, border: 'none' }}>Download</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

// Subcomponents

const ClassCard = ({ data, onClick }) => {
    const { class_name, start_time, end_time, department, attendanceStats, isAttendanceMarked } = data;
    
    const presentPct = isAttendanceMarked ? Math.round((attendanceStats.present / attendanceStats.totalMarked) * 100) : 0;
    
    let statusColor = '#94a3b8'; 
    let statusBg = '#f1f5f9';

    if (isAttendanceMarked) {
        if (presentPct >= 75) { statusColor = '#166534'; statusBg = '#dcfce7'; }
        else if (presentPct >= 50) { statusColor = '#854d0e'; statusBg = '#fef9c3'; }
        else { statusColor = '#991b1b'; statusBg = '#fee2e2'; }
    }

    return (
        <div 
            onClick={onClick}
            style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: isAttendanceMarked ? statusColor : '#cbd5e1' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} /> {start_time.slice(0, 5)} - {end_time.slice(0, 5)}
                </span>
                {isAttendanceMarked ? (
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
                    <BookOpen size={16} /> {department}
                </div>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {isAttendanceMarked ? 
                        <span><strong style={{ color: '#1e293b' }}>{attendanceStats.present}</strong> student(s) present</span> : 
                        <span>Tap to take attendance</span>
                    }
                </div>
                <ChevronRight size={18} color="#94a3b8" />
            </div>
        </div>
    );
};

const DetailModal = ({ classData, attendance, loading, onClose, onMark, onSave, onPreview, onDownload, onMarkAbsent }) => {
    const [isEditing, setIsEditing] = useState(false);

    // Filter out 'Pending' if we want to show a clean list when not editing? Or show all?
    // Let's show all as defined by parent.

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '800px', height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{classData.class_name}</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>{classData.department} • {classData.start_time.slice(0,5)} - {classData.end_time.slice(0,5)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                         {!isEditing && (
                            <>
                                <button 
                                    onClick={onMarkAbsent}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#991b1b' }}
                                    title="Mark all remaining students as Absent"
                                >
                                    <User size={16} /> Auto-Absent Remaining
                                </button>
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                                >
                                    <Edit2 size={16} /> Edit Attendance
                                </button>
                            </>
                        )}
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} color="#64748b" /></button>
                    </div>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', color: '#64748b' }}>Loading students...</p>
                    ) : attendance.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#64748b' }}>No students found for this class.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {attendance.map((item) => (
                                <div key={item.student.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#475569' }}>
                                            {item.student.username.charAt(0)}
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{item.student.username}</p>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>{item.student.id_number}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Status Display or Controls */}
                                    {isEditing ? (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {['Present', 'Absent', 'Late'].map(status => {
                                                const isActive = item.status.toLowerCase() === status.toLowerCase();
                                                return (
                                                    <button 
                                                        key={status}
                                                        onClick={() => onMark(item.student.uid, status)} // Sets Title Case locally
                                                        style={{
                                                            padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                                            background: isActive 
                                                                ? (status === 'Present' ? '#dcfce7' : status === 'Absent' ? '#fee2e2' : '#fef9c3')
                                                                : 'white',
                                                            color: isActive
                                                                ? (status === 'Present' ? '#166534' : status === 'Absent' ? '#991b1b' : '#854d0e')
                                                                : '#64748b',
                                                            boxShadow: isActive ? 'none' : 'inset 0 0 0 1px #cbd5e1'
                                                        }}
                                                    >
                                                        {status}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        (() => {
                                            const s = item.status.toLowerCase();
                                            const displayStatus = s === 'pending' ? 'Not Marked' : s.charAt(0).toUpperCase() + s.slice(1);
                                            let badgeBg = '#f1f5f9';
                                            let badgeColor = '#64748b';
                                            
                                            if (s === 'present') { badgeBg = '#dcfce7'; badgeColor = '#166534'; }
                                            else if (s === 'absent') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; }
                                            else if (s === 'late') { badgeBg = '#fef9c3'; badgeColor = '#854d0e'; }

                                            return (
                                                <div style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, background: badgeBg, color: badgeColor }}>
                                                    {displayStatus}
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                     {!isEditing ? (
                        <>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={onPreview} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Preview PDF</button>
                                <button onClick={onDownload} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Download PDF</button>
                            </div>
                            <button onClick={onClose} style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                        </>
                     ) : (
                        <>
                            <div style={{ flex: 1 }}></div> {/* Spacer */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setIsEditing(false)} style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Done Editing</button>
                                <button onClick={() => { onSave(); setIsEditing(false); }} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Save size={18} /> Save Changes
                                </button>
                            </div>
                        </>
                     )}
                </div>
            </div>
        </div>
    );
};

export default TeacherAttendance;
