
import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth-service';
import { supabase } from '../supabase-config';

const StudentTimetable = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [studentProfile, setStudentProfile] = useState(null);
    const [timetable, setTimetable] = useState([]);
    const [filterDay, setFilterDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    useEffect(() => {
        const init = async () => {
             const user = await getCurrentUser();
             if (!user) {
                 navigate('/login');
                 return;
             }
             
             // Fetch Profile
             const { data: profile } = await supabase
                .from('users')
                .select('username, email, department, semester')
                .eq('uid', user.id)
                .single();

             if (profile) {
                 setStudentProfile(profile);
             }
        };
        init();
    }, [navigate]);

    useEffect(() => {
        if (studentProfile) {
            fetchTimetable();
        }
    }, [studentProfile]);

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            console.log("Fetching schedule for:", studentProfile);

            // DEBUGGING: Fetch all for this semester to see available departments
            const { data, error } = await supabase
                .from('timetables')
                .select('*')
                .eq('semester', studentProfile.semester || 1); // Default to 1 if missing

            if (error) throw error;
            
            console.log("ALL Timetable Entries for Sem " + studentProfile.semester);
            // Log unique departments found
            const uniqueDepts = [...new Set(data?.map(t => t.department))];
            console.log("found departments:", uniqueDepts);
            
            // Re-apply filter in JS to catch "Computer Science" vs "CSE"
            const myTimetable = data.filter(t => {
                const target = studentProfile.department.toLowerCase();
                const source = (t.department || '').toLowerCase();
                return source.includes(target) || 
                       target.includes(source) || 
                       (target.includes('computer') && source.includes('cse')) ||
                       (target.includes('cse') && source.includes('computer'));
            });

            console.log("Filtered Matches:", myTimetable.length);
            setTimetable(myTimetable.sort((a,b) => a.start_time.localeCompare(b.start_time)));

        } catch (error) {
            console.error("Error fetching schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    // Group by Day (Logic from AdminTimetable)
    const groupedTimetable = days.reduce((acc, day) => {
        acc[day] = timetable.filter(t => t.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
        return acc;
    }, {});

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'var(--font-family)', paddingBottom: '80px' }}>
            <style>{`
                @media (max-width: 768px) {
                    .mobile-stack {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        width: 100% !important;
                    }
                }
            `}</style>
            
            <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#1e293b' }}>My Timetable</h1>
                    {studentProfile && (
                        <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>
                            <span style={{ fontWeight: 600, color: '#2563eb' }}>{studentProfile.department}</span> • Semester {studentProfile.semester}
                        </p>
                    )}
                </header>

                {loading && <p style={{ color: '#64748b' }}>Loading schedule...</p>}
                
                {/* Day Tabs */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '1rem 1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '2rem', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #f1f5f9', minWidth: 'max-content' }}>
                        {days.map(day => {
                            const isActive = filterDay === day;
                            return (
                                <button
                                    key={day}
                                    onClick={() => setFilterDay(day)}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                                        color: isActive ? '#2563eb' : '#64748b',
                                        fontWeight: isActive ? 700 : 500,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        marginBottom: '-2px',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Single Day View */}
                <div>
                    {days
                        .filter(day => day === filterDay) 
                        .map(day => {
                            const daysClasses = groupedTimetable[day] || [];
                            return (
                                <div key={day} style={{ animation: 'fadeIn 0.3s ease' }}>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                        {daysClasses.length === 0 ? (
                                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                                <Calendar size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                                <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>No classes scheduled for {day}</p>
                                            </div>
                                        ) : (
                                            daysClasses.map((item) => (
                                                <div key={item.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
                                                     onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                                                     onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0,0,0,0.05)'; }}
                                                >
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>
                                                        <Clock size={14} />
                                                        {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                                                    </div>
                                                    
                                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>{item.class_name}</h4>
                                                    
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#475569' }}>
                                                            <User size={16} color="#94a3b8" /> 
                                                            <span style={{ fontWeight: 500 }}>{item.teacher_name}</span>
                                                        </div>
                                                        {item.details && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#475569' }}>
                                                                <MapPin size={16} color="#94a3b8" />
                                                                <span>{item.details}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </main>
        </div>
    );
};

export default StudentTimetable;
