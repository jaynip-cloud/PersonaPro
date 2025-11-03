/*
  # Setup Client Documents Storage

  1. Storage Bucket
    - Create `client-documents` bucket for storing client files
    - Private bucket (not publicly accessible)
    - 10MB file size limit

  2. Notes
    - RLS policies for storage are managed through Supabase dashboard
    - Bucket created with appropriate settings
    - Supports PDF, DOC, DOCX, TXT, CSV, XLSX file types
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;
