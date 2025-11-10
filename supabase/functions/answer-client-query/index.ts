import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface QueryRequest {
  query: string;
  clientId: string;
  mode?: 'quick' | 'deep';
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

    const { query, clientId, mode = 'quick' }: QueryRequest = await req.json();

    if (!query || !clientId) {
      throw new Error('query and clientId are required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please add it in Settings.');
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Fetch company profile
    const { data: companyProfile } = await supabaseClient
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch contacts
    const { data: contacts } = await supabaseClient
      .from('contacts')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id);

    // Fetch meeting transcripts
    const { data: transcripts } = await supabaseClient
      .from('meeting_transcripts')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('meeting_date', { ascending: false })
      .limit(mode === 'deep' ? 5 : 2);

    // Fetch opportunities
    const { data: opportunities } = await supabaseClient
      .from('opportunities')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id);

    // Generate embedding for semantic search
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Perform semantic search on documents
    const searchLimit = mode === 'deep' ? 10 : 5;
    const { data: documentMatches } = await supabaseClient.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: mode === 'deep' ? 0.6 : 0.7,
      match_count: searchLimit,
      filter_user_id: user.id,
      filter_client_id: clientId,
    });

    // Build comprehensive context
    const contextParts = [];

    // Company information
    if (companyProfile) {
      contextParts.push(`YOUR COMPANY INFORMATION:
Company: ${companyProfile.company_name || 'N/A'}
Industry: ${companyProfile.industry || 'N/A'}
About: ${companyProfile.about || 'N/A'}
Value Proposition: ${companyProfile.value_proposition || 'N/A'}
Mission: ${companyProfile.mission || 'N/A'}
Services: ${companyProfile.services ? JSON.stringify(companyProfile.services).substring(0, 500) : 'N/A'}`);

      if (companyProfile.case_studies && Array.isArray(companyProfile.case_studies)) {
        const caseStudiesText = companyProfile.case_studies.slice(0, 3).map((cs: any, i: number) =>
          `${i + 1}. ${cs.title || 'Untitled'}: ${cs.description || ''}`
        ).join('\n');
        contextParts.push(`\nYOUR CASE STUDIES:\n${caseStudiesText}`);
      }
    }

    // Client information
    contextParts.push(`\nCLIENT INFORMATION:
Company: ${client.company || 'N/A'}
Industry: ${client.industry || 'N/A'}
Status: ${client.status || 'N/A'}
Location: ${client.location || 'N/A'}
Email: ${client.email || 'N/A'}
Phone: ${client.phone || 'N/A'}
Website: ${client.website || 'N/A'}
Description: ${client.description || 'N/A'}
Annual Revenue: ${client.annual_revenue || 'N/A'}
Employee Count: ${client.employee_count || 'N/A'}
Technologies: ${client.technologies ? client.technologies.join(', ') : 'N/A'}`);

    // AI Insights
    if (client.ai_insights) {
      contextParts.push(`\nCLIENT AI INSIGHTS: ${JSON.stringify(client.ai_insights).substring(0, 800)}`);
    }

    // Contacts
    if (contacts && contacts.length > 0) {
      const contactsText = contacts.map((c: any) =>
        `• ${c.name} - ${c.role}${c.department ? ` (${c.department})` : ''} - ${c.email}${c.is_decision_maker ? ' [Decision Maker]' : ''}`
      ).join('\n');
      contextParts.push(`\nCLIENT CONTACTS:\n${contactsText}`);
    }

    // Meeting transcripts - Include FULL transcripts in deep mode
    if (transcripts && transcripts.length > 0) {
      if (mode === 'deep') {
        // In deep mode, include full or large portions of transcripts
        const transcriptsText = transcripts.map((t: any, i: number) =>
          `${i + 1}. ${t.title} (${new Date(t.meeting_date).toLocaleDateString()}):\n${t.transcript_text.substring(0, 3000)}${t.transcript_text.length > 3000 ? '...' : ''}`
        ).join('\n\n');
        contextParts.push(`\nMEETING TRANSCRIPTS (${transcripts.length} meetings - FULL CONTENT):\n${transcriptsText}`);
      } else {
        // In quick mode, include summaries
        const transcriptsText = transcripts.map((t: any, i: number) =>
          `${i + 1}. ${t.title} (${new Date(t.meeting_date).toLocaleDateString()}):\n${t.transcript_text.substring(0, 600)}...`
        ).join('\n\n');
        contextParts.push(`\nMEETING TRANSCRIPTS (${transcripts.length} meetings):\n${transcriptsText}`);
      }
    }

    // Document matches from semantic search (includes both documents and transcript embeddings)
    if (documentMatches && documentMatches.length > 0) {
      // Separate documents from transcript embeddings
      const docMatches = documentMatches.filter((doc: any) =>
        doc.source_type !== 'meeting_transcript'
      );
      const transcriptMatches = documentMatches.filter((doc: any) =>
        doc.source_type === 'meeting_transcript'
      );

      if (docMatches.length > 0) {
        const docsText = docMatches.map((doc: any, i: number) =>
          `[${i + 1}] ${doc.content_chunk} (from ${doc.document_name}, ${(doc.similarity * 100).toFixed(1)}% relevant)`
        ).join('\n\n');
        contextParts.push(`\nRELEVANT DOCUMENTS (${docMatches.length} matches):\n${docsText}`);
      }

      if (transcriptMatches.length > 0 && mode === 'quick') {
        // Only show transcript matches in quick mode (deep mode already has full transcripts)
        const transcriptMatchesText = transcriptMatches.map((doc: any, i: number) =>
          `[${i + 1}] ${doc.content_chunk} (from ${doc.document_name}, ${(doc.similarity * 100).toFixed(1)}% relevant)`
        ).join('\n\n');
        contextParts.push(`\nRELEVANT TRANSCRIPT SECTIONS (${transcriptMatches.length} matches):\n${transcriptMatchesText}`);
      }
    }

    // Growth opportunities
    if (opportunities && opportunities.length > 0) {
      const oppsText = opportunities.slice(0, 5).map((opp: any, i: number) =>
        `${i + 1}. ${opp.title}: ${opp.description.substring(0, 200)}...`
      ).join('\n');
      contextParts.push(`\nIDENTIFIED OPPORTUNITIES:\n${oppsText}`);
    }

    const fullContext = contextParts.join('\n');

    // Generate AI response using OpenAI
    const systemPrompt = `You are an intelligent business assistant helping to answer questions about a client using comprehensive data from multiple sources.

Your knowledge includes:
- Your company's services, case studies, and capabilities
- Detailed client information and history
- Meeting transcripts and interactions
- Uploaded documents and materials
- Contact information
- Growth opportunities

Guidelines:
- Be conversational and helpful
- Provide specific, actionable insights
- Reference sources when possible (e.g., "According to the meeting on...", "In the transcript from...")
- When answering from meeting transcripts, quote relevant parts if helpful
- If you find relevant case studies or services from your company that could help the client, mention them naturally
- If information is not available, say so clearly
- Keep responses concise in quick mode, more detailed in deep mode`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Context:\n${fullContext}\n\nQuestion: ${query}\n\nProvide a helpful, informed answer based on the context above.` },
        ],
        temperature: 0.7,
        max_tokens: mode === 'deep' ? 1500 : 800,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('OpenAI chat error:', errorText);
      throw new Error('Failed to generate response');
    }

    const chatData = await chatResponse.json();
    const answer = chatData.choices[0].message.content;

    return new Response(
      JSON.stringify({
        success: true,
        answer,
        sources: {
          documentsSearched: documentMatches?.length || 0,
          transcriptsIncluded: transcripts?.length || 0,
          contactsFound: contacts?.length || 0,
          opportunitiesFound: opportunities?.length || 0,
        },
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
        error: error.message || 'An error occurred while processing your query',
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