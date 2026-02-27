import React, { useState, useEffect } from 'react';
import { ShieldAlert, Phone, AlertTriangle } from 'lucide-react';
import SOSButton from '../components/SOSButton'; // Reusing existing component
import { getCurrentUser } from '../services/auth-service';

const StudentSafety = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        };
        fetchUser();
    }, []);

    const emergencyContacts = [
        { name: "Campus Security", number: "555-0123", desc: "24/7 Patrol" },
        { name: "Health Center", number: "555-0199", desc: "Medical Emergencies" },
        { name: "Police", number: "911", desc: "Civil Authorities" },
        { name: "Counseling", number: "555-0155", desc: "Mental Health Support" },
    ];

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldAlert size={32} color="#ef4444" /> Campus Safety
            </h1>

            {/* 1. SOS Button Section */}
            <section style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: '16px', padding: '2rem' }}>
                    <h2 style={{ color: '#be123c', margin: '0 0 1rem 0' }}>Emergency SOS</h2>
                    <p style={{ color: '#881337', marginBottom: '2rem' }}>
                        Press and hold the button below to alert campus security and your emergency contacts immediately.
                    </p>
                    {/* The SOSButton component handles the localized logic itself */}
                    {user ? <SOSButton user={user} /> : <p>Loading user data...</p>}
                </div>
            </section>

            {/* 2. Emergency Contacts Grid */}
            <section>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Phone size={24} /> Important Contacts
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {emergencyContacts.map((contact, index) => (
                        <div key={index} style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: '#ecfccb', padding: '12px', borderRadius: '50%', color: '#65a30d' }}>
                                <Phone size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1e293b' }}>{contact.name}</h3>
                                <a href={`tel:${contact.number}`} style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                                    {contact.number}
                                </a>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>{contact.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default StudentSafety;
