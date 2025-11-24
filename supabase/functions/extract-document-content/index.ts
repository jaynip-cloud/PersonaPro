import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractionRequest {
  document_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: ExtractionRequest = await req.json();
    const { document_id } = body;

    if (!document_id) {
      throw new Error('document_id is required');
    }

    console.log(`Starting content extraction for document: ${document_id}`);

    // Fetch document metadata
    const { data: document, error: docError } = await supabaseClient
      .from('kb_documents')
      .select('*')
      .eq('id', document_id)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found or access denied');
    }

    console.log(`Document type: ${document.source_type}, status: ${document.status}`);

    let extractedText = '';
    let metadata: any = document.metadata || {};

    // Route to appropriate extraction method based on source_type
    switch (document.source_type) {
      case 'file_upload':
        const result = await extractFromFile(supabaseClient, document, authHeader);
        extractedText = result.text;
        metadata = { ...metadata, ...result.metadata };
        break;

      case 'single_url':
        const urlResult = await extractFromUrl(document.url);
        extractedText = urlResult.text;
        metadata = { ...metadata, ...urlResult.metadata };
        break;

      case 'website_crawl':
        const crawlResult = await extractFromUrl(document.url);
        extractedText = crawlResult.text;
        metadata = { ...metadata, ...crawlResult.metadata };
        break;

      case 'notion':
        throw new Error('Notion extraction not yet implemented');

      default:
        throw new Error(`Unsupported source_type: ${document.source_type}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content extracted from document');
    }

    console.log(`Extracted ${extractedText.length} characters of text`);

    // Update document with extracted content metadata
    const { error: updateError } = await supabaseClient
      .from('kb_documents')
      .update({
        status: 'content_extracted',
        content_length: extractedText.length,
        metadata: metadata,
        error_message: null,
      })
      .eq('id', document_id);

    if (updateError) {
      throw updateError;
    }

    // Trigger chunking and embedding
    console.log('Triggering chunking and embedding pipeline...');
    const embeddingResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-document-embeddings`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id,
          text: extractedText,
        }),
      }
    );

    if (!embeddingResponse.ok) {
      console.warn('Failed to trigger embedding pipeline:', await embeddingResponse.text());
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        content_length: extractedText.length,
        status: 'content_extracted',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Error extracting document content:', error);
    
    // Try to update document status to failed
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        
        const body: ExtractionRequest = await req.json();
        await supabaseClient
          .from('kb_documents')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', body.document_id);
      }
    } catch (e) {
      console.error('Failed to update document status:', e);
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Extract text from uploaded file
async function extractFromFile(
  supabase: any,
  document: any,
  authHeader: string
): Promise<{ text: string; metadata: any }> {
  console.log(`Extracting from file: ${document.storage_path}`);
  
  if (!document.storage_path) {
    throw new Error('No storage_path found for file upload');
  }

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('documents')
    .download(document.storage_path);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download file: ${downloadError?.message}`);
  }

  const mimeType = document.mime_type || '';
  console.log(`File mime type: ${mimeType}`);

  // Handle different file types
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    const text = await fileData.text();
    return {
      text,
      metadata: { file_size: fileData.size },
    };
  }

  if (mimeType === 'application/pdf') {
    // For PDF, we'll need to use an external service or return placeholder
    // In production, integrate with pdf-parse or similar
    throw new Error('PDF extraction requires additional setup. Please use URL extraction or wait for PDF support.');
  }

  if (mimeType.includes('json')) {
    const jsonText = await fileData.text();
    const jsonData = JSON.parse(jsonText);
    // Extract meaningful text from JSON
    const text = extractTextFromJson(jsonData);
    return {
      text,
      metadata: { file_size: fileData.size, format: 'json' },
    };
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

// Extract text from URL
async function extractFromUrl(url: string): Promise<{ text: string; metadata: any }> {
  console.log(`Extracting from URL: ${url}`);
  
  if (!url) {
    throw new Error('No URL provided');
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PersonaPro-KnowledgeBase/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  console.log(`URL content type: ${contentType}`);

  if (contentType.includes('text/html')) {
    const html = await response.text();
    return extractFromHtml(html, url);
  }

  if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
    const text = await response.text();
    return {
      text,
      metadata: { content_type: contentType },
    };
  }

  if (contentType.includes('application/json')) {
    const jsonText = await response.text();
    const jsonData = JSON.parse(jsonText);
    const text = extractTextFromJson(jsonData);
    return {
      text,
      metadata: { content_type: contentType, format: 'json' },
    };
  }

  throw new Error(`Unsupported content type: ${contentType}`);
}

// Extract text from HTML
function extractFromHtml(html: string, url: string): { text: string; metadata: any } {
  // Basic HTML parsing - in production, use a proper HTML parser
  // Remove script and style tags
  let cleaned = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
  cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gis, '');
  
  // Extract title
  const titleMatch = cleaned.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Extract meta description
  const metaMatch = cleaned.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const description = metaMatch ? metaMatch[1].trim() : '';
  
  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities (basic)
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Combine title, description, and body
  let text = '';
  if (title) text += `Title: ${title}\n\n`;
  if (description) text += `Description: ${description}\n\n`;
  text += cleaned;
  
  return {
    text,
    metadata: {
      title,
      description,
      url,
      extracted_from: 'html',
    },
  };
}

// Extract meaningful text from JSON
function extractTextFromJson(obj: any, depth = 0, maxDepth = 5): string {
  if (depth > maxDepth) return '';
  
  let text = '';
  
  if (typeof obj === 'string') {
    return obj + ' ';
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj) + ' ';
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      text += extractTextFromJson(item, depth + 1, maxDepth);
    }
    return text;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      // Include key if it looks like a label
      if (key.length < 50 && !key.startsWith('_') && key !== 'id') {
        text += key + ': ';
      }
      text += extractTextFromJson(value, depth + 1, maxDepth);
    }
    return text;
  }
  
  return '';
}
