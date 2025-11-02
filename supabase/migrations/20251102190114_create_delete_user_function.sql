/*
  # Create User Deletion Function

  1. Function
    - `delete_user()` - Allows users to delete their own account
    - Deletes the user from auth.users
    - All related data is automatically deleted via CASCADE constraints

  2. Security
    - Function can only be called by authenticated users
    - Users can only delete their own account
    - Uses SECURITY DEFINER to have permission to delete from auth.users
*/

-- Create function to delete user account
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user (this will cascade to all related tables)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
