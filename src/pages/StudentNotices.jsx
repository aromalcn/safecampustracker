import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Printer, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase-config';

const StudentNotices = () => {
    const [notices, setNotices] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // all, personal, campus
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            // 1. Fetch Personal Notifications
            const { data: notifs } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
            
            setNotifications(notifs || []);

            // 2. Fetch Campus Announcements
            const { data: anns } = await supabase
                .from('announcements')
                .select('*')
                .in('audience', ['all', 'student'])
                .order('created_at', { ascending: false });

            setNotices(anns || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = (shouldDownload = false) => {
        const doc = new jsPDF();
        
        // Add Title
        doc.setFontSize(18);
        doc.text('Notices & Notifications Report', 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Student: ${user?.email || 'Student'}`, 14, 35);
        
        const tableData = displayedList.map(item => [
            new Date(item.created_at).toLocaleDateString(),
            item.title,
            item.source === 'campus' ? `Campus (${item.priority})` : 'Personal',
            item.message
        ]);
        
        autoTable(doc, {
            startY: 45,
            head: [['Date', 'Title', 'Category', 'Message']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // Blue
            columnStyles: {
                3: { cellWidth: 80 } // Give more space to message
            },
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
            doc.save(`Notices_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } else {
            const blob = doc.output('bloburl');
            setPreviewUrl(blob);
            setShowPreview(true);
        }
    };

    const combinedList = [
        ...notifications.map(n => ({ ...n, source: 'personal' })),
        ...notices.map(n => ({ ...n, source: 'campus', priority: n.priority || 'normal' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const displayedList = activeTab === 'all' ? combinedList 
        : activeTab === 'personal' ? combinedList.filter(i => i.source === 'personal')
        : combinedList.filter(i => i.source === 'campus');

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Bell size={32} color="#3b82f6" /> Notifications & Notices
                </h1>
                {displayedList.length > 0 && (
                    <button 
                        onClick={() => generatePDF(false)}
                        style={{ 
                            background: 'white', 
                            color: '#475569', 
                            border: '1px solid #e2e8f0', 
                            padding: '10px 18px', 
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
                        <Printer size={18} /> Print to PDF
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0' }}>
                {['all', 'personal', 'campus'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                            color: activeTab === tab ? '#3b82f6' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading...</div>
            ) : displayedList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '16px', color: '#94a3b8' }}>
                    <Bell size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p style={{ fontSize: '1.1rem' }}>No notifications found.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {displayedList.map(item => (
                        <div key={item.id} style={{ 
                            background: 'white', 
                            padding: '1.5rem', 
                            borderRadius: '16px', 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            borderLeft: item.source === 'campus' 
                                ? `6px solid ${item.priority === 'emergency' ? '#ef4444' : item.priority === 'high' ? '#f59e0b' : '#3b82f6'}`
                                : `6px solid #8b5cf6` // Purple for personal
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {item.priority === 'emergency' && <AlertTriangle size={20} color="#ef4444" />}
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{item.title}</h2>
                                    {item.source === 'personal' && <span style={{ fontSize: '0.7rem', background: '#f5f3ff', color: '#8b5cf6', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>PERSONAL</span>}
                                </div>
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            
                            <p style={{ margin: 0, lineHeight: '1.6', color: '#475569', fontSize: '1rem' }}>
                                {item.message}
                            </p>

                            {item.source === 'campus' && item.priority !== 'normal' && (
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                                    <span style={{ 
                                        fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', 
                                        color: item.priority === 'emergency' ? '#991b1b' : '#92400e',
                                        background: item.priority === 'emergency' ? '#fee2e2' : '#fef3c7',
                                        padding: '4px 8px', borderRadius: '4px'
                                    }}>
                                        {item.priority} Priority
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPreview && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '24px', width: '90%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Notice Report Preview</h3>
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
                            title="Notices PDF Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentNotices;
