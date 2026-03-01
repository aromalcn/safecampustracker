import React, { useEffect, useState } from 'react';
import { FileText, Plus, Search, Trash2, User, BookOpen, AlertCircle, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';
import CustomDropdown from '../components/CustomDropdown';
import AlertBanner from '../components/AlertBanner';

const TeacherResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Form Data
    const [formData, setFormData] = useState({
        student_id: '',
        exam_schedule_id: '',
        subject: '',
        marks_obtained: '',
        total_marks: '100',
        grade: '',
        remarks: ''
    });

    // Dropdown Data
    const [myStudents, setMyStudents] = useState([]);
    const [exams, setExams] = useState([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const user = await getCurrentUser();
        if (!user) return;
        setCurrentUser(user);
        
        await Promise.all([
            fetchMyStudents(user),
            fetchExams(),
            fetchPublishedResults(user.id)
        ]);
        setLoading(false);
    };

    const fetchMyStudents = async (user) => {
        try {
            // Logic adapted from TeacherStudents.jsx
            // 1. Get Teacher Profile
            const { data: profile } = await supabase.from('users').select('username, email').eq('uid', user.id).single();
            const teacherName = profile?.username || '';
            const teacherEmail = profile?.email || '';

            // 2. Fetch Timetable to find Semesters associated with this teacher
            let { data: schedule } = await supabase
                .from('timetables')
                .select('semester, teacher_name')
                .eq('teacher_name', teacherName);
            
            if ((!schedule || schedule.length === 0) && teacherEmail) {
                const { data: scheduleByEmail } = await supabase
                    .from('timetables')
                    .select('semester, teacher_name')
                    .eq('teacher_name', teacherEmail);
                if (scheduleByEmail) schedule = scheduleByEmail;
            }

            const uniqueSemesters = [...new Set((schedule || []).map(s => String(s.semester)))];

            // 3. Fetch Students
            let query = supabase.from('users').select('uid, username, id_number, semester, department').eq('role', 'student');
            if (uniqueSemesters.length > 0) {
                query = query.in('semester', uniqueSemesters.map(s => parseInt(s)));
            }
            
            const { data: students } = await query.order('username');
            setMyStudents(students || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const fetchExams = async () => {
        try {
            const { data } = await supabase.from('exam_schedules').select('id, subject, exam_date').order('exam_date', { ascending: false });
            setExams(data || []);
        } catch (error) {
            console.error("Error fetching exams:", error);
        }
    };

    const fetchPublishedResults = async (teacherId) => {
        try {
            const { data, error } = await supabase
                .from('academic_results')
                .select('*, users:student_id(username, id_number)')
                //.eq('created_by', teacherId) // Ideally filter by teacher, but for MVP let's see all or filter client side
                .order('published_at', { ascending: false });

            if (error) throw error;
            setResults(data || []);
        } catch (error) {
            console.error("Error fetching results:", error);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const calculateGrade = (marks, total) => {
        const percentage = (marks / total) * 100;
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    };

    const handleMarksChange = (e) => {
        const marks = e.target.value;
        if (marks < 0) return;
        setFormData(prev => ({
            ...prev,
            marks_obtained: marks,
            grade: calculateGrade(marks, prev.total_marks)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFeedback({ message: '', type: '' });

        try {
            const payload = {
                ...formData,
                exam_schedule_id: formData.exam_schedule_id || null, // Convert empty string to null
                created_by: currentUser.id,
                published_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('academic_results')
                .insert([payload]);

            if (error) throw error;

            // Notify Student
            const notificationTitle = `New Result: ${formData.subject}`;
            const notificationMessage = `You scored ${formData.marks_obtained}/${formData.total_marks} (${calculateGrade(formData.marks_obtained, formData.total_marks)}).`;
            
            await supabase.from('notifications').insert([{
                user_id: payload.student_id, // Student
                title: notificationTitle,
                message: notificationMessage,
                type: 'academic'
            }]);

            // Notify Parents
            const { data: parents } = await supabase
                .from('parent_student_links')
                .select('parent_id')
                .eq('student_id', payload.student_id);

            if (parents && parents.length > 0) {
                const parentNotifications = parents.map(p => ({
                    user_id: p.parent_id,
                    title: `Result Update: ${myStudents.find(s => s.uid === payload.student_id)?.username}`,
                    message: `${formData.subject}: ${formData.marks_obtained}/${formData.total_marks} (${calculateGrade(formData.marks_obtained, formData.total_marks)})`,
                    type: 'academic'
                }));
                await supabase.from('notifications').insert(parentNotifications);
            }

            setFeedback({ message: 'Result published and notifications sent!', type: 'success' });
            setShowForm(false);
            setFormData({
                student_id: '',
                exam_schedule_id: '',
                subject: '',
                marks_obtained: '',
                total_marks: '100',
                grade: '',
                remarks: ''
            });
            fetchPublishedResults(currentUser.id);

        } catch (error) {
            console.error("Error publishing result:", error);
            setFeedback({ message: 'Failed to publish result: ' + error.message, type: 'error' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this result?")) return;
        try {
            const { error } = await supabase.from('academic_results').delete().eq('id', id);
            if (error) throw error;
            setFeedback({ message: 'Result deleted.', type: 'success' });
            setResults(results.filter(r => r.id !== id));
        } catch (error) {
            console.error("Error deleting result:", error);
            setFeedback({ message: 'Failed to delete result.', type: 'error' });
        }
    };
    const generatePDF = (shouldDownload = false) => {
        const doc = new jsPDF();
        
        // Add Title
        doc.setFontSize(18);
        doc.text('Academic Results Report', 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Faculty: ${currentUser?.user_metadata?.username || 'Staff'}`, 14, 35);
        
        const tableData = filteredResults.map(res => [
            res.users?.username || 'Unknown',
            res.users?.id_number || 'N/A',
            res.subject,
            `${res.marks_obtained} / ${res.total_marks}`,
            res.grade,
            new Date(res.published_at).toLocaleDateString()
        ]);
        
        autoTable(doc, {
            startY: 45,
            head: [['Student', 'ID Number', 'Subject', 'Marks', 'Grade', 'Date']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [124, 58, 237] },
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
            doc.save(`Academic_Results_${new Date().toISOString().split('T')[0]}.pdf`);
        } else {
            const blob = doc.output('bloburl');
            setPreviewUrl(blob);
            setShowPreview(true);
        }
    };

    // Filter results
    const filteredResults = results.filter(r => 
        (r.users?.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        r.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Academic Results</h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Publish and manage student results.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={() => generatePDF(false)}
                        disabled={filteredResults.length === 0}
                        style={{ 
                            background: 'white', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 20px', 
                            borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: filteredResults.length === 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <Printer size={20} /> Print to PDF
                    </button>
                    <button 
                        onClick={() => setShowForm(true)}
                        style={{ 
                            background: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', 
                            borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)'
                        }}
                    >
                        <Plus size={20} /> Publish Result
                    </button>
                </div>
            </div>

            {feedback.message && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <AlertBanner message={feedback.message} type={feedback.type} onClose={() => setFeedback({ message: '', type: '' })} />
                </div>
            )}

            {/* Search */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Search by student or subject..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }}
                    />
                </div>
            </div>

            {loading ? (
                <p>Loading results...</p>
            ) : (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Student</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Subject</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Marks</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Grade</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Date</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No results found.</td>
                                </tr>
                            ) : (
                                filteredResults.map((res) => (
                                    <tr key={res.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{res.users?.username || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{res.users?.id_number}</div>
                                        </td>
                                        <td style={{ padding: '16px', color: '#334155' }}>{res.subject}</td>
                                        <td style={{ padding: '16px', fontWeight: 600, color: '#1e293b' }}>
                                            {res.marks_obtained} <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ {res.total_marks}</span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ 
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700,
                                                background: ['A+', 'A'].includes(res.grade) ? '#dcfce7' : res.grade === 'F' ? '#fee2e2' : '#f1f5f9',
                                                color: ['A+', 'A'].includes(res.grade) ? '#166534' : res.grade === 'F' ? '#991b1b' : '#475569'
                                            }}>
                                                {res.grade}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', color: '#64748b' }}>{new Date(res.published_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleDelete(res.id)}
                                                style={{ padding: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Form */}
            {showForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginTop: 0 }}>Publish Result</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Student</label>
                                <select 
                                    name="student_id" 
                                    value={formData.student_id} 
                                    onChange={handleInputChange} 
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                                >
                                    <option value="">Select Student</option>
                                    {myStudents.map(student => (
                                        <option key={student.uid} value={student.uid}>
                                            {student.username} ({student.id_number})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Subject / Exam</label>
                                {exams.length > 0 ? (
                                    <select 
                                        name="subject" 
                                        value={formData.subject} 
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })} 
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', marginBottom: '8px' }}
                                    >
                                        <option value="">Select from Schedule (Optional)</option>
                                        {exams.map(exam => (
                                            <option key={exam.id} value={exam.subject}>{exam.subject} ({new Date(exam.exam_date).toLocaleDateString()})</option>
                                        ))}
                                    </select>
                                ) : null}
                                <input 
                                    type="text" 
                                    name="subject" 
                                    placeholder="Or type subject name manually"
                                    value={formData.subject} 
                                    onChange={handleInputChange} 
                                    required 
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Marks Obtained</label>
                                    <input 
                                        type="number" 
                                        name="marks_obtained" 
                                        value={formData.marks_obtained} 
                                        onChange={handleMarksChange} 
                                        required 
                                        min="0"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Total Marks</label>
                                    <input 
                                        type="number" 
                                        name="total_marks" 
                                        value={formData.total_marks} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val < 0) return;
                                            setFormData({ ...formData, total_marks: val });
                                        }} 
                                        required 
                                        min="0"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Grade</label>
                                    <input 
                                        type="text" 
                                        name="grade" 
                                        value={formData.grade} 
                                        onChange={handleInputChange} 
                                        placeholder="Auto-calc"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>Remarks</label>
                                <textarea 
                                    name="remarks" 
                                    value={formData.remarks} 
                                    onChange={handleInputChange} 
                                    rows="3"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                                <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Publish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPreview && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', width: '90%', maxWidth: '800px', height: '90vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>PDF Preview</h3>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button 
                                    onClick={() => generatePDF(true)} 
                                    style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
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
                            title="PDF Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherResults;
