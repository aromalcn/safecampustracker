
import React, { useEffect, useState } from 'react';
import { FileText, Trophy, AlertCircle, Users } from 'lucide-react';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';
import AlertBanner from '../components/AlertBanner';

const ParentResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    useEffect(() => {
        fetchLinkedStudents();
    }, []);

    useEffect(() => {
        if (selectedStudentId) {
            fetchResults(selectedStudentId);
        }
    }, [selectedStudentId]);

    const fetchLinkedStudents = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            // Fetch linked students
            const { data: links } = await supabase
                .from('parent_student_links')
                .select('student_id')
                .eq('parent_id', user.id);

            if (links && links.length > 0) {
                const studentIds = links.map(l => l.student_id);
                const { data: studentProfiles } = await supabase
                    .from('users')
                    .select('uid, username, id_number')
                    .in('uid', studentIds);
                
                setStudents(studentProfiles || []);
                if (studentProfiles && studentProfiles.length > 0) {
                    setSelectedStudentId(studentProfiles[0].uid);
                } else {
                    setLoading(false); // No students found profile-wise
                }
            } else {
                setLoading(false); // No links found
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            setError("Failed to load students.");
            setLoading(false);
        }
    };

    const fetchResults = async (studentId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('academic_results')
                .select('*')
                .eq('student_id', studentId)
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
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Academic Reports</h1>
                <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>View academic progress and exam scores.</p>
            </div>

            {/* Student Selector if multiple */}
            {students.length > 1 && (
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Select Child:</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {students.map(s => (
                            <button 
                                key={s.uid}
                                onClick={() => setSelectedStudentId(s.uid)}
                                style={{ 
                                    padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer',
                                    background: selectedStudentId === s.uid ? '#e0f2fe' : 'white',
                                    color: selectedStudentId === s.uid ? '#0284c7' : '#64748b',
                                    fontWeight: selectedStudentId === s.uid ? 600 : 400,
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <Users size={16} />
                                {s.username}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && <AlertBanner message={error} type="error" onClose={() => setError(null)} />}

            {loading ? (
                <p>Loading results...</p>
            ) : (
                <>
                    {students.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <p style={{ color: '#64748b' }}>No students linked to your account.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {results.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    <Trophy size={48} color="#94a3b8" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                    <p style={{ color: '#64748b' }}>No results published for this student yet.</p>
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
                </>
            )}
        </div>
    );
};

export default ParentResults;
