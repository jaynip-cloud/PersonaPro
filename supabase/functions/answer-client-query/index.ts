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
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface QueryIntent {
  type: 'factual' | 'analytical' | 'comparative' | 'recommendation' | 'exploratory';
  topics: string[];
  timeframe?: 'recent' | 'historical' | 'all';
}

function analyzeQueryIntent(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase();

  let type: QueryIntent['type'] = 'factual';
  const topics: string[] = [];
  let timeframe: QueryIntent['timeframe'] = 'all';

  if (lowerQuery.match(/why|how|explain|analyze|understand|reason/)) {
    type = 'analytical';
  } else if (lowerQuery.match(/compare|versus|vs|difference|similar|contrast/)) {
    type = 'comparative';
  } else if (lowerQuery.match(/recommend|suggest|should|best|advice|what if/)) {
    type = 'recommendation';
  } else if (lowerQuery.match(/explore|possibilities|potential|opportunities/)) {
    type = 'exploratory';
  }

  if (lowerQuery.match(/pain point|problem|challenge|issue|concern|difficulty|struggle/)) topics.push('challenges');
  if (lowerQuery.match(/opportunity|growth|upsell|expansion/)) topics.push('opportunities');
  if (lowerQuery.match(/meeting|discussion|call|conversation/)) topics.push('meetings');
  if (lowerQuery.match(/contact|person|people|team|who|ceo|chief executive|founder|leadership|executive/)) topics.push('contacts');
  if (lowerQuery.match(/technology|tech stack|tools|software|platform|framework/)) topics.push('technology');
  if (lowerQuery.match(/budget|cost|price|revenue|financial/)) topics.push('financial');
  if (lowerQuery.match(/timeline|when|schedule|deadline/)) topics.push('timeline');
  if (lowerQuery.match(/competitor|competition|market|alternative|rival/)) topics.push('market');
  if (lowerQuery.match(/competitor/)) topics.push('competitors');
  if (lowerQuery.match(/service|solution|product|offering/)) topics.push('services');
  if (lowerQuery.match(/blog|article|content|post|publication|resource/)) topics.push('content');

  if (lowerQuery.match(/recent|latest|last|current|now/)) timeframe = 'recent';
  if (lowerQuery.match(/historical|past|previous|history|over time/)) timeframe = 'historical';

  return { type, topics, timeframe };
}

