import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 50;
const BATCH_SIZE = 50;

interface EmbeddingRequest {
  documentName: string;
  documentUrl: string;
  content: string;
  clientId?: string;
  metadata?: Record<string, any>;
}

function chunkText(text: string, chunkSize: number, overlap: number): Array<{ text: string; index: number }> {
  const words = text.split(/\s+/);
  const chunks: Array<{ text: string; index: number }> = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize);
    const chunkText = chunkWords.join(' ');

    if (chunkText.trim().length > 0) {
      chunks.push({
        text: chunkText,
        index: chunks.length,
      });
    }

    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

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

async function uploadToPinecone(
  apiKey: string,
  environment: string,
  indexName: string,
  embeddings: Array<{ chunk: any; embedding: number[] }>,
  documentName: string,
  documentUrl: string,
  clientId: string | null,
  userId: string,
  metadata: Record<string, any>
): Promise<void> {
  const host = `https://${indexName}-${environment}.svc.aped-4627-b74a.pinecone.io`;

  for (let i = 0; i < embeddings.length; i += BATCH_SIZE) {
    const batch = embeddings.slice(i, i + BATCH_SIZE);

    const vectors = batch.map((item) => ({
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(7)}_${item.chunk.index}`,
      values: item.embedding,
      metadata: {
        text: item.chunk.text,
        chunk_index: item.chunk.index,
        document_name: documentName,
        document_url: documentUrl,
        client_id: clientId,
        user_id: userId,
        source_type: 'document',
        ...metadata,
      },
    }));

    const response = await fetch(`${host}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vectors }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinecone upsert failed: ${response.status} ${errorText}`);
    }

    console.log(`Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1} to Pinecone`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { documentName, documentUrl, content, clientId, metadata = {} }: EmbeddingRequest = await req.json();

    if (!documentName || !content) {
      throw new Error('documentName and content are required');
    }

    console.log(`Processing document: ${documentName} for client: ${clientId || 'none'}`);

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

    const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`Created ${chunks.length} chunks`);

    const chunkTexts = chunks.map(c => c.text);
    console.log('Generating embeddings with OpenAI...');
    const embeddings = await generateEmbeddings(chunkTexts, apiKeys.openai_api_key);
    console.log(`Generated ${embeddings.length} embeddings`);

    const embeddingsWithChunks = chunks.map((chunk, idx) => ({
      chunk,
      embedding: embeddings[idx],
    }));

    console.log('Uploading to Pinecone...');
    await uploadToPinecone(
      apiKeys.pinecone_api_key,
      apiKeys.pinecone_environment,
      apiKeys.pinecone_index_name,
      embeddingsWithChunks,
      documentName,
      documentUrl,
      clientId || null,
      user.id,
      metadata
    );

    console.log('Successfully completed document processing');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${chunks.length} chunks and stored in Pinecone`,
        chunksProcessed: chunks.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while generating embeddings',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
