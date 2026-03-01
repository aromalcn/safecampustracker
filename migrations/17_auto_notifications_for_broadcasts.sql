
-- 1. Function to handle Personal Messages for Announcements
CREATE OR REPLACE FUNCTION public.handle_announcement_chat_message()
RETURNS TRIGGER AS $$
BEGIN
    -- For 'all' audience
    IF NEW.audience = 'all' THEN
        INSERT INTO public.messages (sender_id, receiver_id, content, is_read)
        SELECT NEW.author_id, uid, '📢 ANNOUNCEMENT: ' || NEW.title || chr(10) || NEW.message, false
        FROM public.users
        WHERE uid != NEW.author_id; -- Don't send to self
    -- For specific roles
    ELSIF NEW.audience IN ('student', 'teacher', 'parent') THEN
        INSERT INTO public.messages (sender_id, receiver_id, content, is_read)
        SELECT NEW.author_id, uid, '📢 ANNOUNCEMENT (' || NEW.audience || '): ' || NEW.title || chr(10) || NEW.message, false
        FROM public.users
        WHERE role = NEW.audience AND uid != NEW.author_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Announcements Chat
DROP TRIGGER IF EXISTS on_announcement_chat ON public.announcements;
CREATE TRIGGER on_announcement_chat
    AFTER INSERT ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_announcement_chat_message();


-- 2. Function to handle Personal Messages for Safety Alerts
CREATE OR REPLACE FUNCTION public.handle_safety_alert_chat_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if the alert is active
    IF NEW.is_active = true THEN
        -- Handle 'audience' column (defaults to 'all' if null)
        IF NEW.audience = 'all' OR NEW.audience IS NULL THEN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_read)
            SELECT NEW.created_by, uid, '🚨 EMERGENCY ALERT: ' || NEW.title || chr(10) || NEW.message, false
            FROM public.users
            WHERE uid != NEW.created_by;
        ELSIF NEW.audience IN ('student', 'teacher', 'parent') THEN
            INSERT INTO public.messages (sender_id, receiver_id, content, is_read)
            SELECT NEW.created_by, uid, '🚨 EMERGENCY ALERT (' || NEW.audience || '): ' || NEW.title || chr(10) || NEW.message, false
            FROM public.users
            WHERE role = NEW.audience AND uid != NEW.created_by;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Safety Alerts Chat (on creation)
DROP TRIGGER IF EXISTS on_safety_alert_chat_created ON public.safety_alerts;
CREATE TRIGGER on_safety_alert_chat_created
    AFTER INSERT ON public.safety_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_safety_alert_chat_message();

-- Trigger for Safety Alerts Chat (on activation)
DROP TRIGGER IF EXISTS on_safety_alert_chat_activated ON public.safety_alerts;
CREATE TRIGGER on_safety_alert_chat_activated
    AFTER UPDATE OF is_active ON public.safety_alerts
    FOR EACH ROW
    WHEN (NEW.is_active = true AND OLD.is_active = false)
    EXECUTE FUNCTION public.handle_safety_alert_chat_message();