function buildEnhancedContext(data: any, intent: QueryIntent, mode: string): string {
  const { client, companyProfile, contacts, transcripts, fathomRecordings, opportunities, documentMatches, additionalFathomContext, intelligenceContext } = data;
  const contextParts = [];

  // If we have intelligence context from the new retrieval agent, use it
  if (intelligenceContext) {
    contextParts.push('=== MOST RELEVANT CONTEXT (AI-RANKED) ===\n');

    if (intelligenceContext.meetings && intelligenceContext.meetings.length > 0) {
      contextParts.push('\n--- Meeting Insights ---');
      intelligenceContext.meetings.forEach((meeting: any, i: number) => {
        const date = meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) : '';
        contextParts.push(`\n[Meeting ${i + 1}] ${meeting.recording_title || 'Unknown'}${date ? ` (${date})` : ''}`);
        if (meeting.speaker_name) contextParts.push(`Speaker: ${meeting.speaker_name}`);
        contextParts.push(`Relevance: ${(meeting.similarity_score * 100).toFixed(1)}%`);
        contextParts.push(meeting.text);
      });
    }

    if (intelligenceContext.documents && intelligenceContext.documents.length > 0) {
      contextParts.push('\n--- Document Insights ---');
      intelligenceContext.documents.forEach((doc: any, i: number) => {
        contextParts.push(`\n[Document ${i + 1}] ${doc.title || 'Unknown'}`);
        if (doc.url) contextParts.push(`URL: ${doc.url}`);
        contextParts.push(`Relevance: ${(doc.similarity_score * 100).toFixed(1)}%`);
        contextParts.push(doc.text);
      });
    }

    if (intelligenceContext.company_kb && intelligenceContext.company_kb.length > 0) {
      contextParts.push('\n--- Your Company Knowledge ---');
      intelligenceContext.company_kb.forEach((kb: any, i: number) => {
        contextParts.push(`\n[Resource ${i + 1}] ${kb.title || 'Unknown'}`);
        if (kb.url) contextParts.push(`URL: ${kb.url}`);
        contextParts.push(`Relevance: ${(kb.similarity_score * 100).toFixed(1)}%`);
        contextParts.push(kb.text);
      });
    }

    contextParts.push('\n=== END RELEVANT CONTEXT ===\n');
  }

  if (intent.type === 'recommendation' || intent.type === 'analytical') {
    contextParts.push('=== STRATEGIC CONTEXT ===');
  }

  if (companyProfile) {
    const companySection = [];
    companySection.push('YOUR COMPANY PROFILE:');
    companySection.push(`Name: ${companyProfile.company_name || 'N/A'}`);
    companySection.push(`Industry: ${companyProfile.industry || 'N/A'}`);

    if (companyProfile.value_proposition) {
      companySection.push(`Value Proposition: ${companyProfile.value_proposition}`);
    }

    if (companyProfile.services && Array.isArray(companyProfile.services) && companyProfile.services.length > 0) {
      const services = companyProfile.services.slice(0, 5).map((s: any) =>
        `  • ${s.name || s.title || s}: ${s.description || ''}`
      ).join('\n');
      companySection.push(`\nYour Services:\n${services}`);
    }

    if (intent.topics.includes('services') && companyProfile.case_studies && Array.isArray(companyProfile.case_studies)) {
      const caseStudies = companyProfile.case_studies.slice(0, 3).map((cs: any, i: number) =>
        `  ${i + 1}. ${cs.title || 'Untitled'}\n     ${cs.description || ''}\n     Results: ${cs.results || 'N/A'}`
      ).join('\n');
      companySection.push(`\nRelevant Case Studies:\n${caseStudies}`);
    }

    contextParts.push(companySection.join('\n'));
  }

  const clientSection = [];
  clientSection.push('\n=== CLIENT PROFILE ===');
  clientSection.push(`Company: ${client.company || 'N/A'}`);
  clientSection.push(`Industry: ${client.industry || 'N/A'}`);
  clientSection.push(`Status: ${client.status || 'N/A'}`);

  if (client.description) {
    clientSection.push(`About: ${client.description}`);
  }

  if (intent.topics.includes('financial') || intent.topics.includes('opportunities')) {
    if (client.annual_revenue) clientSection.push(`Revenue: ${client.annual_revenue}`);
    if (client.employee_count) clientSection.push(`Employees: ${client.employee_count}`);
  }

  if (client.services && Array.isArray(client.services) && client.services.length > 0) {
    clientSection.push('\nServices/Products They Use:');
    client.services.forEach((service: any) => {
      const name = service.name || '';
      const desc = service.description || '';
      if (name) {
        clientSection.push(`  • ${name}${desc ? `: ${desc}` : ''}`);
      }
    });
  }

  if (client.technologies && Array.isArray(client.technologies) && client.technologies.length > 0) {
    clientSection.push('\nTechnology Stack:');
    client.technologies.forEach((tech: any) => {
      const name = tech.name || tech;
      const category = tech.category || '';
      if (name) {
        clientSection.push(`  • ${name}${category ? ` (${category})` : ''}`);
      }
    });
  }

  if (intent.topics.includes('content') || mode === 'deep') {
    if (client.blogs && Array.isArray(client.blogs) && client.blogs.length > 0) {
      clientSection.push('\nRecent Blog Posts/Articles:');
      client.blogs.slice(0, 5).forEach((blog: any) => {
        const title = blog.title || '';
        const url = blog.url || '';
        const date = blog.date || '';
        if (title) {
          clientSection.push(`  • ${title}${date ? ` (${date})` : ''}${url ? ` - ${url}` : ''}`);
        }
      });
    }
  }

  if (intent.topics.includes('challenges') || intent.type === 'analytical' || intent.type === 'recommendation') {
    if (client.pain_points && Array.isArray(client.pain_points) && client.pain_points.length > 0) {
      clientSection.push('\nKnown Pain Points/Challenges:');
      client.pain_points.forEach((painPoint: string) => {
        if (painPoint) {
          clientSection.push(`  • ${painPoint}`);
        }
      });
    }
  }

  if (intent.topics.includes('market') || intent.topics.includes('competitors') || mode === 'deep') {
    if (client.competitors && Array.isArray(client.competitors) && client.competitors.length > 0) {
      clientSection.push('\nCompetitors/Alternatives They Consider:');
      client.competitors.forEach((competitor: any) => {
        const name = competitor.name || competitor;
        const comparison = competitor.comparison || competitor.description || '';
        if (name) {
          clientSection.push(`  • ${name}${comparison ? `: ${comparison}` : ''}`);
        }
      });
    }
  }

  if (client.ai_insights) {
    try {
      const insights = typeof client.ai_insights === 'string'
        ? JSON.parse(client.ai_insights)
        : client.ai_insights;

      if (insights.pain_points || insights.priorities || insights.goals) {
        clientSection.push('\nKey AI Insights:');
        if (insights.pain_points) clientSection.push(`  Pain Points: ${Array.isArray(insights.pain_points) ? insights.pain_points.join('; ') : insights.pain_points}`);
        if (insights.priorities) clientSection.push(`  Priorities: ${Array.isArray(insights.priorities) ? insights.priorities.join('; ') : insights.priorities}`);
        if (insights.goals) clientSection.push(`  Goals: ${Array.isArray(insights.goals) ? insights.goals.join('; ') : insights.goals}`);
      }
    } catch (e) {
    }
  }

  contextParts.push(clientSection.join('\n'));

  // Always include contacts section if they exist (not just when explicitly requested)
  if (contacts && contacts.length > 0) {
    const decisionMakers = contacts.filter((c: any) => c.is_decision_maker);
    const ceo = contacts.find((c: any) => c.role && (
      c.role.toLowerCase().includes('ceo') ||
      c.role.toLowerCase().includes('chief executive')
    ));
    const primaryContacts = contacts.filter((c: any) => c.is_primary);
    const otherContacts = contacts.filter((c: any) => !c.is_decision_maker && !c.is_primary);

    const contactsSection = ['\n=== KEY CONTACTS ==='];

    // Always show CEO if exists
    if (ceo) {
      contactsSection.push('Chief Executive Officer (CEO):');
      contactsSection.push(`  • ${ceo.name} - ${ceo.role}`);
      contactsSection.push(`    Email: ${ceo.email}${ceo.phone ? ` | Phone: ${ceo.phone}` : ''}`);
      if (ceo.linkedin_url) contactsSection.push(`    LinkedIn: ${ceo.linkedin_url}`);
      contactsSection.push('');
    }

    if (decisionMakers.length > 0) {
      contactsSection.push('Decision Makers:');
      decisionMakers.forEach((c: any) => {
        // Skip if already shown as CEO
        if (c.id === ceo?.id) return;

        contactsSection.push(`  • ${c.name} - ${c.role}${c.department ? ` (${c.department})` : ''}`);
        contactsSection.push(`    Email: ${c.email}${c.phone ? ` | Phone: ${c.phone}` : ''}`);
        if (c.influence_level) contactsSection.push(`    Influence: ${c.influence_level}`);
      });
      contactsSection.push('');
    }

    if (primaryContacts.length > 0) {
      contactsSection.push('Primary Contacts:');
      primaryContacts.forEach((c: any) => {
        // Skip if already shown as CEO or decision maker
        if (c.id === ceo?.id || c.is_decision_maker) return;

        contactsSection.push(`  • ${c.name} - ${c.role}${c.department ? ` (${c.department})` : ''}`);
        contactsSection.push(`    Email: ${c.email}${c.phone ? ` | Phone: ${c.phone}` : ''}`);
      });
      contactsSection.push('');
    }

    // Show other contacts if:
    // 1. User asked about contacts specifically, OR
    // 2. Deep mode, OR
    // 3. There are no CEO/decision makers/primary contacts (so we don't return empty)
    const shouldShowOthers = intent.topics.includes('contacts') ||
                             mode === 'deep' ||
                             (!ceo && decisionMakers.length === 0 && primaryContacts.length === 0);

    if (shouldShowOthers && otherContacts.length > 0) {
      contactsSection.push('Contacts:');
      const contactsToShow = mode === 'deep' ? otherContacts.slice(0, 5) : otherContacts.slice(0, 3);
      contactsToShow.forEach((c: any) => {
        contactsSection.push(`  • ${c.name}${c.role ? ` - ${c.role}` : ''}${c.department ? ` (${c.department})` : ''}`);
        if (c.email) contactsSection.push(`    Email: ${c.email}${c.phone ? ` | Phone: ${c.phone}` : ''}`);
      });
    }

    contextParts.push(contactsSection.join('\n'));
  }

  if (transcripts && transcripts.length > 0) {
    const transcriptsSection = ['\n=== MEETING HISTORY (Manual Notes) ==='];

    transcripts.forEach((t: any, i: number) => {
      const date = new Date(t.meeting_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      transcriptsSection.push(`\nMeeting ${i + 1}: ${t.title} (${date})`);

      if (t.sentiment) {
        transcriptsSection.push(`Sentiment: ${t.sentiment}`);
      }

      if (t.action_items && Array.isArray(t.action_items) && t.action_items.length > 0) {
        transcriptsSection.push(`Action Items: ${t.action_items.join('; ')}`);
      }

      const maxLength = mode === 'deep' ? 3000 : (intent.topics.includes('meetings') ? 1200 : 600);
      const transcript = t.transcript_text || '';
      transcriptsSection.push(`Content: ${transcript.substring(0, maxLength)}${transcript.length > maxLength ? '...' : ''}`);
    });

    contextParts.push(transcriptsSection.join('\n'));
  }

  if (fathomRecordings && fathomRecordings.length > 0) {
    const fathomSection = ['\n=== FATHOM RECORDINGS AVAILABLE ==='];
    fathomSection.push(`Found ${fathomRecordings.length} Fathom-recorded meetings for this client.`);
    fathomSection.push('Note: Detailed excerpts from these recordings appear in the "RELEVANT MEETING EXCERPTS" section below when semantically relevant to your query.\n');

    fathomRecordings.forEach((recording: any, i: number) => {
      const date = new Date(recording.start_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const duration = recording.duration ? ` (${Math.round(recording.duration / 60)} min)` : '';
      fathomSection.push(`${i + 1}. ${recording.title} - ${date}${duration}`);
    });

    // Add sample excerpts for meeting queries if semantic search didn't find much
    if (additionalFathomContext && additionalFathomContext.length > 0) {
      fathomSection.push('\nRecent Discussion Samples:');
      additionalFathomContext.slice(0, 3).forEach((excerpt: any, i: number) => {
        fathomSection.push(`\nExcerpt ${i + 1} (${excerpt.speaker_name || 'Unknown'}):`);
        fathomSection.push(excerpt.chunk_text.substring(0, 500));
      });
    }

    contextParts.push(fathomSection.join('\n'));
  }

  if (documentMatches && documentMatches.length > 0) {
    const docMatches = documentMatches.filter((doc: any) =>
      doc.source_type !== 'meeting_transcript' && doc.source_type !== 'fathom_transcript'
    );
    const transcriptMatches = documentMatches.filter((doc: any) =>
      doc.source_type === 'meeting_transcript' || doc.source_type === 'fathom_transcript'
    );

    if (docMatches.length > 0) {
      const docsSection = ['\n=== RELEVANT DOCUMENTS ==='];
      docMatches.forEach((doc: any, i: number) => {
        docsSection.push(`\n[Document ${i + 1}] ${doc.document_name} (${(doc.similarity * 100).toFixed(1)}% relevant)`);
        docsSection.push(doc.content_chunk);
      });
      contextParts.push(docsSection.join('\n'));
    }

    if (transcriptMatches.length > 0) {
      const transcriptSection = ['\n=== RELEVANT MEETING EXCERPTS ==='];
      transcriptMatches.forEach((doc: any, i: number) => {
        const meetingDate = doc.metadata?.meeting_date
          ? new Date(doc.metadata.meeting_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : '';
        const speaker = doc.metadata?.speaker_name ? ` - ${doc.metadata.speaker_name}` : '';
        transcriptSection.push(`\n[Excerpt ${i + 1}] From: ${doc.document_name}${meetingDate ? ` (${meetingDate})` : ''}${speaker} (${(doc.similarity * 100).toFixed(1)}% relevant)`);
        transcriptSection.push(doc.content_chunk);
      });
      contextParts.push(transcriptSection.join('\n'));
    }
  }

  if (opportunities && opportunities.length > 0 && (intent.topics.includes('opportunities') || intent.type === 'recommendation')) {
    const oppsSection = ['\n=== IDENTIFIED OPPORTUNITIES ==='];
    opportunities.slice(0, 5).forEach((opp: any, i: number) => {
      oppsSection.push(`\n${i + 1}. ${opp.title}`);
      oppsSection.push(`   Status: ${opp.status || 'N/A'}`);
      oppsSection.push(`   ${opp.description}`);
      if (opp.estimated_value) oppsSection.push(`   Est. Value: ${opp.estimated_value}`);
    });
    contextParts.push(oppsSection.join('\n'));
  }

  return contextParts.join('\n\n');
}

function buildEnhancedPrompt(intent: QueryIntent, mode: string): string {
  const basePrompt = `You are PersonaPro's Helpful Intelligence Assistant — a friendly, knowledgeable teammate helping sales and account managers understand their clients better.

Your job is to read the retrieved context (meetings + documents + company profile) and answer questions in a warm, conversational, helpful tone — like a smart colleague who really knows this client.

IMPORTANT: You will only receive substantive questions here. Simple greetings are handled separately.`;

  const intentSpecificGuidance: Record<string, string> = {
    'factual': 'Explain clearly and directly, using the data to paint a complete picture.',
    'analytical': 'Help them understand the "why" behind what you see in the data. Share patterns and insights.',
    'comparative': 'Highlight the key differences or similarities in a way that helps them make decisions.',
    'recommendation': 'Offer strategic suggestions with clear reasoning. Help them see the next best steps.',
    'exploratory': 'Think creatively about possibilities and opportunities based on what the data shows.',
  };

  const guidelines = [
    '• CRITICAL: ONLY answer based on the retrieved context. NEVER guess, assume, or make up information.',
    '• If the information is not in the provided context, clearly state: "I don\'t have that information in the current data."',
    '• DO NOT answer out of context - if the query cannot be answered with the provided data, say so explicitly.',
    '• Incorporate evidence smoothly into your answers (e.g., "Based on your meeting notes from June..." or "Looking at their website...")',
    '• Be specific with numbers, dates, names, and quotes when available',
    `• ${intentSpecificGuidance[intent.type]}`,
    '• Write in a natural, warm tone. Avoid robotic or template-like language.',
    '• Do NOT show internal metadata like "sources: 1 contacts" or timestamps.',
    '• Never output JSON unless explicitly asked — produce human-readable answers.',
  ];

  if (intent.topics.length > 0) {
    guidelines.push(`• The user is asking about: ${intent.topics.join(', ')}`);
  }

  if (mode === 'deep') {
    guidelines.push('• Provide comprehensive, thoughtful analysis with multiple angles');
    guidelines.push('• Include relevant context and background to help them understand the full picture');
  } else {
    guidelines.push('• Keep responses focused and helpful — get to the point while staying friendly');
    guidelines.push('• Prioritize the most important information');
  }

  return `${basePrompt}\n\n${guidelines.join('\n')}\n\nGoal: Help the user understand their client better, find opportunities, or get strategic recommendations — based entirely on the retrieved context.`;
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

    const { query, clientId, mode = 'quick', conversationHistory = [] }: QueryRequest = await req.json();

    if (!query || !clientId) {
      throw new Error('query and clientId are required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please add it in Settings.');
    }

    // Check if this is just a greeting
    const greetingPattern = /^(hi|hello|hey|good morning|good afternoon|good evening|what's up|how are you|howdy|sup|yo)[\s!?.]*$/i;
    const isGreeting = greetingPattern.test(query.trim());

    if (isGreeting) {
      console.log('Detected greeting, returning friendly response');
      const greetingResponses = [
        "Hey! 👋 How can I help you today?",
        "Hi there! What would you like to know?",
        "Hello! What can I help you with?",
        "Hey! Ready to dive into some client insights?",
        "Hi! What would you like to explore?",
      ];
      const randomGreeting = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];

      return new Response(
        JSON.stringify({
          success: true,
          answer: randomGreeting,
          sources: [],
          metadata: {
            intent: 'greeting',
            confidence: 'high',
            sources: {
              documentsSearched: 0,
              manualTranscriptsIncluded: 0,
              fathomRecordingsAvailable: 0,
              transcriptMatchesFound: 0,
              fathomTranscriptsFound: 0,
              pineconeDocumentsFound: 0,
              contactsFound: 0,
              opportunitiesFound: 0,
            },
            dataQuality: {},
          },
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const intent = analyzeQueryIntent(query);
    console.log('Query intent:', intent);

    // Step 1: Call the new Intelligence Retrieval Agent
    console.log('Calling Intelligence Retrieval Agent...');
    const retrievalResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/retrieve-intelligence`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          client_id: clientId,
          source_filters: [],
          top_k: {
            meetings: mode === 'deep' ? 15 : 10,
            documents: mode === 'deep' ? 15 : 10,
            company_kb: mode === 'deep' ? 10 : 6,
          }
        }),
      }
    );

    let intelligenceContext = null;
    if (retrievalResponse.ok) {
      const retrievalData = await retrievalResponse.json();
      intelligenceContext = retrievalData.context;
      console.log('Intelligence context retrieved:', retrievalData.metadata);
    } else {
      console.warn('Intelligence retrieval failed, falling back to legacy search');
    }

    // Step 2: Fetch structured data
    const [
      clientResult,
      companyProfileResult,
      contactsResult,
      transcriptsResult,
      fathomRecordingsResult,
      opportunitiesResult,
    ] = await Promise.all([
      supabaseClient.from('clients').select('*').eq('id', clientId).eq('user_id', user.id).single(),
      supabaseClient.from('company_profiles').select('*').eq('user_id', user.id).single(),
      supabaseClient.from('contacts').select('*').eq('client_id', clientId).eq('user_id', user.id),
      supabaseClient.from('meeting_transcripts').select('*').eq('client_id', clientId).eq('user_id', user.id).order('meeting_date', { ascending: false }).limit(mode === 'deep' ? 5 : 3),
      supabaseClient.from('fathom_recordings').select('id, title, start_time, duration, playback_url').eq('client_id', clientId).eq('user_id', user.id).order('start_time', { ascending: false }).limit(mode === 'deep' ? 5 : 3),
      supabaseClient.from('opportunities').select('*').eq('client_id', clientId).eq('user_id', user.id),
    ]);

    if (clientResult.error || !clientResult.data) {
      throw new Error('Client not found');
    }

    const client = clientResult.data;
    const companyProfile = companyProfileResult.data;
    const contacts = contactsResult.data || [];
    const transcripts = transcriptsResult.data || [];
    const fathomRecordings = fathomRecordingsResult.data || [];
    const opportunities = opportunitiesResult.data || [];

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
      throw new Error('Failed to generate query embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const searchLimit = mode === 'deep' ? 20 : 12;
    const similarityThreshold = intent.topics.includes('meetings') ? 0.50 : (intent.type === 'factual' ? 0.70 : 0.60);

    // Search old system (document_embeddings + fathom_embeddings in Postgres)
    const { data: documentMatches } = await supabaseClient.rpc('match_all_content', {
      query_embedding: queryEmbedding,
      match_threshold: similarityThreshold,
      match_count: searchLimit,
      filter_user_id: user.id,
      filter_client_id: clientId,
    });

    // Also search knowledge base in Pinecone
    let pineconeMatches: any[] = [];
    try {
      const { data: apiKeys } = await supabaseClient
        .from('api_keys')
        .select('pinecone_api_key, pinecone_environment, pinecone_index_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (apiKeys?.pinecone_api_key && apiKeys?.pinecone_environment && apiKeys?.pinecone_index_name) {
        const pineconeUrl = `https://${apiKeys.pinecone_index_name}-${apiKeys.pinecone_environment}.svc.${apiKeys.pinecone_environment}.pinecone.io`;

        const pineconeResponse = await fetch(
          `${pineconeUrl}/query`,
          {
            method: 'POST',
            headers: {
              'Api-Key': apiKeys.pinecone_api_key,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              vector: queryEmbedding,
              topK: searchLimit,
              includeMetadata: true,
              filter: {
                client_id: { '$eq': clientId },
              },
            }),
          }
        );

        if (pineconeResponse.ok) {
          const pineconeData = await pineconeResponse.json();
          pineconeMatches = (pineconeData.matches || [])
            .filter((match: any) => match.score >= similarityThreshold)
            .map((match: any) => ({
              id: match.metadata.chunk_id,
              user_id: user.id,
              client_id: match.metadata.client_id,
              document_name: match.metadata.title,
              document_url: match.metadata.url || '',
              content_chunk: match.metadata.text,
              chunk_index: match.metadata.chunk_index,
              metadata: {},
              source_type: match.metadata.source_type || 'document',
              created_at: match.metadata.created_at,
              similarity: match.score,
            }));
          console.log(`Found ${pineconeMatches.length} matches in Pinecone`);
        }
      }
    } catch (pineconeError) {
      console.warn('Failed to search Pinecone:', pineconeError);
    }

    // Combine results from Postgres and Pinecone
    const allDocumentMatches = [
      ...(documentMatches || []),
      ...pineconeMatches,
    ].sort((a, b) => (b.similarity || 0) - (a.similarity || 0)).slice(0, searchLimit);

    // For meeting-related queries with few results, fetch recent Fathom excerpts directly
    let additionalFathomContext = null;
    const fathomMatches = allDocumentMatches.filter((d: any) => d.source_type === 'fathom_transcript');
    if (intent.topics.includes('meetings') && fathomMatches.length < 3 && fathomRecordings.length > 0) {
      const { data: directFathomData } = await supabaseClient
        .from('fathom_embeddings')
        .select('chunk_text, speaker_name, recording_id')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .limit(5);
      additionalFathomContext = directFathomData;
    }

    const contextData = {
      client,
      companyProfile,
      contacts,
      transcripts,
      fathomRecordings,
      opportunities,
      documentMatches: allDocumentMatches,
      additionalFathomContext,
      intelligenceContext,
    };

    const fullContext = buildEnhancedContext(contextData, intent, mode);
    const systemPrompt = buildEnhancedPrompt(intent, mode);

    console.log('Context summary:', {
      hasClient: !!client,
      contactsCount: contacts.length,
      transcriptsCount: transcripts.length,
      hasIntelligenceContext: !!intelligenceContext,
      contextLength: fullContext.length
    });

    // Debug: Log a snippet of the context to verify contacts are included
    if (contacts.length > 0) {
      console.log(`Contacts in context: ${contacts.length} contacts, first contact: ${contacts[0]?.name || 'Unknown'}`);
    }

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-4);
      messages.push(...recentHistory);
    }

    messages.push({
      role: 'user',
      content: `CLIENT DATA:\n${fullContext}\n\n---\n\nQUESTION: ${query}\n\nProvide a thorough, accurate answer based solely on the data above.`,
    });

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: intent.type === 'factual' ? 0.3 : 0.7,
        max_tokens: mode === 'deep' ? 2000 : 1000,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('OpenAI chat error:', errorText);
      throw new Error('Failed to generate response');
    }

    const chatData = await chatResponse.json();
    let answer = chatData.choices[0].message.content;

    // Check if answer indicates insufficient context and try web search
    const insufficientContextIndicators = [
      'I do not have',
      'I don\'t have',
      'not provide',
      'does not provide',
      'missing',
      'unclear',
      'I cannot find',
      'unable to find',
      'no information',
      'not available',
      'would need additional',
      'more information would be needed'
    ];

    const hasInsufficientContext = insufficientContextIndicators.some(indicator =>
      answer.toLowerCase().includes(indicator.toLowerCase())
    );

    if (hasInsufficientContext) {
      console.log('Insufficient context detected, attempting web search...');

      try {
        // Get Perplexity API key
        const { data: perplexityKeys } = await supabaseClient
          .from('api_keys')
          .select('perplexity_api_key')
          .eq('user_id', user.id)
          .maybeSingle();

        const perplexityKey = perplexityKeys?.perplexity_api_key || Deno.env.get('PERPLEXITY_API_KEY');

        if (perplexityKey) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const webSearchResponse = await fetch(`${supabaseUrl}/functions/v1/search-web`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${perplexityKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              clientName: client.name,
            }),
          });

          if (webSearchResponse.ok) {
            const webData = await webSearchResponse.json();
            if (webData.success && webData.answer) {
              console.log('Web search successful, enriching answer');
              answer = `${answer}\n\n**Additional information from web search:**\n\n${webData.answer}`;

              if (webData.citations && webData.citations.length > 0) {
                answer += '\n\n**Sources:**';
                webData.citations.forEach((citation: string, idx: number) => {
                  answer += `\n${idx + 1}. ${citation}`;
                });
              }
            }
          }
        } else {
          console.log('Perplexity API key not configured, skipping web search');
        }
      } catch (webSearchError) {
        console.error('Web search error (non-fatal):', webSearchError);
        // Continue with original answer
      }
    }

    // Build comprehensive sources list from intelligence context
    const sourcesList = [];
    let totalIntelligenceChunks = 0;
    let meetingChunks = 0;
    let documentChunks = 0;
    let companyKBChunks = 0;

    if (intelligenceContext) {
      // Add sources from intelligence context
      if (intelligenceContext.meetings && intelligenceContext.meetings.length > 0) {
        meetingChunks = intelligenceContext.meetings.length;
        totalIntelligenceChunks += meetingChunks;

        const meetingTitles = new Set();
        intelligenceContext.meetings.forEach((meeting: any) => {
          const title = meeting.recording_title || 'Unknown Meeting';
          if (!meetingTitles.has(title)) {
            meetingTitles.add(title);
            sourcesList.push({
              name: title,
              similarity: meeting.similarity_score,
              type: 'Fathom Recording',
            });
          }
        });
      }

      if (intelligenceContext.documents && intelligenceContext.documents.length > 0) {
        documentChunks = intelligenceContext.documents.length;
        totalIntelligenceChunks += documentChunks;

        const docTitles = new Set();
        intelligenceContext.documents.forEach((doc: any) => {
          const title = doc.title || 'Unknown Document';
          if (!docTitles.has(title)) {
            docTitles.add(title);
            sourcesList.push({
              name: title,
              similarity: doc.similarity_score,
              type: 'Knowledge Base Document',
              url: doc.url,
            });
          }
        });
      }

      if (intelligenceContext.company_kb && intelligenceContext.company_kb.length > 0) {
        companyKBChunks = intelligenceContext.company_kb.length;
        totalIntelligenceChunks += companyKBChunks;

        const kbTitles = new Set();
        intelligenceContext.company_kb.forEach((kb: any) => {
          const title = kb.title || 'Unknown Resource';
          if (!kbTitles.has(title)) {
            kbTitles.add(title);
            sourcesList.push({
              name: title,
              similarity: kb.similarity_score,
              type: kb.source_type === 'service' ? 'Service' :
                    kb.source_type === 'case_study' ? 'Case Study' :
                    kb.source_type === 'technology' ? 'Technology' :
                    kb.source_type === 'blog' ? 'Blog Post' : 'Company Knowledge',
              url: kb.url,
            });
          }
        });
      }
    }

    // Also add legacy document matches if any
    if (allDocumentMatches && allDocumentMatches.length > 0) {
      allDocumentMatches.forEach((doc: any) => {
        const name = doc.document_name || 'Unknown source';
        const alreadyAdded = sourcesList.some((s: any) => s.name === name);

        if (!alreadyAdded) {
          let sourceType = 'Document';
          if (doc.source_type === 'fathom_transcript') {
            sourceType = 'Fathom Recording';
          } else if (doc.source_type === 'meeting_transcript') {
            sourceType = 'Manual Meeting Note';
          } else if (doc.source_type === 'document') {
            sourceType = 'Knowledge Base Document';
          }

          sourcesList.push({
            name,
            similarity: doc.similarity,
            type: sourceType,
          });
        }
      });
    }

    const dataQuality = {
      hasTranscripts: transcripts.length > 0,
      hasContacts: contacts.length > 0,
      hasDocuments: documentChunks > 0 || allDocumentMatches.length > 0,
      hasPineconeDocuments: totalIntelligenceChunks > 0 || pineconeMatches.length > 0,
      hasMeetingContext: meetingChunks > 0,
      hasCompanyKnowledge: companyKBChunks > 0,
      hasOpportunities: opportunities.length > 0,
      hasAIInsights: !!client.ai_insights,
      hasServices: !!(client.services && Array.isArray(client.services) && client.services.length > 0),
      hasTechnologies: !!(client.technologies && Array.isArray(client.technologies) && client.technologies.length > 0),
      hasPainPoints: !!(client.pain_points && Array.isArray(client.pain_points) && client.pain_points.length > 0),
      hasCompetitors: !!(client.competitors && Array.isArray(client.competitors) && client.competitors.length > 0),
      hasBlogs: !!(client.blogs && Array.isArray(client.blogs) && client.blogs.length > 0),
    };

    const qualityScore = Object.values(dataQuality).filter(Boolean).length;
    const confidence = qualityScore >= 6 ? 'high' : qualityScore >= 3 ? 'medium' : 'low';

    return new Response(
      JSON.stringify({
        success: true,
        answer,
        sources: sourcesList,
        metadata: {
          intent: intent.type,
          confidence,
          sources: {
            intelligenceChunksRetrieved: totalIntelligenceChunks,
            meetingChunksFound: meetingChunks,
            documentChunksFound: documentChunks,
            companyKBChunksFound: companyKBChunks,
            legacyDocumentsSearched: allDocumentMatches.filter((d: any) =>
              d.source_type !== 'meeting_transcript' && d.source_type !== 'fathom_transcript'
            ).length,
            manualTranscriptsIncluded: transcripts.length,
            fathomRecordingsAvailable: fathomRecordings.length,
            contactsFound: contacts.length,
            opportunitiesFound: opportunities.length,
            totalSourcesUsed: sourcesList.length,
          },
          dataQuality,
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
