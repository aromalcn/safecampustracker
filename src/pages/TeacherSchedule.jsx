
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';
import { Calendar, Clock, BookOpen, MapPin, ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TeacherSchedule = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [teacher, setTeacher] = useState(null);
    const [schedule, setSchedule] = useState({}); // { Monday: [classes], Tuesday: ... }
    const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        checkUser();
    }, []);

    useEffect(() => {
        if (teacher) fetchWeeklySchedule();
    }, [teacher]);

    const checkUser = async () => {
        const user = await getCurrentUser();
        if (user) {
            // Fetch Profile to get 'username' (e.g. Teacher1)
            const { data: profile } = await supabase
                .from('users')
                .select('username, email')
                .eq('uid', user.id)
                .single();

            if (profile) {
                setTeacher({ ...user, username: profile.username });
            } else {
                setTeacher(user);
            }
        } else {
            navigate('/login');
        }
    };

    const fetchWeeklySchedule = async () => {
        setLoading(true);
        try {
            // Fetch ALL classes for this teacher
            const { data, error } = await supabase
                .from('timetables')
                .select('*')
                .ilike('teacher_name', teacher.username) // Case-insensitive
                .order('start_time');

            if (error) throw error;

            // Group by Day
            const grouped = days.reduce((acc, day) => {
                acc[day] = (data || []).filter(item => item.day_of_week === day);
                return acc;
            }, {});

            setSchedule(grouped);

        } catch (error) {
            console.error("Error fetching schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-family)', padding: '2rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '2rem' }}>My Schedule</h1>

                {/* Day Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                    {days.map(day => (
                        <button
                            key={day}
                            onClick={() => setActiveDay(day)}
                            style={{
                                padding: '10px 20px',
                                background: activeDay === day ? '#2563eb' : 'white',
                                color: activeDay === day ? 'white' : '#64748b',
                                border: '1px solid #e2e8f0',
                                borderRadius: '20px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                boxShadow: activeDay === day ? '0 4px 6px -1px rgba(37, 99, 235, 0.2)' : 'none'
                            }}
                        >
                            {day}
                        </button>
                    ))}
                </div>

                {/* Schedule List */}
                {loading ? (
                    <p style={{ color: '#64748b' }}>Loading schedule...</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {schedule[activeDay]?.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                                <Calendar size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>No classes on {activeDay}.</p>
                            </div>
                        ) : (
                            schedule[activeDay]?.map(cls => (
                                <div key={cls.id} style={{ background: 'white', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#3b82f6' }} />
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            <Clock size={12} />
                                            {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}
                                        </div>
                                    </div>

                                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#0f172a' }}>{cls.class_name || cls.subject}</h3>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <BookOpen size={14} />
                                            <span>{cls.department}</span>
                                        </div>
                                        {cls.details && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={14} />
                                                <span>{cls.details}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherSchedule;
