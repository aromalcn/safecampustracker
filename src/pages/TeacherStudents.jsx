import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, Users, Mail, BookOpen, FileDown } from 'lucide-react';
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
                            <StudentCard key={student.id || student.uid} student={student} />
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
            </main>
            <MobileNav />
        </div>
    );
};

const StudentCard = ({ student }) => (
    <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem', transition: 'transform 0.2s', cursor: 'default' }}>
        <div style={{ position: 'relative' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                {student.username?.charAt(0).toUpperCase()}
            </div>
            <div style={{ 
                position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderRadius: '50%', border: '2px solid white',
                background: student.status === 'Inside' ? '#22c55e' : student.status === 'Outside' ? '#ef4444' : '#94a3b8'
            }} title={student.status} />
        </div>
        <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{student.username}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>ID: {student.id_number || 'N/A'}</p>
        </div>
        
        <div style={{ 
            padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, margin: '4px 0',
            background: student.status === 'Inside' ? '#dcfce7' : student.status === 'Outside' ? '#fee2e2' : '#f1f5f9',
            color: student.status === 'Inside' ? '#15803d' : student.status === 'Outside' ? '#b91c1c' : '#64748b'
        }}>
            {student.status === 'Inside' ? 'INSIDE CLASS' : student.status === 'Outside' ? 'OUTSIDE' : 'NO CLASS'}
        </div>

        <div style={{ width: '100%', height: '1px', background: '#f1f5f9', margin: '0.5rem 0' }} />
        
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#475569', justifyContent: 'center' }}>
                <BookOpen size={16} />
                <span>Semester {student.semester}</span>
            </div>
            {student.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#475569', justifyContent: 'center', wordBreak: 'break-all' }}>
                    <Mail size={16} />
                    <span>{student.email}</span>
                </div>
            )}
        </div>
    </div>
);

export default TeacherStudents;
