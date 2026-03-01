import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, Users, Mail, BookOpen, FileDown, X, ChevronRight, PieChart, Award, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import CustomSelect from '../components/ui/CustomSelect';
import MobileNav from '../components/MobileNav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TeacherStudents = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('All');
    const [semesters, setSemesters] = useState([]);

    // Detail Modal States
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [attendanceStats, setAttendanceStats] = useState({ percentage: 0, present: 0, absent: 0, total: 0 });
    const [academicResults, setAcademicResults] = useState([]);

    useEffect(() => {
        const init = async () => {
            const user = await getCurrentUser();
            if (!user) {
                navigate('/login');
                return;
            }
            await fetchMyStudents(user);
            setLoading(false);
        };
        init();
    }, [navigate]);

    useEffect(() => {
        filterStudents();
    }, [searchQuery, selectedSemester, students]);

    const fetchMyStudents = async (user) => {
        try {
            // 1. Get Teacher Profile
            const { data: profile } = await supabase.from('users').select('username, email').eq('uid', user.id).single();
            const teacherName = profile?.username || '';
            const teacherEmail = profile?.email || '';

            // 2. Fetch Timetable to find Semesters associated with this teacher
            let { data: schedule } = await supabase
                .from('timetables')
                .select('semester, teacher_name')
                .eq('teacher_name', teacherName);
            
            // Fallback to email if needed
            if ((!schedule || schedule.length === 0) && teacherEmail) {
                const { data: scheduleByEmail } = await supabase
                    .from('timetables')
                    .select('semester, teacher_name')
                    .eq('teacher_name', teacherEmail);
                if (scheduleByEmail) schedule = scheduleByEmail;
            }

            // Extract unique semesters
            const uniqueSemesters = [...new Set((schedule || []).map(s => String(s.semester)))].sort();
            setSemesters(uniqueSemesters);

            // 3. Fetch Students in those semesters
            let query = supabase.from('users').select('*').eq('role', 'student');
            
            if (uniqueSemesters.length > 0) {
                query = query.in('semester', uniqueSemesters.map(s => parseInt(s)));
            } else {
                console.warn("No classes found for teacher, fetching all students.");
            }

            const { data: studentList, error } = await query.order('username');
            if (error) throw error;

            if (studentList && studentList.length > 0) {
                // 4. Fetch Live Status for these students
                const now = new Date();
                const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
                const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
                const today = now.toISOString().split('T')[0];

                // 4a. Get ALL active classes right now
                const { data: activeClasses } = await supabase
                    .from('timetables')
                    .select('*')
                    .eq('day_of_week', dayName)
                    .lte('start_time', timeStr)
                    .gte('end_time', timeStr);

                // 4b. Get Today's attendance for these students
                const studentIds = studentList.map(s => s.uid);
                const { data: attendanceRecords } = await supabase
                    .from('attendance')
                    .select('student_id, class_id, status')
                    .eq('date', today)
                    .in('student_id', studentIds);

                // 4c. Map status to students
                const studentsWithStatus = studentList.map(student => {
                    // Find if student has a class now
                    // Matching department AND semester
                    const currentClass = activeClasses?.find(c => 
                        c.department === student.department && 
                        String(c.semester) === String(student.semester)
                    );

                    let status = 'No Class';
                    if (currentClass) {
                        // Check if marked present for THIS class
                        const record = attendanceRecords?.find(a => 
                            a.student_id === student.uid && 
                            a.class_id === currentClass.id &&
                            a.status === 'present'
                        );
                        status = record ? 'Inside' : 'Outside';
                    }

                    return { ...student, status, currentClassName: currentClass?.class_name };
                });

                setStudents(studentsWithStatus || []);
            } else {
                setStudents([]);
            }
            
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const handleStudentClick = async (student) => {
        setSelectedStudent(student);
        setModalLoading(true);
        try {
            // 1. Fetch Attendance Stats
            // We need to fetch all records for this student and filter by their curriculum
            const { data: profile } = await supabase.from('users').select('department, semester').eq('uid', student.uid).single();
            const { data: timetableData } = await supabase
                .from('timetables')
                .select('id')
                .eq('semester', profile.semester || student.semester);
            
            const validClassIds = (timetableData || []).map(t => t.id);

            const { data: attData } = await supabase
                .from('attendance')
                .select('status')
                .eq('student_id', student.uid)
                .in('class_id', validClassIds);

            if (attData) {
                const present = attData.filter(r => r.status === 'present' || r.status === 'late').length;
                const total = attData.length;
                const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
                setAttendanceStats({ percentage, present, absent: total - present, total });
            }

            // 2. Fetch Academic Results
            const { data: resData } = await supabase
                .from('academic_results')
                .select('*')
                .eq('student_id', student.uid)
                .order('published_at', { ascending: false });
            
            setAcademicResults(resData || []);
        } catch (error) {
            console.error("Detail Fetch Error:", error);
        } finally {
            setModalLoading(false);
        }
    };

    const filterStudents = () => {
        let temp = [...students];

        if (selectedSemester !== 'All') {
            temp = temp.filter(s => String(s.semester) === selectedSemester);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            temp = temp.filter(s => 
                (s.username && s.username.toLowerCase().includes(q)) ||
                (s.email && s.email.toLowerCase().includes(q)) ||
                (s.id_number && String(s.id_number).toLowerCase().includes(q))
            );
        }

        setFilteredStudents(temp);
    };

    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    const generatePDFDoc = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(18);
        doc.text('My Students List & Status', 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Students: ${filteredStudents.length}`, 14, 36);

        const tableColumn = ["Name", "ID Number", "Semester", "Status", "Email"];
        const tableRows = filteredStudents.map(student => [
            student.username,
            student.id_number || 'N/A',
            student.semester,
            student.status || '-',
            student.email || 'N/A'
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 44,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 10, cellPadding: 3 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    const status = data.cell.raw;
                    if (status === 'Inside') {
                        data.cell.styles.textColor = [22, 163, 74]; // Green
                        data.cell.styles.fontStyle = 'bold';
                    } else if (status === 'Outside') {
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [100, 116, 139]; // Gray
                    }
                }
            }
        });

        return doc;
    };

    const handlePreviewPDF = () => {
        if (filteredStudents.length === 0) return;
        const doc = generatePDFDoc();
        if (doc) {
            const blobUrl = doc.output('bloburl');
            setPdfUrl(blobUrl);
            setShowPdfPreview(true);
        }
    };

    const downloadPDF = () => {
        const doc = generatePDFDoc();
        if (doc) {
            doc.save('my_students_status.pdf');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-family)' }}>
            
            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/teacher')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', color: '#64748b' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>My Students</h1>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                            {filteredStudents.length} Students {semesters.length > 0 ? `(Semesters: ${semesters.join(', ')})` : ''}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                        onClick={handlePreviewPDF}
                        disabled={filteredStudents.length === 0}
                        style={{ 
                            background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', 
                            borderRadius: '8px', fontWeight: 600, cursor: filteredStudents.length === 0 ? 'not-allowed' : 'pointer', 
                            display: 'flex', alignItems: 'center', gap: '8px', opacity: filteredStudents.length === 0 ? 0.7 : 1
                        }}
                    >
                        <FileDown size={18} /> Print to PDF
                    </button>
                </div>
            </div>

            <main className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Filters */}
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    
                    <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                        <input 
                            type="text" 
                            placeholder="Search by name, email, or ID..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '12px 12px 12px 40px', 
                                borderRadius: '8px', 
                                border: '1px solid #cbd5e1', 
                                fontSize: '1rem' 
                            }}
                        />
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    </div>

                    <div style={{ minWidth: '200px', width: '100%' }}>
                        <CustomSelect 
                            value={selectedSemester}
                            onChange={setSelectedSemester}
                            options={[
                                { value: 'All', label: 'All Semesters' },
                                ...semesters.map(s => ({ value: s, label: `Semester ${s}` }))
                            ]}
                            placeholder="Filter by Semester"
                            icon={BookOpen}
                        />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading students...</div>
                ) : filteredStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No students found.</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {filteredStudents.map(student => (
                            <StudentCard key={student.id || student.uid} student={student} onClick={() => handleStudentClick(student)} />
                        ))}
                    </div>
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
                                        downloadPDF();
                                        setShowPdfPreview(false);
                                    }}
                                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <FileDown size={18} /> Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Student Detail Modal */}
                {selectedStudent && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', width: '95%', maxWidth: '900px', height: '90vh', borderRadius: '24px', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>
                            
                            {/* Modal Header */}
                            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                                        {selectedStudent.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{selectedStudent.username}</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{selectedStudent.department} • Semester {selectedStudent.semester}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedStudent(null)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#64748b' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                                {modalLoading ? (
                                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                        Loading detail reports...
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                                        
                                        {/* Left Column: Attendance */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #dbeafe' }}>
                                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <PieChart size={18} /> Attendance Overview
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                     <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                         <svg width="120" height="120" viewBox="0 0 120 120">
                                                             <circle cx="60" cy="60" r="54" fill="none" stroke="#dbeafe" strokeWidth="12" />
                                                             <circle cx="60" cy="60" r="54" fill="none" stroke="#2563eb" strokeWidth="12" 
                                                                    strokeDasharray={2 * Math.PI * 54} 
                                                                    strokeDashoffset={2 * Math.PI * 54 * (1 - attendanceStats.percentage / 100)}
                                                                    strokeLinecap="round" transform="rotate(-90 60 60)" 
                                                             />
                                                         </svg>
                                                         <div style={{ position: 'absolute', textAlign: 'center' }}>
                                                             <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{attendanceStats.percentage}%</span>
                                                         </div>
                                                     </div>
                                                     <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                         <div style={{ background: 'white', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                                                             <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>PRESENT</p>
                                                             <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>{attendanceStats.present}</p>
                                                         </div>
                                                         <div style={{ background: 'white', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                                                             <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TOTAL</p>
                                                             <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{attendanceStats.total}</p>
                                                         </div>
                                                     </div>
                                                </div>
                                            </div>

                                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                                 <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Calendar size={18} /> Basic Info
                                                 </h4>
                                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                     <div>
                                                         <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Roll Number</p>
                                                         <p style={{ margin: '2px 0 0 0', fontWeight: 600 }}>{selectedStudent.id_number || 'N/A'}</p>
                                                     </div>
                                                     <div>
                                                         <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Email Address</p>
                                                         <p style={{ margin: '2px 0 0 0', fontWeight: 600, wordBreak: 'break-all' }}>{selectedStudent.email}</p>
                                                     </div>
                                                 </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Academic Results */}
                                        <div>
                                            <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Award size={20} color="#f59e0b" /> Academic Performance
                                            </h4>
                                            
                                            {academicResults.length === 0 ? (
                                                <div style={{ padding: '3rem 2rem', background: '#f8fafc', borderRadius: '20px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                                                    <AlertCircle size={32} color="#94a3b8" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                                    <p style={{ color: '#64748b', margin: 0 }}>No academic records available for this student.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {academicResults.map(res => (
                                                        <div key={res.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{res.subject}</h5>
                                                                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Published: {new Date(res.published_at).toLocaleDateString()}</p>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{res.marks_obtained}/{res.total_marks}</div>
                                                                </div>
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: res.grade === 'A+' || res.grade === 'A' ? '#dcfce7' : res.grade === 'B' || res.grade === 'B+' ? '#dbeafe' : '#fee2e2', color: res.grade === 'A+' || res.grade === 'A' ? '#166534' : res.grade === 'B' || res.grade === 'B+' ? '#1e40af' : '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                                                                    {res.grade}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button onClick={() => setSelectedStudent(null)} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                    Close Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <MobileNav />
        </div>
    );
};

const StudentCard = ({ student, onClick }) => (
    <div 
        onClick={onClick}
        style={{ 
            background: 'white', 
            borderRadius: '20px', 
            padding: '1.5rem', 
            border: '1px solid #e2e8f0', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center', 
            gap: '0.75rem', 
            transition: 'all 0.3s ease', 
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
        }}
        onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0,0,0,0.1)';
            e.currentTarget.style.borderColor = '#3b82f6';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            e.currentTarget.style.borderColor = '#e2e8f0';
        }}
    >
        <div style={{ position: 'relative' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                {student.username?.charAt(0).toUpperCase()}
            </div>
            <div style={{ 
                position: 'absolute', bottom: 0, right: 0, width: '18px', height: '18px', borderRadius: '50%', border: '3px solid white',
                background: student.status === 'Inside' ? '#22c55e' : student.status === 'Outside' ? '#ef4444' : '#94a3b8'
            }} title={student.status} />
        </div>
        
        <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{student.username}</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{student.id_number || 'No ID'}</p>
        </div>
        
        <div style={{ 
            padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, margin: '4px 0',
            background: student.status === 'Inside' ? '#dcfce7' : student.status === 'Outside' ? '#fee2e2' : '#f1f5f9',
            color: student.status === 'Inside' ? '#15803d' : student.status === 'Outside' ? '#b91c1c' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
        }}>
            {student.status === 'Inside' ? <CheckCircle size={12} /> : student.status === 'Outside' ? <AlertCircle size={12} /> : null}
            {student.status === 'Inside' ? 'INSIDE' : student.status === 'Outside' ? 'OUTSIDE' : 'NO CLASS'}
        </div>

        <div style={{ width: '100%', height: '1px', background: '#f1f5f9', margin: '0.5rem 0' }} />
        
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem' }}>
            <span>View Details</span>
            <ChevronRight size={16} />
        </div>
    </div>
);

export default TeacherStudents;
