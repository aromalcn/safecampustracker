
import React, { useEffect, useState } from 'react';
import { FileText, Trash2, Search, Filter, Printer, Download, X } from 'lucide-react';
import { supabase } from '../supabase-config';
import AlertBanner from '../components/AlertBanner';
import CustomDropdown from '../components/CustomDropdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    
    // PDF Preview States
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [printingStudent, setPrintingStudent] = useState(null);

    const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology'];

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('academic_results')
                .select('*, users:student_id(username, id_number, department, semester, uid)')
                .order('published_at', { ascending: false });

            if (error) throw error;
            setResults(data || []);
        } catch (error) {
            console.error("Error fetching results:", error);
            setFeedback({ message: 'Failed to load results.', type: 'error' });
        } finally {
            setLoading(false);
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

    const handlePrintPreview = async (student) => {
        if (!student || !student.uid) {
            alert("Student information is incomplete.");
            return;
        }

        setPreviewLoading(true);
        setPrintingStudent(student);
        try {
            // Fetch all results for this student
            const { data: studentResults, error } = await supabase
                .from('academic_results')
                .select('*')
                .eq('student_id', student.uid)
                .order('published_at', { ascending: false });

            if (error) throw error;

            if (!studentResults || studentResults.length === 0) {
                alert("No academic records found for this student.");
                return;
            }

            const doc = generateStudentPDF(student, studentResults);
            if (doc) {
                const blobUrl = doc.output('bloburl');
                setPdfUrl(blobUrl);
                setShowPdfPreview(true);
            }
        } catch (error) {
            console.error("Error generating student report:", error);
            alert("Failed to generate preview.");
        } finally {
            setPreviewLoading(false);
        }
    };

    const generateStudentPDF = (student, studentResults) => {
        try {
            const doc = new jsPDF();
            
            // Header
            doc.setFillColor(30, 41, 59); // Dark blue/slate
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.text('ACADEMIC TRANSCRIPT', 105, 20, { align: 'center' });
            
            doc.setFontSize(10);
            doc.text('SafeCampus Tracker System', 105, 30, { align: 'center' });

            // Student Info Section
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Student Information', 14, 55);
            
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 58, 196, 58);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Name: ${student.username || 'N/A'}`, 14, 66);
            doc.text(`ID Number: ${student.id_number || 'N/A'}`, 14, 72);
            doc.text(`Department: ${student.department || 'N/A'}`, 120, 66);
            doc.text(`Semester: ${student.semester || 'N/A'}`, 120, 72);

            // Table
            const tableColumn = ["Subject", "Date Published", "Max Marks", "Marks Obtained", "Grade"];
            const tableRows = studentResults.map(res => [
                res.subject,
                new Date(res.published_at).toLocaleDateString(),
                res.total_marks,
                res.marks_obtained,
                { content: res.grade, styles: { fontStyle: 'bold', halign: 'center' } }
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 85,
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9, cellPadding: 5 },
                columnStyles: {
                    4: { cellWidth: 20 }
                }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 285);
                doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
            }

            return doc;
        } catch (error) {
            console.error("PDF Generation Error:", error);
            return null;
        }
    };

    // Filter Logic
    const filteredResults = results.filter(res => {
        const studentName = res.users?.username?.toLowerCase() || '';
        const studentId = res.users?.id_number?.toLowerCase() || '';
        const subject = res.subject.toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        const matchesSearch = studentName.includes(searchLower) || studentId.includes(searchLower) || subject.includes(searchLower);
        const matchesDept = filterDept === 'All' || (res.users?.department === filterDept);

        return matchesSearch && matchesDept;
    });

    const getGradeColor = (grade) => {
        if (['A+', 'A'].includes(grade)) return '#166534';
        if (['B+', 'B'].includes(grade)) return '#1e40af';
        if (['C+', 'C'].includes(grade)) return '#854d0e';
        if (grade === 'F') return '#991b1b';
        return '#475569';
    };

    const getGradeBg = (grade) => {
        if (['A+', 'A'].includes(grade)) return '#dcfce7'; 
        if (['B+', 'B'].includes(grade)) return '#dbeafe'; 
        if (['C+', 'C'].includes(grade)) return '#fef9c3'; 
        if (grade === 'F') return '#fee2e2'; 
        return '#f1f5f9'; 
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>All Academic Results</h1>
                <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Monitor and manage results across all departments.</p>
            </div>

            {feedback.message && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <AlertBanner message={feedback.message} type={feedback.type} onClose={() => setFeedback({ message: '', type: '' })} />
                </div>
            )}

            {/* Filters */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Search student or subject..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }}
                    />
                </div>
                <div style={{ minWidth: '200px' }}>
                    <CustomDropdown 
                        options={[{ value: 'All', label: 'All Departments' }, ...departments.map(d => ({ value: d, label: d }))]}
                        value={filterDept}
                        onChange={(val) => setFilterDept(val)}
                    />
                </div>
            </div>

            {loading ? (
                <p>Loading results...</p>
            ) : (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Student</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Department</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Subject</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Score</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Grade</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Date</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                        <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                        <p>No results found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredResults.map((res) => (
                                    <tr key={res.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{res.users?.username || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{res.users?.id_number}</div>
                                        </td>
                                        <td style={{ padding: '16px', color: '#64748b' }}>
                                            {res.users?.department} <span style={{ fontSize: '0.8em', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>S{res.users?.semester}</span>
                                        </td>
                                        <td style={{ padding: '16px', color: '#334155', fontWeight: 500 }}>{res.subject}</td>
                                        <td style={{ padding: '16px', fontWeight: 600, color: '#1e293b' }}>
                                            {res.marks_obtained} <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ {res.total_marks}</span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ 
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700,
                                                background: getGradeBg(res.grade),
                                                color: getGradeColor(res.grade)
                                            }}>
                                                {res.grade}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', color: '#64748b' }}>{new Date(res.published_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button 
                                                    onClick={() => handlePrintPreview(res.users)}
                                                    disabled={previewLoading}
                                                    style={{ 
                                                        padding: '8px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', 
                                                        cursor: previewLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
                                                    }}
                                                    title="Print Student Report"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(res.id)}
                                                    style={{ 
                                                        padding: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', 
                                                        cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                    title="Delete Result"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPdfPreview && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '95%', maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Academic Report Preview</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Student: {printingStudent?.username} ({printingStudent?.id_number})</p>
                            </div>
                            <button onClick={() => setShowPdfPreview(false)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, background: '#cbd5e1', padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                            <iframe 
                                src={pdfUrl} 
                                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                                title="Academic Report Preview"
                            ></iframe>
                        </div>
                        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc' }}>
                            <button 
                                onClick={() => setShowPdfPreview(false)}
                                style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = pdfUrl;
                                    link.download = `Academic_Report_${printingStudent?.id_number || 'Student'}.pdf`;
                                    link.click();
                                }}
                                style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                            >
                                <Download size={18} /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminResults;
