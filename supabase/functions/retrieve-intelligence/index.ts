import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RetrievalRequest {
  query: string;
  client_id: string;
  source_filters?: string[];
  top_k?: {
    meetings?: number;
    documents?: number;
    company_kb?: number;
  };
}

interface PineconeMatch {
  id: string;
  score: number;
  metadata: any;
}

interface ContextChunk {
  chunk_id: string;
  source_type: string;
  text: string;
  similarity_score: number;
  recency_score: number;
  final_score: number;
  metadata: any;
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

    const {
      query,
      client_id,
      source_filters = [],
      top_k = {}
    }: RetrievalRequest = await req.json();

    if (!query) {
      throw new Error('query is required');
    }

    if (!client_id) {
      throw new Error('client_id is required');
    }

    // Set default top_k values
    const topKMeetings = top_k.meetings || 10;
    const topKDocuments = top_k.documents || 10;
    const topKCompanyKB = top_k.company_kb || 6;

    console.log(`Intelligence Retrieval: "${query}" for client ${client_id}`);
    console.log(`Top K: meetings=${topKMeetings}, documents=${topKDocuments}, company_kb=${topKCompanyKB}`);

    // Get API keys
    const { data: apiKeys } = await supabaseClient
      .from('api_keys')
      .select('openai_api_key, pinecone_api_key, pinecone_environment, pinecone_index_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const openaiApiKey = apiKeys?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    const pineconeKey = apiKeys?.pinecone_api_key;
    let pineconeEnvironment = apiKeys?.pinecone_environment;
    let pineconeIndexName = apiKeys?.pinecone_index_name;

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!pineconeKey) {
      throw new Error('Pinecone API key not configured');
    }

    // Construct Pinecone URL
    let pineconeUrl = '';
    if (pineconeIndexName && pineconeIndexName.startsWith('https://')) {
      pineconeUrl = pineconeIndexName;
    } else if (pineconeEnvironment && pineconeEnvironment.startsWith('https://')) {
      pineconeUrl = pineconeEnvironment;
    } else if (pineconeIndexName && pineconeEnvironment) {
      pineconeUrl = `https://${pineconeIndexName}-${pineconeEnvironment}.svc.${pineconeEnvironment}.pinecone.io`;
    } else {
      throw new Error('Pinecone credentials not fully configured');
    }

    console.log(`Pinecone URL: ${pineconeUrl}`);

    // Step 1: Generate embedding for query
    console.log('Step 1: Generating query embedding...');
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 512,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to generate query embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    console.log('Query embedding generated');

    // Step 2: Query each namespace in Pinecone
    console.log('Step 2: Querying Pinecone namespaces...');

    const allChunks: ContextChunk[] = [];

    // Query meetings namespace
    if (source_filters.length === 0 || source_filters.includes('fathom_transcript')) {
      console.log(`Querying meetings namespace (top_k=${topKMeetings})...`);
      const meetingsFilter: any = {
        user_id: { $eq: user.id },
        client_id: { $eq: client_id },
        source_type: { $eq: 'fathom_transcript' }
      };

      const meetingsResults = await queryPinecone(
        pineconeUrl,
        pineconeKey,
        queryEmbedding,
        topKMeetings,
        meetingsFilter,
        'meetings'
      );
      allChunks.push(...meetingsResults);
    }

    // Query documents namespace
    if (source_filters.length === 0 || source_filters.includes('document')) {
      console.log(`Querying documents namespace (top_k=${topKDocuments})...`);
      const documentsFilter: any = {
        user_id: { $eq: user.id },
        client_id: { $eq: client_id },
        source_type: { $eq: 'document' }
      };

      const documentsResults = await queryPinecone(
        pineconeUrl,
        pineconeKey,
        queryEmbedding,
        topKDocuments,
        documentsFilter,
        'documents'
      );
      allChunks.push(...documentsResults);
    }

    // Query company_kb namespace (not filtered by client_id)
    if (source_filters.length === 0 || source_filters.includes('company_kb')) {
      console.log(`Querying company_kb namespace (top_k=${topKCompanyKB})...`);
      const companyKBFilter: any = {
        user_id: { $eq: user.id },
        source_type: { $in: ['service', 'case_study', 'technology', 'blog'] }
      };

      const companyKBResults = await queryPinecone(
        pineconeUrl,
        pineconeKey,
        queryEmbedding,
        topKCompanyKB,
        companyKBFilter,
        'company_kb'
      );
      allChunks.push(...companyKBResults);
    }

    console.log(`Total chunks retrieved: ${allChunks.length}`);

    // Step 3: Re-rank and merge results
    console.log('Step 3: Re-ranking results...');
    const rankedChunks = reRankChunks(allChunks, query);

