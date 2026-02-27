import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase-config';
import { MapPin, Navigation, ArrowLeft, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MapViewer from '../components/MapViewer';

const Rooms = () => {
    const navigate = useNavigate();
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Map View State
    const [viewingLocation, setViewingLocation] = useState(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
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

    const filteredLocations = locations.filter(loc => 
        loc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (loc.location_details || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-family)', padding: '2rem' }}>
            {/* Header */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '2rem' }}>
                <button 
                    onClick={() => navigate(-1)} 
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        marginBottom: '1rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        color: '#64748b',
                        fontWeight: 600
                    }}
                >
                    <ArrowLeft size={20} /> Back
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>Campus Rooms</h1>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Explore all classrooms and facilities across campus</p>
                    </div>
                    
                    {/* Search Bar */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                        <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text" 
                            placeholder="Search rooms..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '12px 12px 12px 40px', 
                                borderRadius: '12px', 
                                border: '1px solid #cbd5e1', 
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {loading ? (
                    <p>Loading rooms...</p>
                ) : filteredLocations.length > 0 ? (
                    filteredLocations.map(loc => (
                        <div key={loc.id} style={{ 
                            background: 'white', 
                            borderRadius: '16px', 
                            padding: '1.5rem', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
                            border: '1px solid #e2e8f0',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                        }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                    <MapPin size={24} />
                                </div>
                                {loc.latitude && loc.longitude && (
                                    <div style={{ padding: '6px 10px', background: '#f0fdf4', color: '#16a34a', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Navigation size={12} />
                                        MAPPED
                                    </div>
                                )}
                            </div>
                            
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{loc.name}</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                {loc.location_details || 'No additional details available'}
                            </p>
                            
                            {loc.altitude !== null && loc.altitude !== undefined && (
                                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>Elevation: {loc.altitude}m</span>
                                </p>
                            )}

                            {/* View Map Action */}
                            {loc.latitude && loc.longitude && (
                                <button 
                                    onClick={() => setViewingLocation(loc)}
                                    style={{ 
                                        width: '100%', 
                                        marginTop: '1.5rem', 
                                        padding: '10px', 
                                        borderRadius: '8px', 
                                        border: '1px solid #bfdbfe', 
                                        background: '#eff6ff', 
                                        color: '#3b82f6', 
                                        fontWeight: 600, 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = '#dbeafe'}
                                    onMouseOut={(e) => e.target.style.background = '#eff6ff'}
                                >
                                    <MapPin size={16} /> View on Map
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        <p>No rooms found matching "{searchTerm}"</p>
                    </div>
                )}
            </div>

            {/* Map Viewer Modal */}
            {viewingLocation && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', width: '90%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{viewingLocation.name}</h2>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>{viewingLocation.location_details}</p>
                            </div>
                            <button onClick={() => setViewingLocation(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                            <MapViewer lat={viewingLocation.latitude} lng={viewingLocation.longitude} width={viewingLocation.width} height={viewingLocation.height} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Rooms;
