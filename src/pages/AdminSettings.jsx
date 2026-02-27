import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Smartphone, Mail, Save, LogOut, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase-config';
import { getCurrentUser } from '../services/auth-service';

const AdminSettings = () => {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    
    // Form States
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        smsAlerts: false,
        systemAnnouncements: true
    });

    // Password Update State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                setEmail(currentUser.email);
                
                // Fetch details including settings
                const { data, error } = await supabase
                    .from('users')
                    .select('username, settings')
                    .eq('uid', currentUser.id)
                    .single();
                
                if (data) {
                    setUsername(data.username);
                    if (data.settings) {
                        setNotifications(data.settings);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ 
                    username,
                    settings: notifications // Save notifications JSON
                })
                .eq('uid', user.id);

            if (error) throw error;
            alert("Profile & Settings updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters long.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Passwords do not match.");
            return;
        }

        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            setPasswordSuccess("Password updated successfully.");
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setPasswordError(error.message);
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginBottom: '2rem' }}>Settings</h1>

            <div style={{ display: 'grid', gap: '2rem' }}>
                
                {/* 1. Profile Section */}
                <section style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <User size={24} color="#3b82f6" />
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#334155' }}>Profile Settings</h2>
                    </div>
                    
                    <form onSubmit={handleProfileUpdate} style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#64748b' }}>Email (Read-only)</label>
                            <input disabled value={email} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#64748b' }}>Username</label>
                            <input 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button disabled={loading} type="submit" style={{ background: '#0f172a', color: 'white', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* 2. Notifications Section */}
                <section style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <Bell size={24} color="#f59e0b" />
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#334155' }}>Notifications</h2>
                    </div>
                    
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Mail size={20} color="#64748b" />
                                <div>
                                    <h4 style={{ margin: 0, color: '#334155' }}>Email Alerts</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Receive daily summaries and critical alerts via email.</p>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={notifications.emailAlerts} 
                                onChange={() => setNotifications({...notifications, emailAlerts: !notifications.emailAlerts})}
                                style={{ width: '20px', height: '20px', accentColor: '#3b82f6' }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Smartphone size={20} color="#64748b" />
                                <div>
                                    <h4 style={{ margin: 0, color: '#334155' }}>SMS Alerts</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Get instant text messages for SOS emergencies.</p>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={notifications.smsAlerts} 
                                onChange={() => setNotifications({...notifications, smsAlerts: !notifications.smsAlerts})}
                                style={{ width: '20px', height: '20px', accentColor: '#3b82f6' }}
                            />
                        </div>
                    </div>
                </section>

                {/* 3. Security Section */}
                <section style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <Shield size={24} color="#ef4444" />
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#334155' }}>Security</h2>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                         <form onSubmit={handlePasswordUpdate}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                                    <input 
                                        type={showNewPassword ? "text" : "password"} 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min 6 characters"
                                        style={{ width: '100%', padding: '10px 40px 10px 36px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter password"
                                        style={{ width: '100%', padding: '10px 40px 10px 36px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {passwordError && (
                                <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    {passwordError}
                                </div>
                            )}

                            {passwordSuccess && (
                                <div style={{ padding: '10px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    {passwordSuccess}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={savingPassword}
                                style={{ 
                                    width: '100%',
                                    background: '#0f172a', color: 'white', border: 'none', padding: '12px', 
                                    borderRadius: '8px', fontWeight: 600, cursor: savingPassword ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    opacity: savingPassword ? 0.7 : 1
                                }}
                            >
                                {savingPassword ? 'Updating...' : <><Save size={18} /> Update Password</>}
                            </button>
                        </form>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default AdminSettings;
