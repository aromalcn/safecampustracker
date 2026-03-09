
-- Migration 21: Admin Password Reset Functionality
-- This script creates a secure function to allow admins to reset user passwords

-- We need to ensure pgcrypto is available for password hashing if we decide to go the manual route
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the RPC function
CREATE OR REPLACE FUNCTION admin_reset_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- 1. Verify that the user calling this function is an administrator
  SELECT (role = 'admin') INTO is_admin FROM public.users WHERE uid = auth.uid();
  
  IF is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can reset passwords.';
  END IF;

  -- 2. Update the password in the auth.users table
  -- Supabase Auth uses bcrypt (bf) for password hashing
  -- Note: SECURITY DEFINER ensures this runs with the permissions of the function creator (superuser)
  UPDATE auth.users 
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment for documentation
COMMENT ON FUNCTION admin_reset_password IS 'Allows users with "admin" role to reset any user password in the auth system.';
