/*
  # Enable Vector Extension and Create Document Embeddings Schema

  1. Extensions
    - Enable `vector` extension for storing and searching embeddings
  
  2. New Tables
    - `document_embeddings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `client_id` (uuid, optional reference to clients)
      - `document_name` (text) - original filename
      - `document_url` (text) - storage URL
      - `content_chunk` (text) - text chunk that was embedded
      - `chunk_index` (int) - order of chunk in document
      - `embedding` (vector(1536)) - OpenAI ada-002 embedding dimension
      - `metadata` (jsonb) - additional context (file type, upload date, tags)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  3. Indexes
    - HNSW index on embeddings for fast similarity search
    - Regular indexes on user_id, client_id for filtering
  
  4. Security
    - Enable RLS on document_embeddings
    - Users can only access their own embeddings
    - Policies for select, insert, update, delete
*/

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_url text,
  content_chunk text NOT NULL,
  chunk_index int NOT NULL DEFAULT 0,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_embeddings_user_id ON document_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_client_id ON document_embeddings(client_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_created_at ON document_embeddings(created_at DESC);

-- Create HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding 
  ON document_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own document embeddings"
  ON document_embeddings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document embeddings"
  ON document_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own document embeddings"
  ON document_embeddings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own document embeddings"
  ON document_embeddings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_document_embeddings_updated_at
  BEFORE UPDATE ON document_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_document_embeddings_updated_at();