import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, User, Search } from 'lucide-react';

const AdminChat = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastMessages, setLastMessages] = useState({});

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const user = await getCurrentUser();
        if (user) {
            setCurrentUser(user);
            fetchContactsAndMetadata(user.id);
        } else {
            navigate('/login');
        }
    };

    const fetchContactsAndMetadata = async (userId) => {
        try {
            setLoading(true);
            
            // 1. Fetch all users
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('uid, username, role, department')
                .neq('role', 'admin')
                .order('username', { ascending: true });

            if (usersError) throw usersError;

            // 2. Fetch unread counts and last message timestamps for the current user
            const { data: metaData, error: metaError } = await supabase
                .from('messages')
                .select('sender_id, receiver_id, created_at, is_read')
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (metaError) throw metaError;

            const counts = {};
            const lastMsgMap = {};

            metaData.forEach(msg => {
                const otherParty = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
                
                // Track last message timestamp for sorting
                if (!lastMsgMap[otherParty]) {
                    lastMsgMap[otherParty] = msg.created_at;
                }

                // Count unread messages where current user is the receiver
                if (msg.receiver_id === userId && !msg.is_read) {
                    counts[otherParty] = (counts[otherParty] || 0) + 1;
                }
            });

            setUnreadCounts(counts);
            setLastMessages(lastMsgMap);
            setContacts(usersData || []);
        } catch (error) {
            console.error("Error loading chat metadata:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            // Real-time subscription for all messages involving the user
            const channel = supabase
                .channel('admin-chat-updates')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `receiver_id=eq.${currentUser.id}` 
                }, (payload) => {
                    const newMsg = payload.new;
                    // Update last message map for sorting
                    setLastMessages(prev => ({ ...prev, [newMsg.sender_id]: newMsg.created_at }));
                    
                    // Update unread counts if not current selected contact
                    if (selectedContact?.uid !== newMsg.sender_id) {
                        setUnreadCounts(prev => ({ ...prev, [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1 }));
                    } else {
                        // If it is the selected contact, we should mark it as read immediately in the DB
                        markMessageAsRead(newMsg.id);
                        setMessages(prev => [...prev, newMsg]);
                    }
                })
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=eq.${currentUser.id}`
                }, (payload) => {
                    const newMsg = payload.new;
                    setLastMessages(prev => ({ ...prev, [newMsg.receiver_id]: newMsg.created_at }));
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [currentUser, selectedContact]);

    useEffect(() => {
        if (selectedContact && currentUser) {
            fetchMessages();
            // Clear unread count for this contact
            clearUnread(selectedContact.uid);
        }
    }, [selectedContact, currentUser]);

    const markMessageAsRead = async (msgId) => {
        await supabase.from('messages').update({ is_read: true }).eq('id', msgId);
    };

    const clearUnread = async (contactId) => {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', currentUser.id)
            .eq('sender_id', contactId)
            .eq('is_read', false);
        
        if (!error) {
            setUnreadCounts(prev => ({ ...prev, [contactId]: 0 }));
        }
    };

    const fetchMessages = async () => {
        if (!selectedContact || !currentUser) return;

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedContact.uid}),and(sender_id.eq.${selectedContact.uid},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });
        
        if (data) setMessages(data);
        if (error) console.error("Error fetching messages:", error);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact || !currentUser) return;

        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender_id: currentUser.id,
                receiver_id: selectedContact.uid,
                content: newMessage,
                is_read: false
            })
            .select()
            .single();

        if (!error && data) {
            setNewMessage('');
            setMessages(prev => [...prev, data]);
            setLastMessages(prev => ({ ...prev, [selectedContact.uid]: data.created_at }));
        } else {
            console.error("Error sending message:", error);
        }
    };

    // Filter AND Sort contacts
    const sortedAndFilteredContacts = contacts
        .filter(contact => 
            (contact.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (contact.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (contact.department || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            const timeA = new Date(lastMessages[a.uid] || 0).getTime();
            const timeB = new Date(lastMessages[b.uid] || 0).getTime();
            return timeB - timeA;
        });

    return (
        <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: 'var(--font-family)' }}>
            <div style={{ flex: 1, display: 'flex', gap: '1.5rem', overflow: 'hidden', padding: '1rem' }}>
                
                {/* Sidebar: Contact List */}
                <div style={{ width: '300px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid #f3f4f6' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#1e293b' }}>Messages</h2>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Search users..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '8px 8px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <p style={{ padding: '1.5rem', color: '#6b7280', textAlign: 'center' }}>Loading contacts...</p>
                        ) : sortedAndFilteredContacts.length === 0 ? (
                            <p style={{ padding: '1.5rem', color: '#6b7280', textAlign: 'center' }}>No users found.</p>
                        ) : (
                            sortedAndFilteredContacts.map(contact => (
                                <div 
                                    key={contact.uid}
                                    onClick={() => setSelectedContact(contact)}
                                    style={{ 
                                        padding: '1rem 1.25rem', cursor: 'pointer',
                                        background: selectedContact?.uid === contact.uid ? '#f1f5f9' : 'transparent',
                                        borderLeft: selectedContact?.uid === contact.uid ? '4px solid #0f172a' : '4px solid transparent',
                                        transition: 'all 0.2s',
                                        borderBottom: '1px solid #f8fafc',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', position: 'relative' }}>
                                            <User size={20} />
                                            {unreadCounts[contact.uid] > 0 && (
                                                <div style={{ 
                                                    position: 'absolute', top: '-5px', right: '-5px', 
                                                    background: '#ef4444', color: 'white', 
                                                    fontSize: '0.65rem', fontWeight: 800, 
                                                    padding: '2px 6px', borderRadius: '10px',
                                                    border: '2px solid white',
                                                    minWidth: '18px', textAlign: 'center'
                                                }}>
                                                    {unreadCounts[contact.uid]}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontWeight: unreadCounts[contact.uid] > 0 ? 700 : 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.username || 'Unknown'}</p>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'capitalize', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{contact.role}</span>
                                                {contact.department && (
                                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.department}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div style={{ flex: 1, background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!selectedContact ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                <Send size={40} color="#cbd5e1" />
                            </div>
                            <h3 style={{ margin: 0, color: '#1e293b' }}>Select a user to start messaging</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '300px' }}>You can message students, teachers, or parents across the campus.</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc' }}>
                                <div style={{ width: '40px', height: '40px', background: '#0f172a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <span style={{ fontWeight: 700 }}>{selectedContact.username?.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>{selectedContact.username}</h2>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textTransform: 'capitalize' }}>{selectedContact.role} • {selectedContact.department || 'All Departments'}</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff' }}>
                                {messages.length === 0 ? (
                                    <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
                                        <p>No conversation history yet.</p>
                                    </div>
                                ) : (
                                    messages.map(msg => {
                                        const isMe = msg.sender_id === currentUser.id;
                                        return (
                                            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                                <div style={{ 
                                                    padding: '10px 16px', 
                                                    borderRadius: '14px', 
                                                    background: isMe ? '#0f172a' : '#f1f5f9',
                                                    color: isMe ? 'white' : '#1e293b',
                                                    borderBottomRightRadius: isMe ? '2px' : '14px',
                                                    borderBottomLeftRadius: isMe ? '14px' : '2px',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
                                                </div>
                                                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', textAlign: isMe ? 'right' : 'left', padding: '0 4px' }}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Input */}
                            <form onSubmit={sendMessage} style={{ padding: '1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', background: '#f8fafc' }}>
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', transition: 'border-color 0.2s' }}
                                    onFocus={(e) => e.target.style.borderColor = '#0f172a'}
                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim()} 
                                    style={{ 
                                        background: '#0f172a', color: 'white', border: 'none', 
                                        width: '48px', height: '48px', borderRadius: '12px', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        opacity: !newMessage.trim() ? 0.5 : 1 
                                    }}
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminChat;
