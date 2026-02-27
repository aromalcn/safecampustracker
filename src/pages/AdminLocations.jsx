import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, MapPin, Plus, Edit, Users, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocationPicker from '../components/LocationPicker';
import ErrorBoundary from '../components/ErrorBoundary';

import { supabase } from '../supabase-config';

const AdminLocations = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determine mode based on URL
    const isLiveTracking = location.pathname.includes('/tracking');

    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    
    const [newLocation, setNewLocation] = useState({ 
        name: '', 
        location_details: '',
        latitude: null,
        longitude: null,
        width: 10,
        height: 10,
        altitude: 0
    });

    // Live Tracking State
    const [liveClasses, setLiveClasses] = useState([]);
    const [selectedLiveClass, setSelectedLiveClass] = useState(null);
    const [liveLoading, setLiveLoading] = useState(false);

    useEffect(() => {
        if (isLiveTracking) {
            fetchLiveStatus();
        } else {
            fetchLocations();
        }
    }, [isLiveTracking]);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('campus_locations')
                .select('*')
                .order('name');
                
            if (error) throw error;
            setLocations(data || []);
        } catch (error) {
            console.error("Error fetching locations:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLiveStatus = async () => {
        setLiveLoading(true);
        try {
            // 1. Get Active Classes
            const now = new Date();
            const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
            const timeStr = now.toLocaleTimeString('en-US', { hour12: false }); // HH:MM:SS

            const { data: classes, error: classError } = await supabase
                .from('timetables')
                .select('*')
                .eq('day_of_week', dayName)
                .lte('start_time', timeStr)
                .gte('end_time', timeStr);

            if (classError) throw classError;

            const liveData = [];

            for (const cls of (classes || [])) {
                // 2. Count Total Students (Expected)
                // Normalize department names if needed, similar to StudentDashboard
                let targetDept = cls.department; 
                // (Assuming department in timetables matches users table or simple mapping)
                
                const { count: total, error: userError } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('department', targetDept)
                    .eq('semester', cls.semester)
                    .eq('role', 'student');

                if (userError) console.error("Error fetching user count", userError);

                // 3. Count Present (Inside)
                const today = now.toISOString().split('T')[0];
                const { data: attendance, error: attError } = await supabase
                    .from('attendance')
                    .select('student_id, status, users(username, id_number)') // Join to get student names
                    .eq('class_id', cls.id)
                    .eq('date', today);

                if (attError) console.error("Error fetching attendance", attError);

                const presentCount = (attendance || []).length;
                const activeStudents = attendance || [];
                const activeIds = new Set(activeStudents.map(a => a.student_id));

                // 4. Fetch Missing Students details (Outside)
                const { data: allStudents } = await supabase
                    .from('users')
                    .select('uid, username, id_number')
                    .eq('department', targetDept)
                    .eq('semester', cls.semester)
                    .eq('role', 'student');

                const fullStudentList = (allStudents || []).map(s => {
                    const attRecord = activeStudents.find(a => a.student_id === s.uid);
                    return {
                        ...s,
                        status: attRecord ? 'inside' : 'outside', // Inside if marked, Outside if not
                        attStatus: attRecord?.status || 'absent'
                    };
                });

                liveData.push({
                    ...cls,
                    totalStudents: total || 0,
                    insideCount: presentCount,
                    outsideCount: (total || 0) - presentCount,
                    students: fullStudentList
                });
            }

            setLiveClasses(liveData);

        } catch (error) {
            console.error("Error fetching live status:", error);
        } finally {
            setLiveLoading(false);
        }
    };

    const handleSaveLocation = async (e) => {
        e.preventDefault();
        try {
            let result;
            
            // Clean payload
            const payload = {
                name: newLocation.name,
                location_details: newLocation.location_details,
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
                width: newLocation.width,
                height: newLocation.height,
                altitude: newLocation.altitude
            };

            if (editMode) {
                result = await supabase
                    .from('campus_locations')
                    .update(payload)
                    .eq('id', editingId);
            } else {
                result = await supabase
                    .from('campus_locations')
                    .insert([payload]);
            }

            if (result.error) throw result.error;

            setNewLocation({ name: '', location_details: '', latitude: null, longitude: null, width: 10, height: 10, altitude: 0 });
            setShowForm(false);
            setEditMode(false);
            setEditingId(null);
            fetchLocations(); // Refresh list

        } catch (error) {
            console.error("Error saving location:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleEditClick = (loc) => {
        setNewLocation({
            name: loc.name,
            location_details: loc.location_details,
            latitude: loc.latitude,
            longitude: loc.longitude,
            width: loc.width || 10,
            height: loc.height || 10,
            altitude: loc.altitude || 0
        });
        setEditingId(loc.id);
        setEditMode(true);
        setShowForm(true);
    };

    const handleAddNewClick = () => {
        setNewLocation({ name: '', location_details: '', latitude: null, longitude: null, width: 10, height: 10, altitude: 0 });
        setEditMode(false);
        setEditingId(null);
        setShowForm(true);
    };

    const handleDeleteLocation = async (id) => {
        if (!window.confirm("Delete this location?")) return;
        try {
            const { error } = await supabase
                .from('campus_locations')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            fetchLocations();
        } catch (error) {
            console.error("Error deleting location:", error);
            alert(`Error deleting: ${error.message}`);
        }
    };

    return (
        <ErrorBoundary>
        <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'var(--font-family)' }}>
            
            <main className="container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '0.5rem', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                            {isLiveTracking ? 'Live Tracking' : 'Manage Rooms'}
                        </h1>
                    </div>
                    
                    {!isLiveTracking && (
                        <button 
                            onClick={handleAddNewClick}
                            style={{ 
                                background: '#0f172a', color: 'white', border: 'none', padding: '10px 16px', 
                                borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            <Plus size={18} /> Add Room
                        </button>
                    )}
                </div>

                {!isLiveTracking ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {locations.map(loc => (
                            <div key={loc.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #cbd5e1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1e293b' }}>{loc.name}</h3>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>{loc.location_details}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleEditClick(loc)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteLocation(loc.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                
                                {loc.latitude && loc.longitude ? (
                                    <div style={{ background: '#f0f9ff', padding: '8px', borderRadius: '6px', fontSize: '0.85rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MapPin size={14} /> 
                                        Geofence Active ({loc.width || 10}m x {loc.height || 10}m)
                                    </div>
                                ) : (
                                    <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '6px', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                                        No geofence set
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {liveLoading ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading live status...</div>
                        ) : liveClasses.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#64748b', border: '1px solid #cbd5e1' }}>
                                <Clock size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>No Active Classes</h3>
                                <p>There are no classes currently in session.</p>
                            </div>
                        ) : (
                            liveClasses.map(cls => (
                                <div 
                                    key={cls.id} 
                                    onClick={() => setSelectedLiveClass(cls)}
                                    style={{ 
                                        background: 'white', borderRadius: '16px', padding: '1.5rem', 
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #cbd5e1',
                                        cursor: 'pointer', transition: 'transform 0.2s', position: 'relative'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <span style={{ 
                                            background: '#dbeafe', color: '#1e40af', padding: '4px 10px', 
                                            borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' 
                                        }}>
                                            {cls.department} • Sem {cls.semester}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <span style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%', animation: 'pulse 2s infinite' }}></span>
                                            LIVE
                                        </div>
                                    </div>

                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                                        {cls.class_name}
                                    </h3>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                        <MapPin size={16} /> {cls.details}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534' }}>{cls.insideCount}</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#15803d' }}>INSIDE</div>
                                        </div>
                                        <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b' }}>{cls.outsideCount}</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b91c1c' }}>OUTSIDE</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Modal Form */}
                {showForm && (
                     <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', color: '#1e293b' }}>
                                {editMode ? 'Edit Room' : 'Add Room with Geofence'}
                            </h2>
                            
                            <form onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#475569' }}>Room Name</label>
                                    <input required value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. Lab 1" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#475569' }}>Description / Floor</label>
                                    <input value={newLocation.location_details} onChange={e => setNewLocation({...newLocation, location_details: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g. Main Block, Ground Floor" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#475569' }}>Altitude (Meters)</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        placeholder="Elevation in meters (Auto-filled by GPS if available)"
                                        value={newLocation.altitude || 0} 
                                        onChange={e => setNewLocation({...newLocation, altitude: parseFloat(e.target.value)})} 
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#475569' }}>Pin Location on Map</label>
                                    <LocationPicker 
                                        lat={newLocation.latitude} 
                                        lng={newLocation.longitude} 
                                        width={newLocation.width}
                                        height={newLocation.height}
                                        onChange={(coords) => setNewLocation({...newLocation, latitude: coords.lat, longitude: coords.lng})}
                                        onDimsChange={(dims) => setNewLocation({...newLocation, width: dims.width, height: dims.height})}
                                        onAltitudeChange={(alt) => setNewLocation({...newLocation, altitude: alt})}
                                    />
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Click on map to set center. Adjust dimensions below.</p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                        {editMode ? 'Update Room' : 'Save Room'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Live Class Detail Modal */}
                {selectedLiveClass && (
                     <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', color: '#1e293b' }}>
                                            {selectedLiveClass.class_name}
                                        </h2>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', color: '#64748b' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={14} /> {selectedLiveClass.details}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Users size={14} /> {selectedLiveClass.totalStudents} Students
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedLiveClass(null)}
                                        style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1.2rem' }}
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>

                            <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                            <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>STUDENT</th>
                                            <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>ID</th>
                                            <th style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedLiveClass.students.map(student => (
                                            <tr key={student.uid} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '12px 8px', fontWeight: 600, color: '#334155' }}>
                                                    {student.username}
                                                </td>
                                                <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '0.9rem' }}>
                                                    {student.id_number || '-'}
                                                </td>
                                                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                                    <span style={{ 
                                                        padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                                                        background: student.status === 'inside' ? '#dcfce7' : '#fee2e2',
                                                        color: student.status === 'inside' ? '#166534' : '#991b1b',
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px'
                                                    }}>
                                                        {student.status === 'inside' ? (
                                                            <>IN CLASS</>
                                                        ) : (
                                                            <>OUTSIDE</>
                                                        )}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedLiveClass.students.length === 0 && (
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                                    No students found for this class.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
        </ErrorBoundary>
    );
};

export default AdminLocations;
