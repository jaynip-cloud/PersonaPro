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

    // 1.5. Fetch Company Profile Data (Knowledge Base)
    const { data: companyProfile } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

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

    // 3. Enhanced Perplexity Search (Using Company Profile Data)
    console.log('Data gathered. Performing enhanced Perplexity search using company profile data...');
    let marketIntelligence = '';
    let marketIntelligenceStatus = 'not_attempted';
    let marketIntelligenceError = '';

    if (!perplexityKey) {
      marketIntelligenceStatus = 'no_api_key';
    } else if (!client.name) {
      marketIntelligenceStatus = 'no_client_name';
    } else {
      try {
        // Build comprehensive search query using company profile data
        const companyName = client.name;
        const industry = client.industry || companyProfile?.industry || '';
        const website = client.website || companyProfile?.website || '';
        const linkedinUrl = client.linkedin_url || companyProfile?.linkedin_url || '';
        const services = companyProfile?.services || [];
        const technology = companyProfile?.technology || {};
        const leadership = companyProfile?.leadership || [];
        const blogs = companyProfile?.blogs || [];
        
        // Build context from company profile
        let companyContext = `Company: ${companyName}`;
        if (industry) companyContext += `\nIndustry: ${industry}`;
        if (website) companyContext += `\nWebsite: ${website}`;
        if (linkedinUrl) companyContext += `\nLinkedIn: ${linkedinUrl}`;
        
        if (services && Array.isArray(services) && services.length > 0) {
          companyContext += `\n\nServices Offered: ${services.map((s: any) => s.name || s).join(', ')}`;
        }
        
        if (technology && typeof technology === 'object') {
          if (technology.stack && Array.isArray(technology.stack) && technology.stack.length > 0) {
            companyContext += `\nTechnology Stack: ${technology.stack.join(', ')}`;
          }
          if (technology.partners && Array.isArray(technology.partners) && technology.partners.length > 0) {
            companyContext += `\nPartners: ${technology.partners.join(', ')}`;
          }
        }
        
        if (leadership && Array.isArray(leadership) && leadership.length > 0) {
          companyContext += `\n\nLeadership Team: ${leadership.map((l: any) => `${l.name || ''} (${l.role || ''})`).filter(Boolean).join(', ')}`;
        }
        
        if (blogs && Array.isArray(blogs) && blogs.length > 0) {
          companyContext += `\n\nRecent Blog Topics: ${blogs.slice(0, 5).map((b: any) => b.title || '').filter(Boolean).join(', ')}`;
        }

        const searchQuery = `Based on the following company information, conduct comprehensive research and provide deep insights:

${companyContext}

Please research and provide:
1. Recent news, press releases, and major announcements (last 6-12 months)
2. Current market position and competitive landscape analysis
3. Growth trajectory, funding rounds, acquisitions, or strategic moves
4. Industry trends and how they specifically affect this company
5. Public sentiment, reviews, and reputation analysis
6. Key challenges, pain points, and opportunities in their market
7. Strategic partnerships, collaborations, or alliances
8. Technology adoption trends and innovation focus areas
9. Customer base and market segments they serve
10. Financial health indicators (if publicly available)

Focus on:
- Factual, recent information from reliable sources (news sites, press releases, industry reports)
- Specific details about this company, not generic industry information
- Actionable insights that can inform business strategy
- Connections between their services, technology stack, and market position

Provide comprehensive analysis with specific examples and data points.`;

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
                content: 'You are an elite market research analyst specializing in comprehensive company intelligence. Provide detailed, factual, and actionable insights based on current web data. Always cite specific sources and data points.'
              },
              {
                role: 'user',
                content: searchQuery
              }
            ],
            temperature: 0.2,
            max_tokens: 3000,
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
        console.error('Enhanced web search failed:', e);
        marketIntelligenceStatus = 'fetch_error';
        marketIntelligenceError = e.message || String(e);
      }
    }

    // 4. Generate AI Insights
    console.log('Generating comprehensive AI insights...');

    // Build company profile context
    const services = companyProfile?.services || [];
    const technology = companyProfile?.technology || {};
    const leadership = companyProfile?.leadership || [];
    const blogs = companyProfile?.blogs || [];
    
    const clientContext = `
# CLIENT PROFILE
Company: ${client.name}
Industry: ${client.industry || companyProfile?.industry || 'Not specified'}
Location: ${client.city ? `${client.city}, ${client.country || ''}` : client.country || companyProfile?.location || 'Not specified'}
Company Size: ${client.company_size || companyProfile?.size || 'Not specified'}
Website: ${client.website || companyProfile?.website || 'Not specified'}
Status: ${client.status || 'Active'}

## Contact Information
Primary Contact: ${client.contact_name || 'Not specified'}
Job Title: ${client.job_title || 'Not specified'}
Email: ${client.primary_email || companyProfile?.email || 'Not specified'}
Phone: ${client.primary_phone || companyProfile?.phone || 'Not specified'}

## Company Overview
${client.company_overview || client.description || companyProfile?.about || companyProfile?.value_proposition || 'No overview available'}

${companyProfile?.mission ? `Mission: ${companyProfile.mission}` : ''}
${companyProfile?.vision ? `Vision: ${companyProfile.vision}` : ''}

## Goals & Expectations
Short-term Goals: ${client.short_term_goals || 'Not specified'}
Long-term Goals: ${client.long_term_goals || 'Not specified'}
Expectations: ${client.expectations || 'Not specified'}

# COMPANY PROFILE DATA (Knowledge Base)
${services && Array.isArray(services) && services.length > 0 ? `
## Services Offered (${services.length} total)
${services.map((s: any) => `- ${s.name || 'Unnamed Service'}: ${s.description || 'No description'}`).join('\n')}
` : 'No services data available'}

${technology && typeof technology === 'object' ? `
## Technology Stack
${technology.stack && Array.isArray(technology.stack) && technology.stack.length > 0 ? `Technologies: ${technology.stack.join(', ')}` : 'No technology stack data'}
${technology.partners && Array.isArray(technology.partners) && technology.partners.length > 0 ? `Partners: ${technology.partners.join(', ')}` : ''}
${technology.integrations && Array.isArray(technology.integrations) && technology.integrations.length > 0 ? `Integrations: ${technology.integrations.join(', ')}` : ''}
` : ''}

${leadership && Array.isArray(leadership) && leadership.length > 0 ? `
## Leadership Team (${leadership.length} members)
${leadership.map((l: any) => `- ${l.name || 'Unknown'}: ${l.role || 'No title'}${l.bio ? ` - ${l.bio.substring(0, 100)}` : ''}`).join('\n')}
` : ''}

${blogs && Array.isArray(blogs) && blogs.length > 0 ? `
## Recent Blog Articles (${blogs.length} total, showing latest 5)
${blogs.slice(0, 5).map((b: any) => `- ${b.title || 'Untitled'}: ${b.summary || b.url || ''}`).join('\n')}
` : ''}

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

# ENHANCED MARKET INTELLIGENCE (Perplexity Web Search - Based on Company Profile Data)
${marketIntelligence || 'No external market data available'}
`;

    const analysisPrompt = `You are an elite business intelligence analyst specializing in client relationship analysis, behavioral psychology, and market intelligence. Analyze this comprehensive client data and provide deep insights.

${clientContext}

## ANALYSIS FRAMEWORK

Provide a comprehensive analysis in JSON format with ALL sections organized under the executive summary. The structure should be:

{
  "executiveSummary": {
    "overview": "A comprehensive, data-backed executive summary of the client relationship (5-8 sentences). This should be a detailed narrative that ties all insights together, covering relationship health, behavioral patterns, market position, opportunities, and strategic outlook.",
    "reasoning": "Explain WHY you wrote this summary. Cite specific data points from company profile, market intelligence, meetings, or projects.",
    
    "sections": {
      "companyProfile": {
        "maturityLevel": "early-stage | growing | established | enterprise",
        "sophisticationScore": number (0-100),
        "readinessToEngage": "high | medium | low",
        "strategicValue": number (0-100),
        "keyCharacteristics": "Detailed 4-5 sentence description of what makes this company unique, including their core competencies, market positioning, and distinctive qualities",
        "companyOverview": "Comprehensive 4-6 sentence overview of the company's business model, target market, value proposition, and market presence",
        "reasoning": "Detailed explanation of how you determined these characteristics based on the company data, services, technology, and market intelligence"
      },

      "marketIntelligence": {
        "industryPosition": "Detailed 5-6 sentence analysis of their market position based on Perplexity search results, including competitive standing, market share indicators, and industry recognition",
        "competitivePressure": "low | moderate | high",
        "growthTrajectory": "declining | stable | growing | rapid growth",
        "recentNews": "Comprehensive summary of recent news, announcements, funding rounds, partnerships, or market movements (from Perplexity search) - minimum 4-5 sentences",
        "marketChallenges": ["Detailed descriptions of 3-5 key challenges they face in their market, each with 2-3 sentences explaining the challenge and its impact"],
        "marketOpportunities": ["Detailed descriptions of 3-5 opportunities visible in their market, each with 2-3 sentences explaining the opportunity and potential value"],
        "competitiveLandscape": "Detailed 4-5 sentence analysis of their competitive environment, key competitors, and differentiation factors",
        "reasoning": "Cite specific findings from the Perplexity search that informed this analysis, including sources and data points"
      },

      "relationshipHealth": {
        "healthScore": number (0-100),
        "healthScoreReasoning": "Detailed 4-5 sentence explanation with specific evidence about relationship health indicators",
        "overallSentiment": "very positive | positive | neutral | concerned | negative",
        "sentimentScore": number (0-100),
        "sentimentScoreReasoning": "Detailed 3-4 sentence explanation of sentiment assessment with evidence",
        "relationshipTrend": "improving | stable | declining",
        "trustLevel": "high | medium | low",
        "strengthAreas": ["Detailed descriptions of 4-6 areas working well in the relationship, each with 2-3 sentences explaining why and providing evidence"],
        "riskAreas": ["Detailed descriptions of 3-5 potential problems or concerns, each with 2-3 sentences explaining the risk and its implications"],
        "churnRisk": "low | medium | high",
        "churnRiskReasoning": "Detailed 3-4 sentence explanation of churn risk assessment with supporting evidence",
        "expansionPotential": "low | medium | high",
        "expansionPotentialReasoning": "Detailed 3-4 sentence explanation of expansion potential with indicators",
        "reasoning": "Comprehensive explanation of what data points led to these assessments, citing specific interactions, meetings, or behaviors"
      },

      "behavioralInsights": {
        "communicationStyle": "formal | professional | casual | mixed",
        "communicationStyleAnalysis": "Detailed 3-4 sentence analysis of their communication patterns with specific examples",
        "decisionMakingPattern": "data-driven | relationship-driven | consensus-based | hierarchical | fast-moving | cautious",
        "decisionMakingAnalysis": "Detailed 4-5 sentence analysis of how they make decisions with evidence from interactions",
        "engagementLevel": "highly engaged | moderately engaged | passive | disengaged",
        "engagementAnalysis": "Detailed 3-4 sentence analysis of engagement patterns with specific indicators",
        "priorities": ["Detailed descriptions of 5-7 ranked priorities, each with 2-3 sentences explaining why it matters and providing evidence"],
        "painPoints": ["Detailed descriptions of 4-6 biggest challenges and frustrations, each with 2-3 sentences explaining the pain point and its impact"],
        "motivations": ["Detailed descriptions of 4-6 key motivations, each with 2-3 sentences explaining what drives their decision-making"],
        "riskTolerance": "risk-averse | balanced | risk-taking",
        "riskToleranceReasoning": "Detailed 3-4 sentence explanation of risk tolerance with examples",
        "innovationAppetite": "bleeding-edge | early-adopter | pragmatic | conservative",
        "innovationAppetiteReasoning": "Detailed 3-4 sentence explanation of innovation approach with evidence",
        "valueOrientation": "cost-focused | quality-focused | speed-focused | relationship-focused | innovation-focused",
        "valueOrientationReasoning": "Detailed 3-4 sentence explanation of value orientation with supporting evidence",
        "evidence": "Comprehensive citation of specific interactions, transcript excerpts, meeting notes, or behaviors that support this analysis (minimum 5-6 sentences)"
      },

      "opportunities": {
        "upsellOpportunities": ["Detailed descriptions of 4-6 specific areas where services could be expanded, each with 3-4 sentences explaining the opportunity, potential value, and approach"],
        "crossSellOpportunities": ["Detailed descriptions of 4-6 other services they might need, each with 3-4 sentences explaining why, fit, and potential impact"],
        "budgetIndicators": "Comprehensive 5-6 sentence analysis of their budget capacity, spending patterns, financial health indicators, and investment readiness",
        "decisionTimeframe": "fast | medium | slow",
        "decisionTimeframeReasoning": "Detailed 3-4 sentence explanation of decision timeframe with supporting evidence",
        "recommendedApproach": "Detailed 5-6 sentence strategy for how to best approach these opportunities, including timing, messaging, and tactics",
        "reasoning": "Comprehensive explanation of what data suggests these opportunities exist, citing specific indicators, conversations, or behaviors"
      },

      "actionPlan": {
        "immediatePriorities": ["Detailed descriptions of 5-7 top priorities for next 30 days, each with 3-4 sentences including specific actions, expected outcomes, and success metrics"],
        "strategicRecommendations": ["Detailed descriptions of 5-7 long-term relationship strategies, each with 4-5 sentences including reasoning, expected outcomes, implementation approach, and success indicators"],
        "communicationStrategy": "Comprehensive 5-6 sentence strategy for how to best communicate with this client based on their style, preferences, and behavioral patterns",
        "engagementTactics": ["Detailed descriptions of 5-6 specific tactics to deepen the relationship, each with 2-3 sentences explaining the tactic and expected impact"],
        "riskMitigation": ["Detailed descriptions of 4-6 actions to address identified risk areas, each with 3-4 sentences explaining the action, rationale, and expected outcome"],
        "reasoning": "Comprehensive 5-6 sentence explanation of the strategic thinking behind each recommendation, connecting them to the data analysis and relationship insights"
      },

      "keyMetrics": {
        "engagementScore": number (0-100),
        "engagementScoreReasoning": "Detailed 3-4 sentence explanation with specific evidence",
        "collaborationScore": number (0-100),
        "collaborationScoreReasoning": "Detailed 3-4 sentence explanation with specific evidence",
        "communicationScore": number (0-100),
        "communicationScoreReasoning": "Detailed 3-4 sentence explanation with specific evidence",
        "alignmentScore": number (0-100),
        "alignmentScoreReasoning": "Detailed 3-4 sentence explanation with specific evidence",
        "momentumScore": number (0-100),
        "momentumScoreReasoning": "Detailed 3-4 sentence explanation with specific evidence",
        "valueRealizationScore": number (0-100),
        "valueRealizationScoreReasoning": "Detailed 3-4 sentence explanation with specific evidence",
        "overallHealthScore": number (0-100),
        "overallHealthScoreReasoning": "Detailed 5-6 sentence explanation of how the overall score was calculated, weighting factors, and what it indicates about the relationship"
      },

      "signals": {
        "greenFlags": ["Positive signals and strengths"],
        "redFlags": ["Concerning signals that need attention"],
        "predictiveInsights": {
          "likelyNextStep": "Prediction of what they'll likely do next",
          "retentionProbability": number (0-100),
          "growthProbability": number (0-100),
          "timeToDecision": "days | weeks | months"
        },
        "reasoning": "Explain what data patterns led to these signals"
      },

      "dataAnalysis": {
        "companyProfileUsage": "Detailed 4-5 sentence explanation of how company profile data (services, technology, leadership, blogs) contributed to insights. Cite specific examples.",
        "marketIntelligenceUsage": "Detailed 4-5 sentence explanation of how Perplexity search results contributed. What specific insights came from market intelligence?",
        "internalDataUsage": "Detailed 4-5 sentence explanation of how meeting transcripts, documents, contacts, and projects contributed to the analysis",
        "dataConfidence": "high | medium | low",
        "dataConfidenceReasoning": "Detailed 3-4 sentence explanation of confidence level and why. What data sources were most reliable?",
        "dataGaps": "Detailed 3-4 sentence description of what data is missing that would improve the analysis"
      }
    }
  }
}

## CRITICAL REQUIREMENTS:
1. **ALL SECTIONS UNDER EXECUTIVE SUMMARY**: Every insight section must be nested under "executiveSummary.sections". The executive summary overview should tie all sections together.
2. **NO GENERIC INSIGHTS**: Do not use phrases like "optimize workflows", "leverage synergies", or "strategic alignment" unless backed by specific client details.
3. **EVIDENCE-BASED**: Every major conclusion must be supported by evidence from the provided data (company profile, transcripts, docs, Perplexity search results).
4. **REASONING REQUIRED**: Each section must include a "reasoning" field explaining how the insights were derived from the data.
5. **USE COMPANY PROFILE DATA**: Actively reference services, technology stack, leadership team, and blogs from the company profile in your analysis.
6. **PERPLEXITY INTEGRATION**: Reference specific findings from the Perplexity market intelligence search. Cite what you learned about their market position, recent news, or industry trends in the marketIntelligence section.
7. **METRICS DERIVATION**: All scores must be derived *strictly* from the data. If data is missing (e.g., no meetings), lower the relevant scores accordingly.
8. **HONESTY**: If data is insufficient to make a determination, state "Insufficient data" in the text fields or use conservative scores.
9. **COHESIVE NARRATIVE**: The executive summary overview should read as a cohesive story that references insights from all sections.
10. **JSON ONLY**: Respond ONLY with valid JSON. Ensure proper nesting under executiveSummary.sections.
`;

    // Log prompt length for debugging
    const promptLength = analysisPrompt.length;
    const estimatedTokens = Math.ceil(promptLength / 4); // Rough estimate: 1 token ≈ 4 characters
    console.log(`Sending request to OpenAI - Prompt length: ${promptLength} chars (~${estimatedTokens} tokens)`);
    console.log(`Max tokens for response: 4096`);

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
            content: 'You are an elite business intelligence analyst. You provide deep, specific, and evidence-based insights. You NEVER provide generic advice. You always cite your sources. You MUST respond with valid JSON only, no additional text or explanations.'
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        temperature: 0.5, // Lower temperature for more grounded analysis
        max_tokens: 4096, // Maximum for gpt-4o model
        response_format: { type: 'json_object' }, // Enforce JSON output
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    
    // Check if response has choices
    if (!openaiData.choices || openaiData.choices.length === 0) {
      console.error('OpenAI response has no choices:', JSON.stringify(openaiData));
      throw new Error('AI returned an invalid response structure. Please try again.');
    }
    
    // Check if message exists
    if (!openaiData.choices[0]?.message) {
      console.error('OpenAI response has no message:', JSON.stringify(openaiData.choices[0]));
      throw new Error('AI returned an invalid response structure (no message). Please try again.');
    }
    
    // Check for content filtering or other finish reasons
    const finishReason = openaiData.choices[0]?.finish_reason;
    if (finishReason === 'content_filter') {
      console.error('OpenAI response was filtered by content policy');
      throw new Error('AI response was filtered. Please try again or adjust your request.');
    }
    
    // Check if response was truncated
    if (finishReason === 'length') {
      console.warn('OpenAI response was truncated due to token limit');
      // We'll still try to parse what we got, but log a warning
    }
    
    // Try multiple ways to get the content
    let insightsText = openaiData.choices[0]?.message?.content;
    
    // If content is null/undefined, check if it's in a different field
    if (!insightsText && openaiData.choices[0]?.message) {
      console.warn('Content is null/undefined, checking alternative fields');
      console.warn('Message object:', JSON.stringify(openaiData.choices[0].message));
      // Sometimes content might be in a different format
      insightsText = openaiData.choices[0].message.text || openaiData.choices[0].message.response || '';
    }

    if (!insightsText || (typeof insightsText === 'string' && insightsText.trim().length === 0)) {
      console.error('OpenAI returned empty response');
      console.error('Response finish_reason:', finishReason);
      console.error('Usage:', openaiData.usage);
      console.error('Message object:', JSON.stringify(openaiData.choices[0]?.message));
      console.error('Full response (first 1000 chars):', JSON.stringify(openaiData, null, 2).substring(0, 1000));
      throw new Error('AI returned an empty response. Please try again.');
    }
    
    console.log(`Received response of length: ${insightsText.length} characters`);
    console.log(`Response finish_reason: ${openaiData.choices[0]?.finish_reason}`);
    if (openaiData.usage) {
      console.log(`Token usage - Prompt: ${openaiData.usage.prompt_tokens}, Completion: ${openaiData.usage.completion_tokens}, Total: ${openaiData.usage.total_tokens}`);
    }

    let insights;
    try {
      // Try to extract JSON from the response (might have markdown code blocks or extra text)
      let jsonText = insightsText.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      // Validate JSON before parsing
      if (!jsonText.startsWith('{') || !jsonText.trim().endsWith('}')) {
        console.error('Response does not appear to be valid JSON:', jsonText.substring(0, 200));
        throw new Error('AI response is not in valid JSON format');
      }
      
      insights = JSON.parse(jsonText);
      
      // Validate the structure has executiveSummary
      if (!insights.executiveSummary) {
        console.error('Response missing executiveSummary:', Object.keys(insights));
        throw new Error('AI response is missing required executiveSummary structure');
      }
      
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      console.error('Response text (first 500 chars):', insightsText.substring(0, 500));
      throw new Error(`Failed to parse AI insights: ${e.message || 'Invalid JSON format'}`);
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