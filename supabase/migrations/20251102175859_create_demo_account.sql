/*
  # Create Demo Account

  1. Changes
    - Creates a demo user account in auth.users with email: demo@example.com
    - Password: demo123
    - The user profile will be automatically created via the existing trigger
  
  2. Important Notes
    - This account is for demonstration purposes
    - The password is intentionally simple for easy access
    - The user record in public.users will be auto-created by the handle_new_user trigger
*/

-- Check if demo user exists, if not create it
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@example.com';
  
  IF demo_user_id IS NULL THEN
    -- Create demo auth user if it doesn't exist
    -- Password: demo123 (bcrypt hashed)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'demo@example.com',
      crypt('demo123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Demo User"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;
