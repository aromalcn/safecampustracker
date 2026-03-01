import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase-config';
import { Trash2, Search, User } from 'lucide-react';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        role: 'student',
        department: '',
        semester: ''
    });

    const [filterRole, setFilterRole] = useState('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            
            // Debug: Check current user role in DB
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: dbUser } = await supabase
                    .from('users')
                    .select('uid, role')
                    .eq('uid', user.id)
                    .single();
                console.log("Current Logged In User UID:", user.id, "Email:", user.email);
                console.log("DB Role for this UID:", dbUser?.role);
            }

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (uid) => {
        if (window.confirm("Are you sure you want to delete this user? This action cannot be undone and will only remove the user profile from the database, not the auth account.")) {
            try {
                const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('uid', uid);

                if (error) throw error;
                
                // Update UI locally
                setUsers(users.filter(user => user.uid !== uid));
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Failed to delete user.");
            }
        }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username || '',
            role: user.role || 'student',
            department: user.department || '',
            semester: user.semester || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setFormData({ username: '', role: 'student', department: '', semester: '' });
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        console.log("Saving user:", editingUser, "Data:", formData);
        if (!editingUser) return;

        try {
            const updatePayload = {
                username: formData.username,
                role: formData.role,
                department: formData.department,
                semester: formData.semester ? parseInt(formData.semester) : null
            };
            console.log("Update Payload:", updatePayload);

            const { data, error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('uid', editingUser.uid)
                .select(); // Add select to see returned data

            if (error) {
                console.error("Supabase Update Error:", error);
                throw error;
            }
            
            console.log("Supabase Update Success:", data);

            // Update UI locally
            setUsers(users.map(u => u.uid === editingUser.uid ? { ...u, ...formData } : u));
            handleCancelEdit();
        } catch (error) {
            console.error("Error updating user (catch block):", error);
            alert("Failed to update user: " + error.message);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 className="page-title">User Management</h2>
                </div>
                
                <div className="flex-col-mobile" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        className="full-width-mobile"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem',
                            outline: 'none',
                            background: 'white',
                            cursor: 'pointer',
                            height: '52px'
                        }}
                    >
                        <option value="all">All Roles</option>
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                        <option value="parent">Parent</option>
                    </select>

                    <div className="full-width-mobile" style={{ position: 'relative', flex: 1 }}>
                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            className="full-width-mobile"
                            placeholder="Search users..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                padding: '14px 16px 14px 44px', 
                                borderRadius: '8px', 
                                border: '1px solid #e2e8f0', 
                                fontSize: '1rem',
                                width: '100%',
                                maxWidth: '400px',
                                outline: 'none',
                                height: '52px'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table className="table-responsive">
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>User</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Role</th>
                            <th className="hide-on-mobile" style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Department</th>
                            <th className="hide-on-mobile" style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Semester</th>
                            <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading users...</td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No users found matching your search.</td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.uid} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 600, flexShrink: 0 }}>
                                                {user.username ? user.username.charAt(0).toUpperCase() : <User size={18} />}
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username || 'Unknown'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span className="badge" style={{ 
                                            background: user.role === 'admin' ? '#e0e7ff' : user.role === 'teacher' ? '#f0fdf4' : '#fefce8',
                                            color: user.role === 'admin' ? '#4338ca' : user.role === 'teacher' ? '#15803d' : '#a16207'
                                        }}>
                                            {user.role || 'Student'}
                                        </span>
                                    </td>
                                    <td className="hide-on-mobile" style={{ padding: '12px 16px', color: '#334155' }}>{user.department || '-'}</td>
                                    <td className="hide-on-mobile" style={{ padding: '12px 16px', color: '#334155' }}>{user.semester || '-'}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={() => handleEditClick(user)}
                                                style={{ 
                                                    padding: '8px 12px', 
                                                    background: '#eff6ff', 
                                                    color: '#2563eb', 
                                                    border: 'none', 
                                                    borderRadius: '8px', 
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.uid)}
                                                style={{ 
                                                    padding: '8px', 
                                                    background: '#fef2f2', 
                                                    color: '#ef4444', 
                                                    border: 'none', 
                                                    borderRadius: '8px', 
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem'
                }}>
                    <div className="modal-content card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>Edit User Profile</h3>
                        <form onSubmit={handleSaveUser}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Username</label>
                                <input 
                                    type="text" 
                                    value={formData.username} 
                                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Role</label>
                                <select 
                                    value={formData.role} 
                                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                >
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="parent">Parent</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Department</label>
                                    <input 
                                        type="text" 
                                        value={formData.department} 
                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Semester</label>
                                    <input 
                                        type="number" 
                                        value={formData.semester} 
                                        onChange={(e) => setFormData({...formData, semester: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button 
                                    type="button" 
                                    onClick={handleCancelEdit}
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600 }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600 }}
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
