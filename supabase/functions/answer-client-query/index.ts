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
  if (lowerQuery.match(/contact|person|people|team|who/)) topics.push('contacts');
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
  const { client, companyProfile, contacts, transcripts, fathomRecordings, opportunities, documentMatches } = data;
  const contextParts = [];

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

  if (contacts && contacts.length > 0 && (intent.topics.includes('contacts') || mode === 'deep')) {
    const decisionMakers = contacts.filter((c: any) => c.is_decision_maker);
    const primaryContacts = contacts.filter((c: any) => c.is_primary);
    const otherContacts = contacts.filter((c: any) => !c.is_decision_maker && !c.is_primary);

    const contactsSection = ['\n=== KEY CONTACTS ==='];

    if (decisionMakers.length > 0) {
      contactsSection.push('Decision Makers:');
      decisionMakers.forEach((c: any) => {
        contactsSection.push(`  • ${c.name} - ${c.role}${c.department ? ` (${c.department})` : ''}`);
        contactsSection.push(`    Email: ${c.email}${c.phone ? ` | Phone: ${c.phone}` : ''}`);
        if (c.influence_level) contactsSection.push(`    Influence: ${c.influence_level}`);
      });
    }

    if (primaryContacts.length > 0) {
      contactsSection.push('\nPrimary Contacts:');
      primaryContacts.forEach((c: any) => {
        contactsSection.push(`  • ${c.name} - ${c.role}${c.department ? ` (${c.department})` : ''}`);
        contactsSection.push(`    Email: ${c.email}${c.phone ? ` | Phone: ${c.phone}` : ''}`);
      });
    }

    if (mode === 'deep' && otherContacts.length > 0) {
      contactsSection.push('\nOther Contacts:');
      otherContacts.slice(0, 3).forEach((c: any) => {
        contactsSection.push(`  • ${c.name} - ${c.role}${c.email ? ` (${c.email})` : ''}`);
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
  const basePrompt = `You are an expert business intelligence assistant analyzing client data to provide accurate, actionable insights.\n\nYour role is to help account managers understand their clients better and make informed decisions.`;

  const intentSpecificGuidance: Record<string, string> = {
    'factual': 'Provide clear, direct answers based on the data. Cite specific sources.',
    'analytical': 'Analyze patterns and provide deep insights. Explain the "why" behind observations.',
    'comparative': 'Make clear comparisons and highlight key differences or similarities.',
    'recommendation': 'Provide strategic recommendations with reasoning and specific action items.',
    'exploratory': 'Explore possibilities and potential scenarios. Think creatively about opportunities.',
  };

  const guidelines = [
    '• Base all answers strictly on the provided data - never make assumptions',
    '• Always cite your sources (e.g., "According to the meeting on June 15..." or "Based on the uploaded proposal document...")',
    '• Be specific with numbers, dates, names, and quotes when available',
    '• If information is missing or unclear, explicitly state what data would be needed',
    `• ${intentSpecificGuidance[intent.type]}`,
  ];

  if (intent.topics.length > 0) {
    guidelines.push(`• Focus on: ${intent.topics.join(', ')}`);
  }

  if (mode === 'deep') {
    guidelines.push('• Provide comprehensive analysis with multiple perspectives');
    guidelines.push('• Include relevant context and background information');
  } else {
    guidelines.push('• Keep responses concise and focused');
    guidelines.push('• Prioritize the most important information');
  }

  return `${basePrompt}\n\n${guidelines.join('\n')}`;
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

    const intent = analyzeQueryIntent(query);
    console.log('Query intent:', intent);

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
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const searchLimit = mode === 'deep' ? 20 : 12;
    const similarityThreshold = intent.type === 'factual' ? 0.70 : 0.60;

    const { data: documentMatches } = await supabaseClient.rpc('match_all_content', {
      query_embedding: queryEmbedding,
      match_threshold: similarityThreshold,
      match_count: searchLimit,
      filter_user_id: user.id,
      filter_client_id: clientId,
    });

    const contextData = {
      client,
      companyProfile,
      contacts,
      transcripts,
      fathomRecordings,
      opportunities,
      documentMatches: documentMatches || [],
    };

    const fullContext = buildEnhancedContext(contextData, intent, mode);
    const systemPrompt = buildEnhancedPrompt(intent, mode);

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
    const answer = chatData.choices[0].message.content;

    const dataQuality = {
      hasTranscripts: transcripts.length > 0,
      hasContacts: contacts.length > 0,
      hasDocuments: (documentMatches?.length || 0) > 0,
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
        metadata: {
          intent: intent.type,
          confidence,
          sources: {
            documentsSearched: documentMatches?.filter((d: any) =>
              d.source_type !== 'meeting_transcript' && d.source_type !== 'fathom_transcript'
            ).length || 0,
            manualTranscriptsIncluded: transcripts.length,
            fathomRecordingsAvailable: fathomRecordings.length,
            transcriptMatchesFound: documentMatches?.filter((d: any) =>
              d.source_type === 'meeting_transcript' || d.source_type === 'fathom_transcript'
            ).length || 0,
            fathomTranscriptsFound: documentMatches?.filter((d: any) =>
              d.source_type === 'fathom_transcript'
            ).length || 0,
            contactsFound: contacts.length,
            opportunitiesFound: opportunities.length,
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