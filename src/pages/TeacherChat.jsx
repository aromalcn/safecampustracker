import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/auth-service';
import { supabase } from '../supabase-config';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, User } from 'lucide-react';

const TeacherChat = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

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

    const fetchContactsAndMetadata = async (teacherId) => {
        try {
            setLoading(true);
            
            // 1. Fetch Parents and Students
            const { data: parents } = await supabase
                .from('users')
                .select('uid, username, role')
                .eq('role', 'parent');
            
            const { data: students } = await supabase
                .from('users')
                .select('uid, username, role')
                .eq('role', 'student');
            
            const { data: admins } = await supabase
                .from('users')
                .select('uid, username, role')
                .eq('role', 'admin');

            const allContacts = [...(parents || []), ...(students || []), ...(admins || [])];

            // 2. Fetch unread counts and last message timestamps
            const { data: metaData, error: metaError } = await supabase
                .from('messages')
                .select('sender_id, receiver_id, created_at, is_read')
                .or(`sender_id.eq.${teacherId},receiver_id.eq.${teacherId}`)
                .order('created_at', { ascending: false });

            if (metaError) throw metaError;

            const counts = {};
            const lastMsgMap = {};

            metaData.forEach(msg => {
                const otherParty = msg.sender_id === teacherId ? msg.receiver_id : msg.sender_id;
                
                if (!lastMsgMap[otherParty]) {
                    lastMsgMap[otherParty] = msg.created_at;
                }

                if (msg.receiver_id === teacherId && !msg.is_read) {
                    counts[otherParty] = (counts[otherParty] || 0) + 1;
                }
            });

            setUnreadCounts(counts);
            setLastMessages(lastMsgMap);
            setContacts(allContacts);
            setLoading(false);

        } catch (error) {
            console.error("Error loading chat metadata:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            const channel = supabase
                .channel('teacher-chat-updates')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `receiver_id=eq.${currentUser.id}` 
                }, (payload) => {
                    const newMsg = payload.new;
                    setLastMessages(prev => ({ ...prev, [newMsg.sender_id]: newMsg.created_at }));
                    
                    if (selectedContact?.uid !== newMsg.sender_id) {
                        setUnreadCounts(prev => ({ ...prev, [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1 }));
                    } else {
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

        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedContact.uid}),and(sender_id.eq.${selectedContact.uid},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });
        
        if (data) setMessages(data);
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
        }
    };

    const sortedContacts = [...contacts].sort((a, b) => {
        const timeA = new Date(lastMessages[a.uid] || 0).getTime();
        const timeB = new Date(lastMessages[b.uid] || 0).getTime();
        return timeB - timeA;
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: 'var(--font-family)' }}>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%', overflow: 'hidden' }}>
                
                {/* Inline Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <button onClick={() => navigate('/teacher')} style={{ border: 'none', background: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <ArrowLeft size={18} color="#64748b" />
                    </button>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Messages</h1>
                </div>

                {/* Chat Interface */}
                <div style={{ flex: 1, display: 'flex', gap: '1.5rem', overflow: 'hidden', minHeight: 0 }}>
                    
                    {/* Sidebar: Contact List */}
                    <div style={{ width: '300px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#111827' }}>Contacts</h2>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <p style={{ padding: '1.5rem', color: '#6b7280' }}>Loading contacts...</p>
                        ) : sortedContacts.length === 0 ? (
                            <p style={{ padding: '1.5rem', color: '#6b7280' }}>No contacts found.</p>
                        ) : (
                            sortedContacts.map(contact => (
                                <div 
                                    key={contact.uid}
                                    onClick={() => setSelectedContact(contact)}
                                    style={{ 
                                        padding: '1rem 1.5rem', cursor: 'pointer',
                                        background: selectedContact?.uid === contact.uid ? '#f0f9ff' : 'transparent',
                                        borderLeft: selectedContact?.uid === contact.uid ? '4px solid #004e92' : '4px solid transparent',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004e92', position: 'relative' }}>
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
                                        <div>
                                            <p style={{ margin: 0, fontWeight: unreadCounts[contact.uid] > 0 ? 700 : 600, color: '#1f2937' }}>{contact.username || 'Unknown User'}</p>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', textTransform: 'capitalize' }}>{contact.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div style={{ flex: 1, background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!selectedContact ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ width: '64px', height: '64px', background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={32} />
                            </div>
                            <p>Select a parent or student to start messaging</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004e92' }}>
                                    <span style={{ fontWeight: 700 }}>{selectedContact.username?.charAt(0)}</span>
                                </div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#111827' }}>{selectedContact.username}</h2>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {messages.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '2rem' }}>No messages yet. Say hello!</p>
                                ) : (
                                    messages.map(msg => {
                                        const isMe = msg.sender_id === currentUser.id;
                                        return (
                                            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                                <div style={{ 
                                                    padding: '12px 18px', 
                                                    borderRadius: '18px', 
                                                    background: isMe ? 'linear-gradient(135deg, #004e92 0%, #000428 100%)' : '#e0f2fe',
                                                    color: isMe ? 'white' : '#0c4a6e',
                                                    border: isMe ? '2px solid #000428' : '2px solid #bae6fd',
                                                    borderBottomRightRadius: isMe ? '4px' : '18px',
                                                    borderBottomLeftRadius: isMe ? '18px' : '4px',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                    fontSize: '0.95rem',
                                                    fontWeight: 500
                                                }}>
                                                    <p style={{ margin: 0, lineHeight: 1.6 }}>{msg.content}</p>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '6px', textAlign: isMe ? 'right' : 'left', padding: '0 4px' }}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Input */}
                            <form onSubmit={sendMessage} style={{ padding: '1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '1rem' }}>
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid #d1d5db', outline: 'none', fontSize: '1rem' }}
                                />
                                <button type="submit" disabled={!newMessage.trim()} style={{ background: '#004e92', color: 'white', border: 'none', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: !newMessage.trim() ? 0.5 : 1 }}>
                                    <Send size={20} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
    );
};

export default TeacherChat;
