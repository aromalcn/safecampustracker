-- Add settings column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"emailAlerts": true, "smsAlerts": false, "systemAnnouncements": true}';

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default system settings
INSERT INTO system_settings (key, value)
VALUES 
    ('maintenance_mode', 'false'),
    ('lockdown_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- Policies (Optional, assuming public/authenticated access for now)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" ON system_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow update access to admins only" ON system_settings
    FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));
