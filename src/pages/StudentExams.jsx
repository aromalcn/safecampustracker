
import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, FileText } from 'lucide-react';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';
import { useNavigate } from 'react-router-dom';

const StudentExams = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentProfile, setStudentProfile] = useState(null);

    useEffect(() => {
        fetchUserAndExams();
    }, []);

    const fetchUserAndExams = async () => {
        const user = await getCurrentUser();
        if (!user) {
            navigate('/login');
            return;
        }

        // Fetch Profile
        const { data: profile } = await supabase
            .from('users')
            .select('department, semester')
            .eq('uid', user.id)
            .single();

        if (profile) {
            setStudentProfile(profile);
            fetchExams(profile);
        } else {
            console.error("Student profile not found");
            setLoading(false);
        }
    };

    const fetchExams = async (profile) => {
        setLoading(true);
        try {
            console.log("Fetching exams for:", profile);

            // Fetch all exams for the semester to allow JS filtering for department aliases
            const { data, error } = await supabase
                .from('exam_schedules')
                .select('*')
                .eq('semester', profile.semester)
                .order('exam_date', { ascending: true });

            if (error) throw error;
            
            // Filter by department (smart matching)
            const myExams = (data || []).filter(exam => {
                const target = profile.department.toLowerCase();
                const source = (exam.department || '').toLowerCase();
                return source.includes(target) || 
                       target.includes(source) || 
                       (target.includes('computer') && source.includes('cse')) ||
                       (target.includes('cse') && source.includes('computer'));
            });

            setExams(myExams);

        } catch (error) {
            console.error("Error fetching exams:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-family)', paddingBottom: '80px' }}>
             <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#1e293b' }}>Exam Schedule</h1>
                {studentProfile && (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>
                        <span style={{ fontWeight: 600, color: '#2563eb' }}>{studentProfile.department}</span> • Semester {studentProfile.semester}
                    </p>
                )}
            </header>

            {loading ? (
                <p>Loading exams...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {exams.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <FileText size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                            <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>No exams scheduled for you yet.</p>
                        </div>
                    ) : (
                        exams.map(exam => (
                            <div key={exam.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative', transition: 'transform 0.2s', cursor: 'default' }}
                                 onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                 onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: '#7c3aed', borderRadius: '4px 0 0 4px' }}></div>
                                
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#1e293b', paddingLeft: '1rem' }}>{exam.subject}</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#475569', fontSize: '0.95rem', paddingLeft: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Calendar size={18} color="#7c3aed" />
                                        <span style={{ fontWeight: 600, color: '#334155' }}>
                                            {new Date(exam.exam_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Clock size={18} color="#7c3aed" />
                                        <span>{exam.start_time.slice(0, 5)} - {exam.end_time.slice(0, 5)}</span>
                                    </div>
                                    {exam.room && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <MapPin size={18} color="#7c3aed" />
                                            <span>{exam.room}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentExams;
