
import React, { useEffect, useState } from 'react';
import { FileText, Trophy, AlertCircle, Printer, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';
import AlertBanner from '../components/AlertBanner';

const StudentResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        const init = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            if (currentUser) {
                fetchResults(currentUser.id);
            }
        };
        init();
    }, []);

    const fetchResults = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('academic_results')
                .select('*')
                .eq('student_id', userId)
                .order('published_at', { ascending: false });

            if (error) throw error;
            setResults(data || []);
        } catch (error) {
            console.error("Error fetching results:", error);
            setError("Failed to load results.");
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (grade) => {
        if (['A+', 'A'].includes(grade)) return '#166534'; // Green
        if (['B+', 'B'].includes(grade)) return '#1e40af'; // Blue
        if (['C+', 'C'].includes(grade)) return '#854d0e'; // Yellow/Brown
        if (grade === 'F') return '#991b1b'; // Red
        return '#475569'; // Slate
    };

    const getGradeBg = (grade) => {
        if (['A+', 'A'].includes(grade)) return '#dcfce7'; 
        if (['B+', 'B'].includes(grade)) return '#dbeafe'; 
        if (['C+', 'C'].includes(grade)) return '#fef9c3'; 
        if (grade === 'F') return '#fee2e2'; 
        return '#f1f5f9'; 
    };

    const generatePDF = (shouldDownload = false) => {
        const doc = new jsPDF();
        
        // Add Title
        doc.setFontSize(18);
        doc.text('Academic Results Report', 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Student: ${user?.user_metadata?.username || 'Student'}`, 14, 35);
        
        const tableData = results.map(res => [
            res.subject,
            new Date(res.published_at).toLocaleDateString(),
            `${res.marks_obtained} / ${res.total_marks}`,
            res.grade,
            res.remarks || '-'
        ]);
        
        autoTable(doc, {
            startY: 45,
            head: [['Subject', 'Date Published', 'Marks', 'Grade', 'Remarks']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            margin: { top: 40 },
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

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>My Academic Results</h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>View your exams scores and grades.</p>
                </div>
                {results.length > 0 && (
                    <button 
                        onClick={() => generatePDF(false)}
                        style={{ 
                            background: 'white', 
                            color: '#475569', 
                            border: '1px solid #e2e8f0', 
                            padding: '10px 20px', 
                            borderRadius: '12px', 
                            fontWeight: 600, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <Printer size={20} /> Print to PDF
                    </button>
                )}
            </div>

            {error && <AlertBanner message={error} type="error" onClose={() => setError(null)} />}

            {loading ? (
                <p>Loading your results...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {results.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <FileText size={48} color="#94a3b8" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p style={{ color: '#64748b' }}>No academic results published yet.</p>
                        </div>
                    ) : (
                        results.map(res => (
                            <div key={res.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>{res.subject}</h3>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{new Date(res.published_at).toLocaleDateString()}</span>
                                </div>
                                <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' }}>Marks Obtained</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                                            {res.marks_obtained} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 400 }}>/ {res.total_marks}</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' }}>Grade</div>
                                        <div style={{ 
                                            fontSize: '1.25rem', fontWeight: 800, 
                                            color: getGradeColor(res.grade),
                                            background: getGradeBg(res.grade),
                                            width: '48px', height: '48px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {res.grade}
                                        </div>
                                    </div>
                                </div>
                                {res.remarks && (
                                    <div style={{ padding: '0 1.5rem 1.5rem', fontSize: '0.95rem', color: '#475569', fontStyle: 'italic' }}>
                                        "{res.remarks}"
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPreview && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', width: '90%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Results Report Preview</h3>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    onClick={() => generatePDF(true)} 
                                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Download
                                </button>
                                <button 
                                    onClick={() => { setShowPreview(false); setPreviewUrl(null); }} 
                                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <iframe 
                            src={previewUrl} 
                            style={{ width: '100%', flex: 1, border: '1px solid #e2e8f0', borderRadius: '16px' }} 
                            title="Academic Results PDF Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentResults;
