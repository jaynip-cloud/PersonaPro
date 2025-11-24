/*
  # Create Knowledge Base Documents System

  ## Overview
  Complete pipeline for document ingestion, content extraction, chunking, embedding generation,
  and Qdrant vector storage. Supports file uploads, URLs, website crawls, and Notion integration.

  ## New Tables
  
  1. `kb_documents` - Main documents table
  2. `kb_document_chunks` - Text chunks for embeddings
  3. `kb_query_suggestions` - AI-generated search questions
  4. `kb_notion_connections` - Notion OAuth integration
  5. `kb_website_crawls` - Website crawling jobs

  ## Key Features
  - Multi-source ingestion (files, URLs, crawls, Notion)
  - Automatic text chunking (400 chars with overlap)
  - Qdrant vector storage integration
  - RLS security for multi-tenant access
*/

-- =====================================================
-- 1. KB_DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kb_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Source tracking
  source_type text NOT NULL CHECK (source_type IN ('file_upload', 'single_url', 'website_crawl', 'notion')),
  title text NOT NULL,
  description text DEFAULT '',
  url text,
  storage_path text,
  mime_type text,
  
  -- Processing status
  status text NOT NULL DEFAULT 'pending_extraction' CHECK (
    status IN ('pending_extraction', 'content_extracted', 'embedded', 'failed')
  ),
  error_message text,
  
  -- Content metrics
  content_length integer DEFAULT 0,
  chunk_count integer DEFAULT 0,
  
  -- Flexible metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_kb_documents_user_id ON kb_documents(user_id);
CREATE INDEX idx_kb_documents_client_id ON kb_documents(client_id);
CREATE INDEX idx_kb_documents_source_type ON kb_documents(source_type);
CREATE INDEX idx_kb_documents_status ON kb_documents(status);
CREATE INDEX idx_kb_documents_created_at ON kb_documents(created_at DESC);

-- =====================================================
-- 2. KB_DOCUMENT_CHUNKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kb_document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Chunk details
  chunk_index integer NOT NULL,
  text text NOT NULL,
  start_char integer NOT NULL,
  end_char integer NOT NULL,
  
  -- Source context
  page_number integer,
  source_type text NOT NULL,
  url text,
  
  -- Flexible metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT kb_document_chunks_unique_index UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_kb_document_chunks_document_id ON kb_document_chunks(document_id);
CREATE INDEX idx_kb_document_chunks_client_id ON kb_document_chunks(client_id);
CREATE INDEX idx_kb_document_chunks_source_type ON kb_document_chunks(source_type);

-- =====================================================
-- 3. KB_QUERY_SUGGESTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kb_query_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  
  question text NOT NULL,
  category text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_kb_query_suggestions_document_id ON kb_query_suggestions(document_id);
CREATE INDEX idx_kb_query_suggestions_client_id ON kb_query_suggestions(client_id);

-- =====================================================
-- 4. KB_NOTION_CONNECTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kb_notion_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  workspace_id text NOT NULL,
  workspace_name text,
  
  -- OAuth tokens
  access_token text NOT NULL,
  bot_id text,
  
  -- Sync tracking
  last_sync_at timestamptz,
  sync_status text DEFAULT 'active' CHECK (sync_status IN ('active', 'error', 'disconnected')),
  
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT kb_notion_connections_unique_workspace UNIQUE (user_id, workspace_id)
);

CREATE INDEX idx_kb_notion_connections_user_id ON kb_notion_connections(user_id);

-- =====================================================
-- 5. KB_WEBSITE_CRAWLS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kb_website_crawls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  
  root_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'crawling', 'completed', 'failed')
  ),
  
  -- Crawl config
  max_depth integer DEFAULT 2,
  max_pages integer DEFAULT 50,
  
  -- Progress tracking
  pages_discovered integer DEFAULT 0,
  pages_processed integer DEFAULT 0,
  pages_failed integer DEFAULT 0,
  
  -- Results
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_kb_website_crawls_user_id ON kb_website_crawls(user_id);
CREATE INDEX idx_kb_website_crawls_client_id ON kb_website_crawls(client_id);
CREATE INDEX idx_kb_website_crawls_status ON kb_website_crawls(status);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_query_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_notion_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_website_crawls ENABLE ROW LEVEL SECURITY;

-- KB Documents policies
CREATE POLICY "Users can view own kb documents"
  ON kb_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kb documents"
  ON kb_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kb documents"
  ON kb_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own kb documents"
  ON kb_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- KB Document chunks policies
CREATE POLICY "Users can view own kb document chunks"
  ON kb_document_chunks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kb_documents
      WHERE kb_documents.id = kb_document_chunks.document_id
      AND kb_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own kb document chunks"
  ON kb_document_chunks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kb_documents
      WHERE kb_documents.id = kb_document_chunks.document_id
      AND kb_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own kb document chunks"
  ON kb_document_chunks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kb_documents
      WHERE kb_documents.id = kb_document_chunks.document_id
      AND kb_documents.user_id = auth.uid()
    )
  );

-- KB Query suggestions policies
CREATE POLICY "Users can view own kb query suggestions"
  ON kb_query_suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kb_documents
      WHERE kb_documents.id = kb_query_suggestions.document_id
      AND kb_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own kb query suggestions"
  ON kb_query_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kb_documents
      WHERE kb_documents.id = kb_query_suggestions.document_id
      AND kb_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own kb query suggestions"
  ON kb_query_suggestions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kb_documents
      WHERE kb_documents.id = kb_query_suggestions.document_id
      AND kb_documents.user_id = auth.uid()
    )
  );

-- KB Notion connections policies
CREATE POLICY "Users can view own kb notion connections"
  ON kb_notion_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kb notion connections"
  ON kb_notion_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kb notion connections"
  ON kb_notion_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own kb notion connections"
  ON kb_notion_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- KB Website crawls policies
CREATE POLICY "Users can view own kb website crawls"
  ON kb_website_crawls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kb website crawls"
  ON kb_website_crawls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kb website crawls"
  ON kb_website_crawls FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own kb website crawls"
  ON kb_website_crawls FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kb_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_documents_updated_at
  BEFORE UPDATE ON kb_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_documents_updated_at();

CREATE TRIGGER kb_notion_connections_updated_at
  BEFORE UPDATE ON kb_notion_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_documents_updated_at();

CREATE TRIGGER kb_website_crawls_updated_at
  BEFORE UPDATE ON kb_website_crawls
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_documents_updated_at();
