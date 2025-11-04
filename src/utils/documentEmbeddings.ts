import { supabase } from '../lib/supabase';

export interface DocumentProcessingOptions {
  clientId?: string;
  metadata?: Record<string, any>;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;

  if (fileType === 'application/pdf') {
    return await extractTextFromPDF(file);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await extractTextFromDOCX(file);
  } else if (fileType === 'text/plain') {
    return await file.text();
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  let text = '';
  const decoder = new TextDecoder('utf-8');
  const content = decoder.decode(uint8Array);

  const textMatches = content.match(/\(([^)]+)\)/g);
  if (textMatches) {
    text = textMatches.map(match => match.slice(1, -1)).join(' ');
  }

  text = text.replace(/\\[0-9]{3}/g, ' ')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text || text.length < 50) {
    return `[PDF content from ${file.name}] - Content extraction requires server-side processing`;
  }

  return text;
}

async function extractTextFromDOCX(file: File): Promise<string> {
  return `[DOCX content from ${file.name}] - Full text extraction requires server-side processing`;
}

export async function uploadDocumentToStorage(
  file: File,
  clientId?: string
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = clientId
    ? `${user.id}/${clientId}/${fileName}`
    : `${user.id}/knowledge-base/${fileName}`;

  const { data, error } = await supabase.storage
    .from('client-documents')
    .upload(filePath, file);

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error('Failed to upload document to storage');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('client-documents')
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function generateDocumentEmbeddings(
  documentName: string,
  documentUrl: string,
  content: string,
  options: DocumentProcessingOptions = {}
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('User not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embeddings`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentName,
        documentUrl,
        content,
        clientId: options.clientId,
        metadata: options.metadata,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate embeddings');
  }

  const result = await response.json();
  return result;
}

export async function processAndEmbedDocument(
  file: File,
  options: DocumentProcessingOptions = {}
): Promise<{ url: string; embeddings: any }> {
  try {
    const documentUrl = await uploadDocumentToStorage(file, options.clientId);

    const content = await extractTextFromFile(file);

    const embeddingsResult = await generateDocumentEmbeddings(
      file.name,
      documentUrl,
      content,
      {
        ...options,
        metadata: {
          ...options.metadata,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
        },
      }
    );

    return {
      url: documentUrl,
      embeddings: embeddingsResult,
    };
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

export interface SemanticSearchOptions {
  clientId?: string;
  limit?: number;
  similarityThreshold?: number;
}

export async function semanticSearch(
  query: string,
  options: SemanticSearchOptions = {}
): Promise<any[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('User not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-search`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        clientId: options.clientId,
        limit: options.limit || 5,
        similarityThreshold: options.similarityThreshold || 0.7,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to perform semantic search');
  }

  const result = await response.json();
  return result.results || [];
}
