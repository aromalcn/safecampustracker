import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../services/auth-service';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgotPwd, setShowForgotPwd] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userCredential = await loginUser(email, password);
            const { getUserRole } = await import('../services/auth-service');
            const role = await getUserRole(userCredential.user.uid);

            // Role-Based Redirect Logic
            if (role === 'student') {
                navigate('/student');
            } else if (role === 'teacher') {
                navigate('/teacher');
            } else if (role === 'parent') {
                navigate('/parent');
            } else if (role === 'admin') {
                navigate('/admin');
            } else {
                // Fallback or default
                navigate('/student'); 
            }

        } catch (err) {
            console.error("Login Error:", err);
            setError('Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-container" style={{ display: 'flex', minHeight: '100vh', width: '100vw', fontFamily: 'var(--font-family)', overflow: 'hidden' }}>

            {/* Left Side - Brand & Visuals */}
            <div className="login-brand-panel" style={{
                flex: '1.2',
                background: `linear-gradient(135deg, rgba(0, 4, 40, 0.9) 0%, rgba(0, 78, 146, 0.8) 100%), url('/login-bg.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '4rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Abstract Shapes */}
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>

                <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '12px 24px',
                        borderRadius: '100px',
                        marginBottom: '2rem',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <ShieldCheck size={24} color="#4fc3f7" />
                        <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>OFFICIAL PORTAL</span>
                    </div>

                    <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem' }}>
                        SafeCampus <br /> <span style={{ color: '#4fc3f7' }}>Tracker</span>
                    </h1>

                    <p style={{ fontSize: '1.1rem', opacity: 0.8, lineHeight: 1.6, maxWidth: '500px' }}>
                        Monitor campus safety, track student movement, and manage academic activity in real-time. Secure access for authorized personnel only.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="login-form-panel" style={{
                flex: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'white',
                padding: '2rem',
                position: 'relative'
            }}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1a1a1a', marginBottom: '0.5rem' }}>Sign In</h2>
                        <p style={{ color: '#666' }}>
                            Welcome back! Please enter your details. <br />
                            <span style={{ fontSize: '1rem', color: '#0056b3' }}>Don't have an account? <Link to="/signup" style={{ fontWeight: 700, textDecoration: 'none' }}>Sign up</Link></span>
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            background: '#fff2f0', border: '1px solid #ffccc7', color: '#d32f2f',
                            padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@safecampus.edu"
                                    required
                                    style={{
                                        width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px',
                                        border: '1px solid #e0e0e0', fontSize: '1rem', outline: 'none',
                                        transition: 'all 0.2s', background: '#f8f9fa'
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = '#004e92'; e.target.style.background = 'white'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f9fa'; }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>Password</label>
                                <button type="button" onClick={() => setShowForgotPwd(true)} style={{ background: 'none', border: 'none', fontSize: '0.85rem', color: '#004e92', fontWeight: 600, cursor: 'pointer' }}>Forgot password?</button>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: '100%', padding: '14px 48px 14px 48px', borderRadius: '12px',
                                        border: '1px solid #e0e0e0', fontSize: '1rem', outline: 'none',
                                        transition: 'all 0.2s', background: '#f8f9fa'
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = '#004e92'; e.target.style.background = 'white'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.background = '#f8f9fa'; }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        color: '#999',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '0.5rem',
                                background: '#004e92', color: 'white', padding: '16px', borderRadius: '12px',
                                fontSize: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                transition: 'background 0.2s', opacity: loading ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => !loading && (e.target.style.background = '#003c71')}
                            onMouseLeave={(e) => !loading && (e.target.style.background = '#004e92')}
                        >
                            {loading ? 'Logging In...' : <>Login <ArrowRight size={20} /></>}
                        </button>
                    </form>
                </div>

                {/* Forgot Password Modal Overlay */}
                {showForgotPwd && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            position: 'relative'
                        }}>
                            <button
                                onClick={() => setShowForgotPwd(false)}
                                style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={20} color="#666" />
                            </button>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reset Password</h3>
                            <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                Enter your email address and we'll send you a link to reset your password.
                            </p>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '10px',
                                    border: '1px solid #e0e0e0', marginBottom: '1rem', fontSize: '1rem'
                                }}
                            />
                            <button
                                onClick={() => { alert('Reset link sent!'); setShowForgotPwd(false); }}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '10px',
                                    background: '#004e92', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Send Reset Link
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
