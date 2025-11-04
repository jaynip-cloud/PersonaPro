/*
  # Add Storage RLS Policies for Client Documents

  1. Storage Policies
    - Allow authenticated users to upload files to their own folder
    - Allow authenticated users to read files from their own folder
    - Allow authenticated users to delete files from their own folder

  2. Security
    - Users can only access files in folders matching their user_id
    - Pattern: {user_id}/* for all user files
*/

-- Policy for uploading files (INSERT)
CREATE POLICY "Users can upload their own client documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for viewing files (SELECT)
CREATE POLICY "Users can view their own client documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for updating files (UPDATE)
CREATE POLICY "Users can update their own client documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for deleting files (DELETE)
CREATE POLICY "Users can delete their own client documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
