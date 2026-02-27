import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Crosshair, Navigation } from 'lucide-react';

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

// Component to handle user location updates and bounds fitting
const UserLocationMarker = ({ userLocation, targetLocation }) => {
    const map = useMap();
    
    useEffect(() => {
        if (userLocation && targetLocation) {
            // Create bounds that include both points
            const bounds = L.latLngBounds([
                [userLocation.lat, userLocation.lng],
                [targetLocation.lat, targetLocation.lng]
            ]);
            // Fit map to these bounds with some padding
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (userLocation) {
            // If only user location is known (fallback), fly to it
            map.flyTo([userLocation.lat, userLocation.lng], map.getZoom());
        }
    }, [userLocation, targetLocation, map]);

    if (!userLocation) return null;

    // Red marker for user location
    const userIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    return <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />;
};

const getBounds = (lat, lng, width, height) => {
    if (!width || !height) return null;
    
    // 1 deg lat ~ 111320m
    const halfH = height / 2;
    const halfW = width / 2;

    const dLat = halfH / 111320;
    const cosLat = Math.cos(lat * Math.PI / 180);
    const dLng = (Math.abs(cosLat) > 0.0001) ? halfW / (111320 * cosLat) : 0;

    return [
        [lat - dLat, lng - dLng],
        [lat + dLat, lng + dLng]
    ];
};

const MapViewer = ({ lat, lng, width, height }) => {
    const [userLocation, setUserLocation] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(false);

    if (!lat || !lng) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Location coordinates not available.</div>;

    const bounds = getBounds(lat, lng, width, height);

    const handleLocateMe = () => {
        setLoadingLocation(true);
        if (navigator.geolocation) {
             navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                    setLoadingLocation(false);
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    alert("Could not access your location. Please ensure location permissions are enabled.");
                    setLoadingLocation(false);
                },
                { enableHighAccuracy: true }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
            setLoadingLocation(false);
        }
    };

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <MapContainer center={[lat, lng]} zoom={19} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={false}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[lat, lng]} />
                {bounds && <Rectangle bounds={bounds} pathOptions={{ color: 'blue', weight: 2, fillOpacity: 0.1 }} />}
                <UserLocationMarker userLocation={userLocation} targetLocation={{ lat, lng }} />
                <RecenterAutomatically lat={lat} lng={lng} />
            </MapContainer>

            {/* Locate Me Button */}
            <button
                onClick={handleLocateMe}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 1000,
                    background: 'white',
                    padding: '12px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: loadingLocation ? '#94a3b8' : '#2563eb',
                    transition: 'all 0.2s',
                    transform: 'scale(1)'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                disabled={loadingLocation}
                title="Show My Location"
            >
                <Crosshair size={24} style={loadingLocation ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
            <style>{`
                @keyframes spin { 
                    100% { -webkit-transform: rotate(360deg); transform:rotate(360deg); } 
                }
            `}</style>
        </div>
    );
};

export default MapViewer;
