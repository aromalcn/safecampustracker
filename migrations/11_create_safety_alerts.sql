-- Create safety_alerts table for campus-wide safety notifications
CREATE TABLE IF NOT EXISTS public.safety_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deactivated_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_safety_alerts_active ON public.safety_alerts(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_severity ON public.safety_alerts(severity);

-- Enable Row Level Security
ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active alerts
CREATE POLICY "Anyone can view active safety alerts"
    ON public.safety_alerts
    FOR SELECT
    USING (is_active = true);

-- Policy: Only admins can create alerts
CREATE POLICY "Only admins can create safety alerts"
    ON public.safety_alerts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.uid = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Only admins can update alerts
CREATE POLICY "Only admins can update safety alerts"
    ON public.safety_alerts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.uid = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Only admins can delete alerts
CREATE POLICY "Only admins can delete safety alerts"
    ON public.safety_alerts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.uid = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_safety_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.is_active = false AND OLD.is_active = true THEN
        NEW.deactivated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER safety_alerts_updated_at
    BEFORE UPDATE ON public.safety_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_safety_alerts_updated_at();

-- Add comment
COMMENT ON TABLE public.safety_alerts IS 'Campus-wide safety alerts and notifications visible to all users';
