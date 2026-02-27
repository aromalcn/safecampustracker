import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, ArrowLeft, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase-config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TeacherAnnouncements = () => {
    const navigate = useNavigate();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            // Fetch announcements targeted at 'all' or 'teacher'
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .in('audience', ['all', 'teacher'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotices(data || []);
        } catch (error) {
            console.error("Error fetching notices:", error);
        } finally {
            setLoading(false);
        }
    };

    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    const generatePDFDoc = () => {
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(18);
        doc.text('Announcements', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ["Date", "Title", "Priority", "Message"];
        const tableRows = notices.map(notice => [
            new Date(notice.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
            notice.title,
            notice.priority.toUpperCase(),
            notice.message
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo header (#4f46e5)
            styles: { fontSize: 10, cellPadding: 4, cellWidth: 'wrap' },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 40 },
                2: { cellWidth: 20 },
                3: { cellWidth: 'auto' }
            }
        });

        return doc;
    };

    const handlePreviewPDF = () => {
        if (notices.length === 0) return;
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
            doc.save('announcements.pdf');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/teacher')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.background = '#f1f5f9'} onMouseLeave={(e) => e.target.style.background = 'none'}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Bell size={32} color="#4f46e5" /> Announcements
                    </h1>
                </div>
                
                <button 
                    onClick={handlePreviewPDF}
                    disabled={notices.length === 0}
                    style={{ 
                        background: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px', 
                        borderRadius: '8px', fontWeight: 600, cursor: notices.length === 0 ? 'not-allowed' : 'pointer', 
                        display: 'flex', alignItems: 'center', gap: '8px', opacity: notices.length === 0 ? 0.7 : 1
                    }}
                >
                    <FileDown size={18} /> Print to PDF
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading...</div>
            ) : notices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ background: '#f8fafc', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Bell size={32} color="#cbd5e1" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>No New Notices</h2>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>Check back later for staff updates and campus-wide announcements.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {notices.map(notice => (
                        <div key={notice.id} style={{ 
                            background: 'white', 
                            padding: '1.5rem', 
                            borderRadius: '20px', 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            border: '1px solid #e2e8f0',
                            borderLeft: `6px solid ${notice.priority === 'emergency' ? '#ef4444' : notice.priority === 'high' ? '#f59e0b' : '#3b82f6'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {notice.priority === 'emergency' && <AlertTriangle size={20} color="#ef4444" />}
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: 700 }}>{notice.title}</h2>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
                                    {new Date(notice.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            
                            <p style={{ margin: 0, lineHeight: '1.6', color: '#475569', fontSize: '1rem' }}>
                                {notice.message}
                            </p>

                            {notice.priority !== 'normal' && (
                                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '8px' }}>
                                    <span style={{ 
                                        fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', 
                                        color: notice.priority === 'emergency' ? '#b91c1c' : '#92400e',
                                        background: notice.priority === 'emergency' ? '#fee2e2' : '#fef3c7',
                                        padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px'
                                    }}>
                                        {notice.priority} PRIORITY
                                    </span>
                                </div>
                            )}
                        </div>
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
        </div>
    );
};

export default TeacherAnnouncements;
