import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 50;
const BATCH_SIZE = 50;

interface ProcessRequest {
  document_id: string;
  text: string;
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

    // Get API keys
    const { data: apiKeys, error: keysError } = await supabaseClient
      .from('api_keys')
      .select('openai_api_key, pinecone_api_key, pinecone_environment, pinecone_index_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keysError || !apiKeys?.openai_api_key) {
      throw new Error('OpenAI API key not configured. Please add it in Settings.');
    }

    if (!apiKeys.pinecone_api_key || !apiKeys.pinecone_environment || !apiKeys.pinecone_index_name) {
      throw new Error('Pinecone credentials not configured. Please add them in Settings.');
    }

    console.log('Using Pinecone for vector storage');

    const body: ProcessRequest = await req.json();
    const { document_id, text } = body;

    if (!document_id || !text) {
      throw new Error('document_id and text are required');
    }

    console.log(`Processing document ${document_id}, text length: ${text.length}`);

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

    // Step 1: Chunk the text
    console.log('Step 1: Chunking text...');
    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`Created ${chunks.length} chunks`);

    // Step 2: Delete existing chunks and Pinecone vectors for this document
    console.log('Step 2: Cleaning up existing data...');

    // Get existing chunk IDs to delete from Pinecone
    const { data: existingChunks } = await supabaseClient
      .from('kb_document_chunks')
      .select('id')
      .eq('document_id', document_id);

    if (existingChunks && existingChunks.length > 0) {
      const chunkIds = existingChunks.map(c => c.id);
      console.log(`Deleting ${chunkIds.length} existing vectors from Pinecone...`);

      await deleteFromPinecone(
        apiKeys.pinecone_api_key,
        apiKeys.pinecone_environment,
        apiKeys.pinecone_index_name,
        chunkIds
      );
    }

    // Delete chunks from Postgres
    await supabaseClient
      .from('kb_document_chunks')
      .delete()
      .eq('document_id', document_id);

    // Step 3: Insert chunks into database
    console.log('Step 3: Inserting chunks into database...');
    const chunkRecords = chunks.map((chunk, index) => ({
      document_id,
      client_id: document.client_id,
      chunk_index: index,
      text: chunk.text,
      start_char: chunk.start,
      end_char: chunk.end,
      page_number: null,
      source_type: document.source_type,
      url: document.url,
      metadata: document.metadata || {},
    }));

    const { data: insertedChunks, error: insertError } = await supabaseClient
      .from('kb_document_chunks')
      .insert(chunkRecords)
      .select();

    if (insertError || !insertedChunks) {
      throw new Error(`Failed to insert chunks: ${insertError?.message}`);
    }

    console.log(`Inserted ${insertedChunks.length} chunks`);

    // Step 4: Generate embeddings in batches
    console.log('Step 4: Generating embeddings...');
    const allEmbeddings = [];
    
    for (let i = 0; i < insertedChunks.length; i += BATCH_SIZE) {
      const batch = insertedChunks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(insertedChunks.length / BATCH_SIZE)}`);
      
      const batchTexts = batch.map(c => c.text);
      const embeddings = await generateEmbeddings(batchTexts, apiKeys.openai_api_key);
      
      for (let j = 0; j < batch.length; j++) {
        allEmbeddings.push({
          chunk: batch[j],
          embedding: embeddings[j],
        });
      }
      
      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < insertedChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Generated ${allEmbeddings.length} embeddings`);

    // Step 5: Upload to Pinecone
    console.log('Step 5: Uploading vectors to Pinecone...');
    await uploadToPinecone(
      apiKeys.pinecone_api_key,
      apiKeys.pinecone_environment,
      apiKeys.pinecone_index_name,
      allEmbeddings,
      document
    );

    // Step 6: Update document status
    console.log('Step 6: Updating document status...');
    await supabaseClient
      .from('kb_documents')
      .update({
        status: 'embedded',
        chunk_count: insertedChunks.length,
        error_message: null,
      })
      .eq('id', document_id);

    console.log('Document processing complete!');

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        chunks_created: insertedChunks.length,
        embeddings_generated: allEmbeddings.length,
        status: 'embedded',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Error processing document embeddings:', error);
    
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

// Chunk text with overlap
function chunkText(
  text: string,
  chunkSize: number,
  overlap: number
): Array<{ text: string; start: number; end: number }> {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunkText = text.substring(start, end);
    
    chunks.push({
      text: chunkText,
      start,
      end,
    });
    
    // Move start forward, accounting for overlap
    start = end - overlap;
    
    // Ensure we don't create tiny chunks at the end
    if (start >= text.length - overlap) {
      break;
    }
  }
  
  return chunks;
}

// Generate embeddings using OpenAI
async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 512,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.data.map((item: any) => item.embedding);
}

// Upload embeddings to Pinecone
async function uploadToPinecone(
  apiKey: string,
  environment: string,
  indexName: string,
  embeddings: Array<{ chunk: any; embedding: number[] }>,
  document: any
): Promise<void> {
  const pineconeUrl = `https://${indexName}-${environment}.svc.${environment}.pinecone.io`;

  // Prepare vectors for Pinecone
  const vectors = embeddings.map(({ chunk, embedding }) => ({
    id: chunk.id,
    values: embedding,
    metadata: {
      chunk_id: chunk.id,
      document_id: document.id,
      client_id: document.client_id,
      source_type: document.source_type,
      title: document.title,
      url: document.url || '',
      text: chunk.text,
      chunk_index: chunk.chunk_index,
      page_number: chunk.page_number,
      created_at: chunk.created_at,
    },
  }));

  // Upload in batches (Pinecone recommends 100 vectors per batch)
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);

    const response = await fetch(`${pineconeUrl}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vectors: batch,
        namespace: '', // Use default namespace
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinecone upload error: ${response.status} ${error}`);
    }

    console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1} to Pinecone`);
  }
}

// Delete vectors from Pinecone
async function deleteFromPinecone(
  apiKey: string,
  environment: string,
  indexName: string,
  chunkIds: string[]
): Promise<void> {
  const pineconeUrl = `https://${indexName}-${environment}.svc.${environment}.pinecone.io`;

  // Delete in batches
  const batchSize = 1000;
  for (let i = 0; i < chunkIds.length; i += batchSize) {
    const batch = chunkIds.slice(i, i + batchSize);

    const response = await fetch(`${pineconeUrl}/vectors/delete`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: batch,
        namespace: '',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn(`Pinecone delete warning: ${response.status} ${error}`);
    }
  }
}

