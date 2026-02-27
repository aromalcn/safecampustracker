
import React, { useEffect, useState } from 'react';
import { FileText, Trash2, Search, Filter } from 'lucide-react';
import { supabase } from '../supabase-config';
import AlertBanner from '../components/AlertBanner';
import CustomDropdown from '../components/CustomDropdown';

const AdminResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology'];

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('academic_results')
                .select('*, users:student_id(username, id_number, department, semester)')
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
                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
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
                                            <button 
                                                onClick={() => handleDelete(res.id)}
                                                style={{ padding: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                                title="Delete Result"
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
        </div>
    );
};

export default AdminResults;
