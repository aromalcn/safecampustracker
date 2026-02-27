import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase-config';
import { getCurrentUser, logoutUser } from '../services/auth-service';
import { ArrowLeft, User, Lock, Save, Shield, LogOut, Eye, EyeOff } from 'lucide-react';

const UserProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Password Update State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                navigate('/login');
                return;
            }
            setUser(currentUser);

            const { data: profileData, error } = await supabase
                .from('users')
                .select('*')
                .eq('uid', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching profile:", error);
            }
            
            setProfile(profileData || {});
        } catch (error) {
            console.error("Error:", error);
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

        setSaving(true);
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
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    const getRoleBadgeColor = (role) => {
        switch(role) {
            case 'admin': return '#7e22ce';
            case 'teacher': return '#2563eb';
            case 'student': return '#10b981';
            case 'parent': return '#f59e0b';
            default: return '#64748b';
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading profile...</div>;
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'var(--font-family)' }}>
            
            <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '1rem', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>My Profile</h1>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    
                    {/* Basic Info Card */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={32} color="#64748b" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{profile?.username || user?.email}</h2>
                                <span style={{ 
                                    display: 'inline-block', marginTop: '4px', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, color: 'white',
                                    background: getRoleBadgeColor(profile?.role)
                                }}>
                                    {(profile?.role || 'User').toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Email Address</label>
                                <div style={{ fontSize: '1rem', color: '#334155' }}>{user?.email}</div>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Department</label>
                                <div style={{ fontSize: '1rem', color: '#334155' }}>{profile?.department || 'N/A'}</div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>User ID</label>
                                <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontFamily: 'monospace' }}>{user?.id}</div>
                            </div>
                        </div>

                        {/* Logout Button */}
                         <button 
                            onClick={handleLogout}
                            style={{ 
                                marginTop: '2rem',
                                width: '100%',
                                background: '#fef2f2', color: '#dc2626', border: 'none', padding: '12px', 
                                borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>

                    {/* Security Card */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <Shield size={24} color="#0f172a" />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Security</h2>
                        </div>

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
                                disabled={saving}
                                style={{ 
                                    width: '100%',
                                    background: '#0f172a', color: 'white', border: 'none', padding: '12px', 
                                    borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Updating...' : <><Save size={18} /> Update Password</>}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserProfile;
