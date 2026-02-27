import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Rectangle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map center updates
const RecenterAutomatically = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
};

const LocationRectangle = ({ position, setPosition, width, height }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    if (!position || !width || !height) return null;

    // Calculate bounds based on center (position) and dims (meters)
    const lat = position.lat;
    const lng = position.lng;
    
    // 1 deg lat ~ 111320m
    // 1 deg lng ~ 111320m * cos(lat)
    const halfH = height / 2;
    const halfW = width / 2;

    const dLat = halfH / 111320;
    // Handle cos(90) or bad lat
    const cosLat = Math.cos(lat * Math.PI / 180);
    const dLng = (Math.abs(cosLat) > 0.0001) ? halfW / (111320 * cosLat) : 0;

    const bounds = [
        [lat - dLat, lng - dLng],
        [lat + dLat, lng + dLng]
    ];
    
    // Check for NaNs
    const isValid = bounds.flat().every(num => Number.isFinite(num));

    if (!isValid) return null;

    // Using Rectangle to visualize. 
    // We add a center marker too just for reference.
    return (
        <>
            <Marker position={position} />
            <Rectangle bounds={bounds} pathOptions={{ color: 'blue', weight: 1, fillOpacity: 0.2 }} />
        </>
    );
};

const LocationPicker = ({ lat, lng, width, height, onChange, onDimsChange, onAltitudeChange }) => {
    const [position, setPosition] = useState(lat && lng ? { lat, lng } : null);
    const [currentLoc, setCurrentLoc] = useState(null);
    
    // Default center (e.g., Campus coordinates or standard fallback)
    const defaultCenter = [10.0, 76.3]; 

    useEffect(() => {
        if (position) {
            onChange({ lat: position.lat, lng: position.lng });
        }
    }, [position]);

    // Sync props to state (important for editing different locations)
    useEffect(() => {
        if (lat && lng) {
             // Only update if significantly different to avoid loop/jitter
             if (!position || Math.abs(position.lat - lat) > 0.0000001 || Math.abs(position.lng - lng) > 0.0000001) {
                 setPosition({ lat, lng });
             }
        }
    }, [lat, lng]);

    const handleLocateMe = (e) => {
        // Prevent map click-through or propagation issues
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude, altitude } = pos.coords;
                    const newPos = { lat: latitude, lng: longitude };
                    setPosition(newPos);
                    setCurrentLoc(newPos);
                    
                    // 1. Try GPS Altitude
                    if (onAltitudeChange && altitude !== null) {
                        onAltitudeChange(altitude);
                    } 
                    // 2. Fallback to Open-Meteo API
                    else if (onAltitudeChange) {
                        try {
                            const response = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`);
                            const data = await response.json();
                            if (data.elevation && data.elevation.length > 0) {
                                onAltitudeChange(data.elevation[0]);
                                console.log("Fetched altitude from API:", data.elevation[0]);
                            }
                        } catch (err) {
                            console.error("Failed to fetch altitude from API:", err);
                        }
                    }
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    alert("Could not access your location. Please ensure permissions are enabled and you are using HTTPS.");
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    return (
        <div style={{ height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
            <MapContainer center={lat && lng ? [lat, lng] : (currentLoc || defaultCenter)} zoom={18} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={22}
                    maxNativeZoom={19}
                />
                <LocationRectangle
                    position={position} 
                    setPosition={setPosition} 
                    width={width || 10}
                    height={height || 10}
                />
                {position && <RecenterAutomatically lat={position.lat} lng={position.lng} />}
            </MapContainer>
            
            {/* Controls Overlay */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                <button 
                    type="button"
                    onClick={handleLocateMe}
                    style={{ 
                        alignSelf: 'flex-end',
                        background: 'white', 
                        border: '2px solid #e2e8f0', 
                        width: '50px', 
                        height: '50px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        color: '#2563eb',
                        marginBottom: '4px' // Separation from inputs
                    }}
                    title="Use Current Location (GPS)"
                >
                    <Crosshair size={28} />
                </button>

                {/* Dimensions & Coords Controls */}
                <div style={{ background: 'rgba(255,255,255,0.95)', padding: '12px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {/* Coordinates Display */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '4px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Latitude</label>
                            <input 
                                type="number" 
                                step="0.000001"
                                value={position?.lat || ''}
                                onChange={(e) => setPosition({ ...position, lat: parseFloat(e.target.value) })}
                                style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Longitude</label>
                            <input 
                                type="number" 
                                step="0.000001"
                                value={position?.lng || ''}
                                onChange={(e) => setPosition({ ...position, lng: parseFloat(e.target.value) })}
                                style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                        </div>
                    </div>

                    {/* Dimensions Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                                Length (m)
                            </label>
                            <input 
                                type="number" 
                                min="2" 
                                value={height} 
                                onChange={(e) => onDimsChange({ width, height: Number(e.target.value) })}
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                                Width (m)
                            </label>
                            <input 
                                type="number" 
                                min="2" 
                                value={width} 
                                onChange={(e) => onDimsChange({ height, width: Number(e.target.value) })}
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationPicker;
