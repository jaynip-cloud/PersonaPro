import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logger, LogContext } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  query: string;
  clientId: string;
  mode: 'quick' | 'deep';
}

interface AgentResponse {
  answer: string;
  citations: Array<{
    source: string;
    type: 'document' | 'transcript' | 'client_data' | 'apollo' | 'contact';
    relevance?: number;
  }>;
  sources: string[];
  processingTime: number;
  mode: 'quick' | 'deep';
  model: string;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let context: LogContext = { functionName: 'intelligence-agent' };

  logger.startFlow('INTELLIGENCE AGENT QUERY', context);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    logger.step('CORS', 'Handling preflight request', context);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Step 1: Authentication
    logger.step('AUTH', 'Starting authentication', context);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('Missing authorization header', context);
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      logger.error('Authentication failed', context, { error: userError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.userId = user.id;
    logger.success('User authenticated', context, { userId: user.id });

    // Step 2: Parse request
    logger.step('PARSE', 'Parsing request body', context);
    const body: RequestBody = await req.json();
    const { query, clientId, mode = 'quick' } = body;

    if (!query || !clientId) {
      logger.error('Missing required fields', context, { body });
      return new Response(
        JSON.stringify({ error: 'query and clientId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.clientId = clientId;
    logger.info('Request validated', context, { query, clientId, mode });

    // Step 3: Get API key
    logger.step('CONFIG', 'Retrieving OpenAI API key', context);
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      logger.error('OPENAI_API_KEY not found', context);
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    logger.success('API key retrieved', context);

    // Step 4: Fetch all data sources in parallel
    logger.step('DATA_FETCH', 'Fetching all data sources', context);
    
    const [clientData, contacts, semanticResults, chatHistory, opportunities] = await Promise.all([
      fetchClientData(clientId, supabaseClient, context),
      fetchContacts(clientId, supabaseClient, context),
      performSemanticSearch(query, clientId, supabaseClient, user.id, context, authHeader),
      fetchChatHistory(clientId, supabaseClient, context),
      fetchOpportunities(clientId, supabaseClient, context),
    ]);

    logger.success('All data sources fetched', context, {
      hasClientData: !!clientData,
      contactsCount: contacts.length,
      semanticResultsCount: semanticResults.length,
      chatHistoryCount: chatHistory.length,
      opportunitiesCount: opportunities.length,
    });

    // Step 5: Build context prompt
    logger.step('PROMPT', 'Building comprehensive context prompt', context);
    const contextPrompt = buildContextPrompt(
      query,
      clientData,
      contacts,
      semanticResults,
      chatHistory,
      opportunities,
      mode
    );

    logger.debug('Context prompt built', context, {
      promptLength: contextPrompt.length,
      estimatedTokens: Math.ceil(contextPrompt.length / 4),
    });

    // Step 6: Call LLM
    logger.step('LLM_CALL', `Calling LLM (${mode === 'quick' ? 'GPT-4o' : 'GPT-5.1'})`, context);
    const model = mode === 'quick' ? 'gpt-4o' : 'gpt-5.1';
    const llmResponse = await callLLM(contextPrompt, query, model, openaiApiKey, mode, context);

    // Step 7: Extract citations
    const citations = extractCitations(semanticResults, clientData, contacts);

    const totalDuration = Date.now() - startTime;

    const response: AgentResponse = {
      answer: llmResponse,
      citations,
      sources: citations.map(c => c.source),
      processingTime: totalDuration,
      mode,
      model,
    };

    logger.endFlow('INTELLIGENCE AGENT QUERY', context, {
      duration: `${totalDuration}ms`,
      mode,
      model,
      answerLength: llmResponse.length,
      citationsCount: citations.length,
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logger.error('Error processing query', context, { error: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process query', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

async function fetchClientData(
  clientId: string,
  supabaseClient: any,
  context: LogContext
): Promise<any> {
  try {
    logger.debug('Fetching client data', context, { clientId });
    
    const { data, error } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', context.userId)
      .single();

    if (error) {
      logger.warn('Failed to fetch client data', context, { error: error.message });
      return null;
    }

    if (!data) {
      logger.warn('Client not found', context, { clientId });
      return null;
    }

    logger.debug('Client data fetched', context, {
      company: data.company,
      hasApolloData: !!data.apollo_data,
    });

    return data;
  } catch (error: any) {
    logger.error('Error fetching client data', context, { error: error.message });
    return null;
  }
}

async function fetchContacts(
  clientId: string,
  supabaseClient: any,
  context: LogContext
): Promise<any[]> {
  try {
    logger.debug('Fetching contacts', context, { clientId });
    
    const { data, error } = await supabaseClient
      .from('contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('is_decision_maker', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.warn('Failed to fetch contacts', context, { error: error.message });
      return [];
    }

    logger.debug('Contacts fetched', context, { count: data?.length || 0 });
    return data || [];
  } catch (error: any) {
    logger.error('Error fetching contacts', context, { error: error.message });
    return [];
  }
}

async function performSemanticSearch(
  query: string,
  clientId: string,
  supabaseClient: any,
  userId: string,
  context: LogContext,
  authHeader: string
): Promise<any[]> {
  try {
    logger.debug('Performing semantic search', context, { query, clientId });
    
    // Use the existing semantic-search function
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    
    if (!authHeader) {
      return [];
    }

    const searchResponse = await fetch(
      `${supabaseUrl}/functions/v1/semantic-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          query,
          clientId,
          limit: (context as any).mode === 'quick' ? 5 : 10,
          similarityThreshold: 0.7,
        }),
      }
    );

    if (!searchResponse.ok) {
      logger.warn('Semantic search failed', context, { 
        status: searchResponse.status 
      });
      return [];
    }

    const searchResult = await searchResponse.json();
    const results = searchResult.results || [];

    logger.debug('Semantic search completed', context, { 
      resultsCount: results.length 
    });

    return results;
  } catch (error: any) {
    logger.warn('Error performing semantic search', context, { 
      error: error.message 
    });
    return [];
  }
}

async function fetchChatHistory(
  clientId: string,
  supabaseClient: any,
  context: LogContext
): Promise<any[]> {
  try {
    logger.debug('Fetching chat history', context, { clientId });
    
    const { data, error } = await supabaseClient
      .from('chat_history')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.warn('Failed to fetch chat history', context, { error: error.message });
      return [];
    }

    // Reverse to get chronological order
    const history = (data || []).reverse();

    logger.debug('Chat history fetched', context, { count: history.length });
    return history;
  } catch (error: any) {
    logger.error('Error fetching chat history', context, { error: error.message });
    return [];
  }
}

async function fetchOpportunities(
  clientId: string,
  supabaseClient: any,
  context: LogContext
): Promise<any[]> {
  try {
    logger.debug('Fetching opportunities', context, { clientId });
    
    const { data, error } = await supabaseClient
      .from('opportunities')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.warn('Failed to fetch opportunities', context, { error: error.message });
      return [];
    }

    logger.debug('Opportunities fetched', context, { count: data?.length || 0 });
    return data || [];
  } catch (error: any) {
    logger.error('Error fetching opportunities', context, { error: error.message });
    return [];
  }
}

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

function buildContextPrompt(
  query: string,
  clientData: any,
  contacts: any[],
  semanticResults: any[],
  chatHistory: any[],
  opportunities: any[],
  mode: 'quick' | 'deep'
): string {
  let prompt = `# CLIENT INTELLIGENCE CONTEXT

You are an expert business intelligence analyst. Answer the user's query using ONLY the information provided in the context below. Be accurate, comprehensive, and cite your sources.

## CLIENT INFORMATION
`;

  if (clientData) {
    prompt += `
**Company:** ${clientData.company || clientData.name || 'N/A'}
**Industry:** ${clientData.industry || 'N/A'}
**Location:** ${[clientData.city, clientData.state, clientData.country].filter(Boolean).join(', ') || 'N/A'}
**Website:** ${clientData.website || 'N/A'}
**Founded:** ${clientData.founded || 'N/A'}
**Company Size:** ${clientData.companySize || clientData.employeeCount || 'N/A'}
**Annual Revenue:** ${clientData.annualRevenue ? `$${clientData.annualRevenue.toLocaleString()}` : clientData.apolloData?.annualRevenuePrinted || 'N/A'}
**Total Funding:** ${clientData.totalFunding ? `$${clientData.totalFunding.toLocaleString()}` : clientData.apolloData?.totalFundingPrinted || 'N/A'}
**Description:** ${clientData.description || 'N/A'}
`;

    // Apollo Data
    if (clientData.apollo_data) {
      const apollo = clientData.apollo_data;
      prompt += `\n### Apollo Intelligence Data\n`;
      
      if (apollo.keywords && apollo.keywords.length > 0) {
        prompt += `**Keywords:** ${apollo.keywords.slice(0, 20).join(', ')}\n`;
      }
      
      if (apollo.currentTechnologies && apollo.currentTechnologies.length > 0) {
        prompt += `**Technologies:** ${apollo.currentTechnologies.map((t: any) => t.name).slice(0, 15).join(', ')}\n`;
      }
      
      if (apollo.employeeMetrics && apollo.employeeMetrics.length > 0) {
        const latest = apollo.employeeMetrics[apollo.employeeMetrics.length - 1];
        const totalEmployees = latest.departments?.find((d: any) => d.functions === null)?.retained || 'N/A';
        prompt += `**Current Employees:** ${totalEmployees}\n`;
      }
      
      if (apollo.industries && apollo.industries.length > 0) {
        prompt += `**Industries:** ${apollo.industries.join(', ')}\n`;
      }
    }
  } else {
    prompt += `No client data available.\n`;
  }

  // Contacts
  if (contacts.length > 0) {
    prompt += `\n## KEY CONTACTS\n`;
    contacts.slice(0, 10).forEach((contact: any, idx: number) => {
      prompt += `${idx + 1}. **${contact.name || 'Unknown'}** - ${contact.role || 'N/A'}`;
      if (contact.is_decision_maker) prompt += ` (Decision Maker)`;
      if (contact.email) prompt += ` - ${contact.email}`;
      if (contact.linkedin_url) prompt += ` - LinkedIn: ${contact.linkedin_url}`;
      prompt += `\n`;
    });
  }

  // Semantic Search Results (Documents & Transcripts)
  if (semanticResults.length > 0) {
    prompt += `\n## RELEVANT DOCUMENTS & MEETING TRANSCRIPTS\n`;
    semanticResults.forEach((result: any, idx: number) => {
      const sourceType = result.source_type === 'transcript' ? 'Meeting Transcript' : 'Document';
      const sourceName = result.document_name || result.recording_title || 'Unknown';
      prompt += `\n### ${sourceType}: ${sourceName}\n`;
      if (result.meeting_date) prompt += `**Date:** ${result.meeting_date}\n`;
      if (result.similarity) prompt += `**Relevance:** ${(result.similarity * 100).toFixed(0)}%\n`;
      prompt += `**Content:** ${result.text}\n`;
      prompt += `---\n`;
    });
  }

  // Opportunities
  if (opportunities.length > 0) {
    prompt += `\n## RECENT OPPORTUNITIES\n`;
    opportunities.slice(0, 5).forEach((opp: any, idx: number) => {
      prompt += `${idx + 1}. **${opp.title || 'Untitled'}** - ${opp.stage || 'N/A'}\n`;
      if (opp.description) prompt += `   ${opp.description.substring(0, 200)}...\n`;
    });
  }

  // Chat History
  if (chatHistory.length > 0) {
    prompt += `\n## CONVERSATION HISTORY\n`;
    chatHistory.forEach((msg: any) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      prompt += `**${role}:** ${msg.content}\n`;
    });
  }

  prompt += `\n---\n\n## USER QUERY\n${query}\n\n## INSTRUCTIONS\n`;
  
  if (mode === 'quick') {
    prompt += `Provide a concise, direct answer based on the context above. Focus on key facts and actionable insights.`;
  } else {
    prompt += `Provide a comprehensive, detailed analysis based on the context above. Include multiple perspectives, cite specific sources, and provide strategic recommendations.`;
  }

  prompt += `\n\n**Important:**\n- Only use information from the context provided\n- Cite sources when referencing specific documents, transcripts, or data points\n- If information is not available in the context, say so explicitly\n- Be accurate and avoid speculation\n- Format your response clearly with proper structure`;

  return prompt;
}

// ============================================================================
// LLM CALL
// ============================================================================

async function callLLM(
  contextPrompt: string,
  userQuery: string,
  model: string,
  openaiApiKey: string,
  mode: 'quick' | 'deep',
  context: LogContext
): Promise<string> {
  try {
    logger.apiCall('OpenAI', 'POST', 'https://api.openai.com/v1/chat/completions', context);
    const apiStartTime = Date.now();

    const systemMessage = mode === 'quick'
      ? `You are a business intelligence analyst. Provide concise, accurate answers based on the provided context. Be direct and actionable. Cite sources when referencing specific information.`
      : `You are an expert business intelligence analyst. Provide comprehensive, detailed analysis based on the provided context. Include multiple perspectives, strategic insights, and actionable recommendations. Always cite your sources with specific references.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: contextPrompt,
          },
        ],
        temperature: mode === 'quick' ? 0.3 : 0.7,
        max_completion_tokens: mode === 'quick' ? 2000 : 4000,
      }),
    });

    const apiDuration = Date.now() - apiStartTime;
    logger.apiResponse('OpenAI', response.status, apiDuration, context, { model });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI API error', context, {
        status: response.status,
        error: errorText,
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'No response generated.';

    logger.success('LLM response received', context, {
      answerLength: answer.length,
      tokensUsed: data.usage?.total_tokens,
    });

    return answer;
  } catch (error: any) {
    logger.error('Error calling LLM', context, { error: error.message });
    throw error;
  }
}

// ============================================================================
// CITATION EXTRACTION
// ============================================================================

function extractCitations(
  semanticResults: any[],
  clientData: any,
  contacts: any[]
): Array<{ source: string; type: 'document' | 'transcript' | 'client_data' | 'apollo' | 'contact'; relevance?: number }> {
  const citations: Array<{ source: string; type: any; relevance?: number }> = [];

  // Add semantic search results
  semanticResults.forEach((result: any) => {
    const sourceName = result.document_name || result.recording_title || 'Unknown';
    citations.push({
      source: sourceName,
      type: result.source_type === 'transcript' ? 'transcript' : 'document',
      relevance: result.similarity,
    });
  });

  // Add client data citation
  if (clientData) {
    citations.push({
      source: `${clientData.company || 'Client'} Information`,
      type: 'client_data',
    });
  }

  // Add Apollo citation if available
  if (clientData?.apollo_data) {
    citations.push({
      source: 'Apollo.io Intelligence',
      type: 'apollo',
    });
  }

  // Add contacts citation if available
  if (contacts.length > 0) {
    citations.push({
      source: `${contacts.length} Contact${contacts.length > 1 ? 's' : ''}`,
      type: 'contact',
    });
  }

  return citations;
}