    // Step 4: Select top 20 combined chunks
    const top20Chunks = rankedChunks.slice(0, 20);
    console.log(`Selected top ${top20Chunks.length} chunks`);

    // Step 5: Structure context bundle
    console.log('Step 4: Structuring context bundle...');
    const contextBundle = structureContextBundle(top20Chunks);

    // Step 6: Return context bundle
    return new Response(
      JSON.stringify({
        success: true,
        query,
        client_id,
        context: contextBundle,
        metadata: {
          total_chunks_retrieved: allChunks.length,
          top_chunks_selected: top20Chunks.length,
          breakdown: {
            meetings: contextBundle.meetings.length,
            documents: contextBundle.documents.length,
            company_kb: contextBundle.company_kb.length
          }
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in intelligence retrieval:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred during intelligence retrieval',
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

async function queryPinecone(
  pineconeUrl: string,
  apiKey: string,
  embedding: number[],
  topK: number,
  filter: any,
  namespace: string
): Promise<ContextChunk[]> {
  const response = await fetch(`${pineconeUrl}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter,
      namespace,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Pinecone query error for ${namespace}:`, errorText);
    return [];
  }

  const data = await response.json();
  const matches: PineconeMatch[] = data.matches || [];

  console.log(`  Found ${matches.length} matches in ${namespace}`);

  return matches.map((match) => {
    const created_at = match.metadata?.created_at || match.metadata?.meeting_date || null;
    const recency_score = calculateRecencyScore(created_at);

    return {
      chunk_id: match.id,
      source_type: match.metadata?.source_type || namespace,
      text: match.metadata?.text || '',
      similarity_score: match.score,
      recency_score,
      final_score: 0,
      metadata: match.metadata || {}
    };
  });
}

function calculateRecencyScore(created_at: string | null): number {
  if (!created_at) return 0;

  const now = new Date();
  const createdDate = new Date(created_at);
  const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff < 7) return 1.0;
  if (daysDiff < 30) return 0.8;
  if (daysDiff < 90) return 0.5;
  if (daysDiff < 180) return 0.3;
  return 0.1;
}

function reRankChunks(chunks: ContextChunk[], query: string): ContextChunk[] {
  const queryLower = query.toLowerCase();

  // Detect query type based on keywords
  const isBehaviorQuery = /\b(how|why|sentiment|feeling|think|opinion|behavior|attitude)\b/i.test(query);
  const isFactQuery = /\b(what|when|where|which|fact|data|number|case study|example)\b/i.test(query);
  const isCapabilityQuery = /\b(can you|do you|service|offering|capability|technology|solution)\b/i.test(query);

  return chunks.map(chunk => {
    let score = chunk.similarity_score * 0.7;
    score += chunk.recency_score * 0.15;

    // Apply source priority based on query type
    if (isBehaviorQuery && chunk.source_type === 'fathom_transcript') {
      score += 0.15;
    } else if (isFactQuery && chunk.source_type === 'document') {
      score += 0.15;
    } else if (isCapabilityQuery && ['service', 'case_study', 'technology', 'blog'].includes(chunk.source_type)) {
      score += 0.15;
    } else {
      score += 0.05;
    }

    chunk.final_score = score;
    return chunk;
  }).sort((a, b) => b.final_score - a.final_score);
}

function structureContextBundle(chunks: ContextChunk[]) {
  const meetings: any[] = [];
  const documents: any[] = [];
  const company_kb: any[] = [];

  for (const chunk of chunks) {
    const item = {
      chunk_id: chunk.chunk_id,
      text: chunk.text,
      similarity_score: chunk.similarity_score,
      final_score: chunk.final_score,
      source_type: chunk.source_type,
    };

    if (chunk.source_type === 'fathom_transcript') {
      meetings.push({
        ...item,
        recording_id: chunk.metadata.recording_id,
        recording_title: chunk.metadata.recording_title,
        meeting_date: chunk.metadata.meeting_date,
        speaker_name: chunk.metadata.speaker_name,
        speaker_email: chunk.metadata.speaker_email,
        start_timestamp: chunk.metadata.start_timestamp,
        end_timestamp: chunk.metadata.end_timestamp,
        playback_url: chunk.metadata.playback_url,
      });
    } else if (chunk.source_type === 'document') {
      documents.push({
        ...item,
        document_id: chunk.metadata.document_id,
        title: chunk.metadata.title,
        url: chunk.metadata.url,
        page_number: chunk.metadata.page_number,
        chunk_index: chunk.metadata.chunk_index,
      });
    } else {
      company_kb.push({
        ...item,
        document_id: chunk.metadata.document_id,
        title: chunk.metadata.title,
        url: chunk.metadata.url,
        chunk_index: chunk.metadata.chunk_index,
      });
    }
  }

  return {
    meetings,
    documents,
    company_kb,
  };
}
