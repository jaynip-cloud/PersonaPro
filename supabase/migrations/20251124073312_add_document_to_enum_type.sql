/*
  # Add 'document' to document_type enum

  ## Changes
  - Add 'document' as a valid value for the document_type enum
*/

-- Add 'document' to the enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'document' 
    AND enumtypid = 'document_type'::regtype
  ) THEN
    ALTER TYPE document_type ADD VALUE 'document';
  END IF;
END $$;
