/*
  # Fix Fathom Recordings Unique Constraint

  ## Problem
  The current UNIQUE constraint on `recording_id` prevents the same Fathom meeting 
  from being added to multiple clients. This is incorrect - the same meeting might 
  be relevant to multiple clients.

  ## Changes
  1. Drop the existing UNIQUE constraint on `recording_id`
  2. Add a composite UNIQUE constraint on `(user_id, client_id, recording_id)`
     - This allows the same recording to be added to different clients
     - But prevents duplicate entries for the same client
  
  ## Impact
  - Users can now add the same Fathom meeting to multiple client records
  - Prevents accidental duplicates within the same client
*/

-- Drop the old constraint
ALTER TABLE fathom_recordings 
DROP CONSTRAINT IF EXISTS fathom_recordings_recording_id_key;

-- Add the correct composite unique constraint
ALTER TABLE fathom_recordings 
ADD CONSTRAINT fathom_recordings_user_client_recording_unique 
UNIQUE (user_id, client_id, recording_id);
