import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ClientInsightsRequest {
  clientId: string;
}

interface PineconeMatch {
  id: string;
  score: number;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { clientId }: ClientInsightsRequest = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    // Fetch API keys including Pinecone
    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('openai_api_key, perplexity_api_key, pinecone_api_key, pinecone_environment, pinecone_index_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keysError) {
      console.error('Error fetching API keys:', keysError);
    }

    const openaiKey = apiKeys?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    const perplexityKey = apiKeys?.perplexity_api_key || Deno.env.get('PERPLEXITY_API_KEY');
    const pineconeKey = apiKeys?.pinecone_api_key;
    let pineconeEnvironment = apiKeys?.pinecone_environment;
    let pineconeIndexName = apiKeys?.pinecone_index_name;

    if (!openaiKey) {
      throw new Error('OpenAI API key is not configured. Please add your API key in Settings.');
    }

    console.log(`Gathering comprehensive data for client: ${clientId}`);

    // 1. Fetch Core Supabase Data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id);

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: pitches } = await supabase
      .from('saved_pitches')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // 2. Fetch Pinecone Data (Vector Search)
    let pineconeContext = '';
    let pineconeChunksCount = 0;

    if (pineconeKey) {
      try {
        console.log('Querying Pinecone for semantic context...');

        // Construct Pinecone URL
        let pineconeUrl = '';
        if (pineconeIndexName && pineconeIndexName.startsWith('https://')) {
          pineconeUrl = pineconeIndexName;
        } else if (pineconeEnvironment && pineconeEnvironment.startsWith('https://')) {
          pineconeUrl = pineconeEnvironment;
        } else if (pineconeIndexName && pineconeEnvironment) {
          pineconeUrl = `https://${pineconeIndexName}-${pineconeEnvironment}.svc.${pineconeEnvironment}.pinecone.io`;
        }

        if (pineconeUrl) {
          // Generate embedding for broad context
          const query = `Comprehensive history, key decisions, sentiment, and important details for client ${client.name}`;
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: query,
              dimensions: 512,
            }),
          });

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            const queryEmbedding = embeddingData.data[0].embedding;

            // Query meetings and documents
            const meetingsFilter = {
              user_id: { $eq: user.id },
              client_id: { $eq: clientId },
              source_type: { $eq: 'fathom_transcript' }
            };

            const documentsFilter = {
              user_id: { $eq: user.id },
              client_id: { $eq: clientId },
              source_type: { $eq: 'document' }
            };

            const [meetingChunks, documentChunks] = await Promise.all([
              queryPinecone(pineconeUrl, pineconeKey, queryEmbedding, 15, meetingsFilter, 'meetings'),
              queryPinecone(pineconeUrl, pineconeKey, queryEmbedding, 10, documentsFilter, 'documents')
            ]);

            const allChunks = [...meetingChunks, ...documentChunks]
              .sort((a, b) => b.score - a.score) // Sort by similarity
              .slice(0, 20); // Take top 20 most relevant chunks

            pineconeChunksCount = allChunks.length;

            if (allChunks.length > 0) {
              pineconeContext = `
# SEMANTIC SEARCH RESULTS (From Meeting Transcripts & Documents)
${allChunks.map(chunk => `
## Source: ${chunk.metadata.source_type} - ${chunk.metadata.recording_title || chunk.metadata.title || 'Untitled'} (${chunk.metadata.meeting_date || chunk.metadata.created_at || 'Unknown Date'})
"${chunk.metadata.text}"
`).join('\n')}
`;
            }
          }
        }
      } catch (e) {
        console.error('Error querying Pinecone:', e);
      }
    }

    // 3. Web Search (Market Intelligence)
    console.log('Data gathered. Performing web search for market intelligence...');
    let marketIntelligence = '';
    let marketIntelligenceStatus = 'not_attempted';
    let marketIntelligenceError = '';

    if (!perplexityKey) {
      marketIntelligenceStatus = 'no_api_key';
    } else if (!client.name) {
      marketIntelligenceStatus = 'no_client_name';
    } else {
      try {
        const searchQuery = `Research ${client.name} in the ${client.industry || 'business'} industry. Provide:
1. Recent news, press releases, and announcements (last 6 months)
2. Market position and competitive landscape
3. Growth trajectory and funding information
4. Industry trends affecting this company
5. Public sentiment and reputation
6. Key challenges and opportunities in their market

Focus on factual, recent information from reliable sources.`;

        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${perplexityKey}`
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: 'You are a market research analyst. Provide comprehensive, factual information about companies and their markets based on current web data.'
              },
              {
                role: 'user',
                content: searchQuery
              }
            ],
            temperature: 0.2,
            max_tokens: 2000,
          })
        });

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          marketIntelligence = perplexityData.choices?.[0]?.message?.content || '';
          marketIntelligenceStatus = marketIntelligence ? 'success' : 'empty_response';
        } else {
          const errorText = await perplexityResponse.text();
          console.error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`);
          marketIntelligenceStatus = 'api_error';
          marketIntelligenceError = errorText;
        }
      } catch (e) {
        console.error('Web search failed:', e);
        marketIntelligenceStatus = 'fetch_error';
        marketIntelligenceError = e.message || String(e);
      }
    }

    // 4. Generate AI Insights
    console.log('Generating comprehensive AI insights...');

    const clientContext = `
# CLIENT PROFILE
Company: ${client.name}
Industry: ${client.industry || 'Not specified'}
Location: ${client.city ? `${client.city}, ${client.country || ''}` : client.country || 'Not specified'}
Company Size: ${client.company_size || 'Not specified'}
Website: ${client.website || 'Not specified'}
Status: ${client.status || 'Active'}

## Contact Information
Primary Contact: ${client.contact_name || 'Not specified'}
Job Title: ${client.job_title || 'Not specified'}
Email: ${client.primary_email || 'Not specified'}
Phone: ${client.primary_phone || 'Not specified'}

## Company Overview
${client.company_overview || client.description || 'No overview available'}

## Goals & Expectations
Short-term Goals: ${client.short_term_goals || 'Not specified'}
Long-term Goals: ${client.long_term_goals || 'Not specified'}
Expectations: ${client.expectations || 'Not specified'}

# CONTACTS (${contacts?.length || 0} total)
${contacts?.map(c => `
- ${c.name} (${c.title || 'No title'})
  Role: ${c.department || 'Not specified'}
  Decision Maker: ${c.is_decision_maker ? 'Yes' : 'No'}
  Influence: ${c.influence_level || 'Unknown'}
