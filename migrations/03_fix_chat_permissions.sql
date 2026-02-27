-- Enable RLS on messages if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 1. MESSAGES POLICIES

-- Allow users to insert messages where they are the sender
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
CREATE POLICY "Users can insert their own messages" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- Allow users to view messages they sent or received
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT TO authenticated
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- 2. USERS POLICIES (for Contact List)

-- Allow users to read other users' basic info (needed to find teachers/admins)
-- We might want to restrict this, but for a school app, students seeing teachers is expected.
DROP POLICY IF EXISTS "Allow authenticated to view public user info" ON users;
CREATE POLICY "Allow authenticated to view public user info" ON users
    FOR SELECT TO authenticated
    USING (true);

-- Note: We are assuming 'users' table exists and has 'uid', 'username', 'role'.
