import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { sendSOS } from '../services/dashboard-service';

const SOSButton = ({ user }) => {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const handleSOS = async () => {
        setLoading(true);
        try {
            await sendSOS({
                uid: user.id,
                username: user.user_metadata?.username || user.email
            });
            alert("SOS Alert Sent! Help is on the way.");
            setShowModal(false);
        } catch (error) {
            console.error("Failed to send SOS:", error);
            alert(`Failed to send SOS: ${error.message || "Unknown error"}. Please call emergency services.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 9999,
                    animation: 'pulse 2s infinite'
                }}
                aria-label="SOS Button"
            >
                <AlertTriangle size={32} fill="white" stroke="white" />
            </button>

            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '20px',
                        width: '90%',
                        maxWidth: '400px',
                        textAlign: 'center',
                        position: 'relative',
                        animation: 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        <button 
                            onClick={() => setShowModal(false)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={24} color="#64748b" />
                        </button>

                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: '#fef2f2',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            <AlertTriangle size={40} color="#ef4444" />
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2937', marginBottom: '0.5rem' }}>
                            Send SOS Alert?
                        </h2>
                        <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.5' }}>
                            This will immediately notify all teachers and students that you need help. 
                            <strong>Only use this in an emergency.</strong>
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={handleSOS}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? 'Sending Alert...' : 'YES, SEND HELP'}
                            </button>
                            
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SOSButton;
