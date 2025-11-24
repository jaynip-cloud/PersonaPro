/*
  # Change Documents Default Type to 'document'

  ## Changes
  - Change the default value of documents.type column from 'other' to 'document'

  ## Impact
  - New documents will default to type 'document' instead of 'other'
  - Existing documents are not affected
*/

-- Change the default value from 'other' to 'document'
ALTER TABLE documents 
ALTER COLUMN type SET DEFAULT 'document'::document_type;
