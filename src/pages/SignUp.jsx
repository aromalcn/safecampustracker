import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, ShieldCheck, BookOpen, Users, Briefcase, Eye, EyeOff } from 'lucide-react';
import CustomDropdown from '../components/CustomDropdown';

const SignUp = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: 'student', // student, teacher, parent
        idNumber: '', // Roll Number or Staff ID
        department: '',
        password: '',
        password: '',
        confirmPassword: '',
        semester: '1'
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            await import('../services/auth-service').then(module => 
                module.registerUser(formData.email, formData.password, formData)
            );
            navigate('/login');
        } catch (error) {
            console.error("Registration Error:", error);
            alert("Registration failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-container" style={{ display: 'flex', minHeight: '100vh', width: '100vw', fontFamily: 'var(--font-family)', overflow: 'hidden' }}>

            {/* Left Side */}
            <div className="login-brand-panel" style={{
                flex: '0.8',
                background: `linear-gradient(135deg, #000428 0%, #004e92 100%)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem',
                color: 'white',
                position: 'relative',
                textAlign: 'center'
            }}>
                <ShieldCheck size={120} color="#4fc3f7" style={{ marginBottom: '2rem' }} />
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Join SafeCampus Tracker</h1>
                <p style={{ fontSize: '1.1rem', opacity: 0.8, lineHeight: 1.6, maxWidth: '400px' }}>
                    Create your account to access real-time tracking, attendance, and safety alerts.
                </p>
            </div>

            {/* Right Side - Scrollable Form */}
            <div className="login-form-panel" style={{
                flex: '1.2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                padding: '2rem',
                overflowY: 'auto'
            }}>
                <div style={{ width: '100%', maxWidth: '500px', background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1a1a1a', marginBottom: '0.5rem' }}>Create Account</h2>
                        <p style={{ color: '#666' }}>Already have an account? <Link to="/login" style={{ color: '#004e92', fontWeight: 600, textDecoration: 'none' }}>Login here</Link></p>
                    </div>

                    <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                        {/* Role Selection Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            {['student', 'teacher', 'parent'].map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role })}
                                    style={{
                                        padding: '12px 4px',
                                        borderRadius: '12px',
                                        border: formData.role === role ? '2px solid #004e92' : '1px solid #e0e0e0',
                                        background: formData.role === role ? '#f0f7ff' : 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s',
                                        height: '100%'
                                    }}
                                >
                                    {role === 'student' && <BookOpen size={20} color={formData.role === role ? '#004e92' : '#666'} />}
                                    {role === 'teacher' && <Briefcase size={20} color={formData.role === role ? '#004e92' : '#666'} />}
                                    {role === 'parent' && <Users size={20} color={formData.role === role ? '#004e92' : '#666'} />}
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: formData.role === role ? '#004e92' : '#666', textTransform: 'capitalize' }}>{role}</span>
                                </button>
                            ))}
                        </div>

                        {/* Name & ID */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    id="signup-username" 
                                    autoComplete="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Username"
                                    required
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e0e0e0', fontSize: '1rem', background: '#f8f9fa' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>
                                    {formData.role === 'student' ? 'Roll Number' : formData.role === 'teacher' ? 'Staff ID' : 'Phone Number'}
                                </label>
                                <input
                                    type="text"
                                    name="idNumber"
                                    value={formData.idNumber}
                                    onChange={handleChange}
                                    placeholder={formData.role === 'parent' ? 'e.g. 9876543210' : 'e.g. CS21B1024'}
                                    required
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e0e0e0', fontSize: '1rem', background: '#f8f9fa' }}
                                />
                            </div>
                        </div>

                        {/* Department (If Student/Teacher) */}
                        {(formData.role === 'student' || formData.role === 'teacher') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Department</label>
                                <CustomDropdown
                                    options={[
                                        { value: 'CSE', label: 'Computer Science (CSE)' },
                                        { value: 'ECE', label: 'Electronics (ECE)' },
                                        { value: 'MECH', label: 'Mechanical (MECH)' },
                                        { value: 'CIVIL', label: 'Civil' }
                                    ]}
                                    value={formData.department}
                                    onChange={(val) => setFormData({ ...formData, department: val })}
                                    placeholder="Select Department"
                                />
                            </div>
                        )}

                        {/* Semester Selection (Only for Student) */}
                        {formData.role === 'student' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Current Semester</label>
                                <CustomDropdown
                                    options={Array.from({length: 8}, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }))}
                                    value={formData.semester}
                                    onChange={(val) => setFormData({ ...formData, semester: val })}
                                    placeholder="Select Semester"
                                />
                            </div>
                        )}

                        {/* Contact Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                required
                                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e0e0e0', fontSize: '1rem', background: '#f8f9fa' }}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    style={{ width: '100%', padding: '14px 48px 14px 14px', borderRadius: '12px', border: '1px solid #e0e0e0', fontSize: '1rem', background: '#f8f9fa' }}
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
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    style={{ width: '100%', padding: '14px 48px 14px 14px', borderRadius: '12px', border: '1px solid #e0e0e0', fontSize: '1rem', background: '#f8f9fa' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '1rem',
                                background: '#004e92', color: 'white', padding: '16px', borderRadius: '12px',
                                fontSize: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                                transition: 'background 0.2s', opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Creating Account...' : <>Create Account <ArrowRight size={20} /></>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