`).join('\n') || 'No contacts recorded'}

# PROJECTS (${projects?.length || 0} total)
${projects?.map(p => `
- ${p.name} (${p.status})
  Budget: ${p.budget_range || 'Not specified'}
  Timeline: ${p.timeline || 'Not specified'}
  ${p.description ? `Description: ${p.description.substring(0, 200)}` : ''}
`).join('\n') || 'No projects recorded'}

${pineconeContext}

# MARKET INTELLIGENCE (Web Search Results)
${marketIntelligence || 'No external market data available'}
`;

    const analysisPrompt = `You are an elite business intelligence analyst specializing in client relationship analysis, behavioral psychology, and market intelligence. Analyze this comprehensive client data and provide deep insights.

${clientContext}

## ANALYSIS FRAMEWORK

Provide a comprehensive analysis in JSON format with the following structure:

{
  "executiveSummary": "A detailed, data-backed executive summary of the client relationship. Must be at least 4-5 sentences.",
  "executiveSummaryReasoning": "Explain WHY you wrote this summary. Cite specific data points (e.g., 'Based on the meeting on [Date] where they mentioned X' or 'Market data shows Y').",

  "clientProfile": {
    "maturityLevel": "early-stage | growing | established | enterprise",
    "sophisticationScore": number (0-100),
    "readinessToEngage": "high | medium | low",
    "strategicValue": number (0-100)
  },

  "behavioralAnalysis": {
    "communicationStyle": "formal | professional | casual | mixed",
    "decisionMakingPattern": "data-driven | relationship-driven | consensus-based | hierarchical | fast-moving | cautious",
    "engagementLevel": "highly engaged | moderately engaged | passive | disengaged",
    "reliabilityScore": number (0-100),
    "evidence": "Cite specific interactions or transcript excerpts that support this analysis."
  },

  "sentimentAnalysis": {
    "overallSentiment": "very positive | positive | neutral | concerned | negative",
    "sentimentScore": number (0-100),
    "relationshipTrend": "improving | stable | declining",
    "trustLevel": "high | medium | low",
    "rootCauses": "Explain the drivers of this sentiment based on the data."
  },

  "psychographicProfile": {
    "priorities": ["ranked list of what matters most to this client"],
    "painPoints": ["their biggest challenges and frustrations"],
    "motivations": ["what drives their decision-making"],
    "riskTolerance": "risk-averse | balanced | risk-taking",
    "innovationAppetite": "bleeding-edge | early-adopter | pragmatic | conservative",
    "valueOrientation": "cost-focused | quality-focused | speed-focused | relationship-focused | innovation-focused"
  },

  "relationshipHealth": {
    "healthScore": number (0-100),
    "strengthAreas": ["what's working well"],
    "riskAreas": ["potential problems"],
    "churnRisk": "low | medium | high",
    "expansionPotential": "low | medium | high"
  },

  "marketContext": {
    "industryPosition": "Analysis of their position based on web search",
    "competitivePressure": "low | moderate | high",
    "growthTrajectory": "declining | stable | growing | rapid growth",
    "marketChallenges": ["key challenges they face"],
    "marketOpportunities": ["opportunities visible in their market"]
  },

  "opportunityAnalysis": {
    "upsellOpportunities": ["specific areas where you could expand services"],
    "crossSellOpportunities": ["other services they might need"],
    "budgetIndicators": "Analysis of their budget capacity",
    "decisionTimeframe": "fast | medium | slow"
  },

  "actionableInsights": {
    "immediatePriorities": ["top 3-5 things to do in next 30 days"],
    "strategicRecommendations": ["long-term relationship strategies"],
    "communicationStrategy": "How to best communicate with this client",
    "engagementTactics": ["specific tactics to deepen the relationship"]
  },

  "kpis": {
    "engagementScore": number (0-100),
    "collaborationScore": number (0-100),
    "communicationScore": number (0-100),
    "alignmentScore": number (0-100),
    "momentumScore": number (0-100),
    "valueRealizationScore": number (0-100)
  },
  "kpiReasoning": "Explain how these scores were calculated based on the provided data (e.g., 'Engagement is high due to frequent meetings and quick email responses').",

  "redFlags": ["Any concerning signals"],
  "greenFlags": ["Positive signals"],

  "predictiveInsights": {
    "likelyNextStep": "Prediction of what they'll likely do next",
    "retentionProbability": number (0-100),
    "growthProbability": number (0-100),
    "timeToDecision": "days | weeks | months"
  },

  "dataSourcesAnalysis": {
    "pineconeUsage": "How did the vector search results (transcripts/docs) contribute to this analysis?",
    "webSearchUsage": "How did the market intelligence contribute?",
    "databaseUsage": "How did the structured DB data contribute?"
  }
}

## CRITICAL REQUIREMENTS:
1. **NO GENERIC INSIGHTS**: Do not use phrases like "optimize workflows", "leverage synergies", or "strategic alignment" unless backed by specific client details.
2. **EVIDENCE-BASED**: Every major conclusion must be supported by evidence from the provided data (transcripts, docs, web search).
3. **KPI DERIVATION**: KPIs must be derived *strictly* from the data. If data is missing (e.g., no meetings), lower the relevant scores (e.g., Engagement Score).
4. **HONESTY**: If data is insufficient to make a determination, state "Insufficient data" in the text fields or use conservative scores.
5. **JSON ONLY**: Respond ONLY with valid JSON.
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an elite business intelligence analyst. You provide deep, specific, and evidence-based insights. You NEVER provide generic advice. You always cite your sources.'
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        temperature: 0.5, // Lower temperature for more grounded analysis
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    let insightsText = openaiData.choices[0].message.content;

    let insights;
    try {
      const jsonMatch = insightsText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insightsText = jsonMatch[0];
      }
      insights = JSON.parse(insightsText);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', insightsText);
      throw new Error('Failed to parse AI insights.');
    }

    console.log('Insights generated successfully');

    const dataGathered = {
      client: true,
      contacts: contacts?.length || 0,
      projects: projects?.length || 0,
      pitches: pitches?.length || 0,
      pineconeChunks: pineconeChunksCount,
      marketIntelligence: !!marketIntelligence && marketIntelligenceStatus === 'success',
      marketIntelligenceStatus,
      marketIntelligenceError: marketIntelligenceError || undefined,
    };

    const insightsWithMetadata = {
      ...insights,
      dataGathered,
    };

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        ai_insights: insightsWithMetadata,
        ai_insights_generated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating client with insights:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights: insightsWithMetadata,
        dataGathered,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error generating client insights:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
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
): Promise<PineconeMatch[]> {
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
  return data.matches || [];
}