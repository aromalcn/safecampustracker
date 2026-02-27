
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Filter, FileDown } from 'lucide-react';
import { supabase } from '../supabase-config';
import CustomDropdown from '../components/CustomDropdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('attendance');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState([]);

    const generateReport = async () => {
        setLoading(true);
        setData([]);
        try {
            let result = [];
            
            if (reportType === 'attendance') {
                // 1. Fetch Attendance
                const { data: attendanceData, error: attendanceError } = await supabase
                    .from('attendance')
                    .select('*')
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: false });

                if (attendanceError) throw attendanceError;

                if (attendanceData && attendanceData.length > 0) {
                    // 2. Fetch Users for these records
                    const studentIds = [...new Set(attendanceData.map(a => a.student_id))];
                    const classIds = [...new Set(attendanceData.map(a => a.class_id).filter(id => id))];
                    
                    const { data: usersData, error: usersError } = await supabase
                        .from('users')
                        .select('uid, username, department')
                        .in('uid', studentIds);

                    if (usersError) throw usersError;

                    // 3. Fetch Timetable info for Class Names & Teachers
                    let timetablesData = [];
                    if (classIds.length > 0) {
                        const { data: ttData, error: ttError } = await supabase
                            .from('timetables')
                            .select('id, class_name, teacher_name')
                            .in('id', classIds);
                        
                        if (ttError) throw ttError;
                        timetablesData = ttData || [];
                    }

                    // 4. Map Joins
                    const userMap = {};
                    usersData?.forEach(u => {
                        userMap[u.uid] = u;
                    });

                    const classMap = {};
                    timetablesData?.forEach(tt => {
                        classMap[tt.id] = tt;
                    });

                    result = attendanceData.map(item => ({
                        ...item,
                        users: userMap[item.student_id] || { username: 'Unknown', department: 'N/A' },
                        class_info: classMap[item.class_id] || { class_name: 'Unknown Subject', teacher_name: 'Unknown Teacher' }
                    }));
                }
            } else if (reportType === 'alerts') {
                const { data: alertsData, error: alertsError } = await supabase
                    .from('alerts')
                    .select('*')
                    .gte('created_at', `${startDate}T00:00:00`)
                    .lte('created_at', `${endDate}T23:59:59`)
                    .order('created_at', { ascending: false });

                if (alertsError) throw alertsError;
                result = alertsData || [];
            }

            setData(result);
        } catch (error) {
            console.error("Error fetching report:", error);
            alert("Failed to generate report: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        if (data.length === 0) return;

        let headers = [];
        let rows = [];

        if (reportType === 'attendance') {
            headers = ['Date', 'Student Name', 'Department', 'Status', 'Subject', 'Teacher'];
            rows = data.map(item => [
                item.date,
                item.users?.username || 'Unknown',
                item.users?.department || 'N/A',
                item.status,
                item.class_info?.class_name || 'N/A',
                item.class_info?.teacher_name || 'N/A'
            ]);
        } else {
            headers = ['Date/Time', 'Type', 'Description', 'Student ID', 'Status'];
            rows = data.map(item => [
                new Date(item.created_at).toLocaleString(),
                item.type,
                item.description,
                item.student_id,
                item.status
            ]);
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${reportType}_report_${startDate}_to_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generatePDFDoc = () => {
        try {
            const doc = new jsPDF();

            // Title and Header
            doc.setFontSize(18);
            doc.text('SafeCampus Tracker Report', 14, 22);
            
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Type: ${reportType === 'attendance' ? 'Attendance Report' : 'Alerts & Incidents'}`, 14, 32);
            doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 38);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 44);

            let tableColumn = [];
            let tableRows = [];

            if (reportType === 'attendance') {
                tableColumn = ["Date", "Student", "Dept", "Status", "Subject", "Teacher"];
                tableRows = data.map(item => [
                    item.date,
                    item.users?.username || 'Unknown',
                    item.users?.department || '-',
                    item.status.toUpperCase(),
                    item.class_info?.class_name || '-',
                    item.class_info?.teacher_name || '-'
                ]);
            } else {
                tableColumn = ["Date/Time", "Type", "Description", "Student ID", "Status"];
                tableRows = data.map(item => [
                    new Date(item.created_at).toLocaleString(),
                    item.type,
                    item.description,
                    item.student_id,
                    item.status
                ]);
            }

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 50,
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235] },
                styles: { fontSize: 9, cellPadding: 3 },
            });

            return doc;
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
            return null;
        }
    };

    const downloadPDF = () => {
        if (data.length === 0) return;
        const doc = generatePDFDoc();
        if (doc) {
            doc.save(`${reportType}_report_${startDate}_to_${endDate}.pdf`);
        }
    };

    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    const handlePreviewPDF = () => {
        if (data.length === 0) return;
        const doc = generatePDFDoc();
        if (doc) {
            const blobUrl = doc.output('bloburl');
            setPdfUrl(blobUrl);
            setShowPdfPreview(true);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'var(--font-family)' }}>
            
            <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                    <button 
                        onClick={() => {
                            if (window.location.pathname.includes('/teacher')) {
                                navigate('/teacher');
                            } else {
                                navigate('/admin');
                            }
                        }} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '1rem', display: 'flex', alignItems: 'center', color: '#64748b' }}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Reports & Analytics</h1>
                </div>

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div className="flex-col-mobile" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Report Type</label>
                            <CustomDropdown 
                                options={[
                                    { value: 'attendance', label: 'Attendance Report' },
                                    { value: 'alerts', label: 'Alerts & Incidents' }
                                ]}
                                value={reportType}
                                onChange={setReportType}
                                placeholder="Select Type"
                            />
                        </div>
                        
                        <div className="full-width-mobile" style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Start Date</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', background: 'white' }}
                            />
                        </div>

                        <div className="full-width-mobile" style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>End Date</label>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', background: 'white' }}
                            />
                        </div>

                        <button 
                            className="full-width-mobile"
                            onClick={generateReport}
                            disabled={loading}
                            style={{ 
                                background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', 
                                borderRadius: '8px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                height: '46px'
                            }}
                        >
                            {loading ? 'Processing...' : (
                                <>
                                    <Filter size={18} /> Generate
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {data.length > 0 && (
                    <div style={{ animation: 'fadeIn 0.5s ease' }}>
                        <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#334155', fontSize: '1.1rem' }}>
                                Found {data.length} records
                            </h3>
                            <div className="full-width-mobile" style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    className="full-width-mobile"
                                    onClick={downloadCSV}
                                    style={{ 
                                        flex: 1, background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', padding: '10px', 
                                        borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <Download size={18} /> CSV
                                </button>
                                <button 
                                    className="full-width-mobile"
                                    onClick={handlePreviewPDF}
                                    style={{ 
                                        flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', 
                                        borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <FileDown size={18} /> PDF
                                </button>
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="table-responsive">
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        {reportType === 'attendance' ? (
                                            <>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Date</th>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Student</th>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Department</th>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Status</th>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Subject</th>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Teacher</th>
                                            </>
                                        ) : (
                                            <>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Time</th>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Type</th>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Description</th>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Student</th>
                                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Status</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, index) => (
                                        <tr key={item.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            {reportType === 'attendance' ? (
                                                <>
                                                    <td style={{ padding: '16px', color: '#1e293b' }}>{new Date(item.date).toLocaleDateString()}</td>
                                                    <td style={{ padding: '16px', color: '#1e293b', fontWeight: 500 }}>{item.users?.username || 'Unknown'}</td>
                                                    <td style={{ padding: '16px', color: '#64748b' }}>{item.users?.department || '-'}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={{ 
                                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600,
                                                            background: item.status === 'present' ? '#dcfce7' : '#fee2e2',
                                                            color: item.status === 'present' ? '#166534' : '#991b1b'
                                                        }}>
                                                            {item.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px', color: '#475569' }}>{item.class_info?.class_name || '-'}</td>
                                                    <td style={{ padding: '16px', color: '#475569' }}>{item.class_info?.teacher_name || '-'}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ padding: '16px', color: '#64748b' }}>{new Date(item.created_at).toLocaleString()}</td>
                                                    <td style={{ padding: '16px', color: '#1e293b' }}>{item.type}</td>
                                                    <td style={{ padding: '16px', color: '#475569' }}>{item.description}</td>
                                                    <td style={{ padding: '16px', color: '#475569' }}>{item.student_id ? `ID: ${item.student_id}` : 'N/A'}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={{ 
                                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600,
                                                            background: item.status === 'resolved' ? '#dcfce7' : '#fef9c3',
                                                            color: item.status === 'resolved' ? '#166534' : '#854d0e'
                                                        }}>
                                                            {item.status || 'Active'}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {data.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                        <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>Select criteria and generate a report to view data.</p>
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
                                    <Download size={18} /> Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Reports;
