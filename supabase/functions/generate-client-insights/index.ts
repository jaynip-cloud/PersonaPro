import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ClientInsightsRequest {
  clientId: string;
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

    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('openai_api_key, perplexity_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keysError) {
      console.error('Error fetching API keys:', keysError);
    }

    const openaiKey = apiKeys?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    const perplexityKey = apiKeys?.perplexity_api_key || Deno.env.get('PERPLEXITY_API_KEY');

    if (!openaiKey) {
      throw new Error('OpenAI API key is not configured. Please add your API key in Settings.');
    }

    console.log(`Gathering comprehensive data for client: ${clientId}`);

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

    const { data: meetings } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('meeting_date', { ascending: false })
      .limit(10);

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

    let documentsList: any[] = [];
    try {
      const { data: documents } = await supabase.storage
        .from('client-documents')
        .list(`${user.id}/${clientId}`);

      if (documents) {
        documentsList = documents.map(doc => ({
          name: doc.name,
          size: doc.metadata?.size,
          type: doc.metadata?.mimetype,
        }));
      }
    } catch (e) {
      console.log('No documents found for client');
    }

    console.log('Data gathered. Performing web search for market intelligence...');

    let marketIntelligence = '';
    if (client.name && perplexityKey) {
      try {
        const searchQuery = `Research ${client.name} in the ${client.industry || 'business'} industry. Provide:
1. Recent news, press releases, and announcements (last 6 months)
2. Market position and competitive landscape
3. Growth trajectory and funding information
4. Industry trends affecting this company
5. Public sentiment and reputation
6. Notable partnerships, acquisitions, or strategic moves
7. Key challenges and opportunities in their market
8. Financial performance indicators if publicly available

Focus on factual, recent information from reliable sources.`;

        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${perplexityKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
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
            max_tokens: 2000
          })
        });

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          marketIntelligence = perplexityData.choices[0]?.message?.content || '';
        }
      } catch (e) {
        console.log('Web search not available:', e);
        marketIntelligence = 'Web search unavailable - analysis based on stored data only.';
      }
    }

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

## Satisfaction
Satisfaction Score: ${client.satisfaction_score ? `${client.satisfaction_score}/10` : 'Not rated'}
Feedback: ${client.satisfaction_feedback || 'No feedback provided'}

# CONTACTS (${contacts?.length || 0} total)
${contacts?.map(c => `
- ${c.name} (${c.title || 'No title'})
  Role: ${c.department || 'Not specified'}
  Decision Maker: ${c.is_decision_maker ? 'Yes' : 'No'}
  Influence: ${c.influence_level || 'Unknown'}
  Contact: ${c.email || ''} ${c.phone || ''}
`).join('\n') || 'No contacts recorded'}

# MEETING HISTORY (${meetings?.length || 0} meetings)
${meetings?.map(m => `
## ${m.title} (${m.meeting_date})
${m.transcript?.substring(0, 500)}${m.transcript?.length > 500 ? '...' : ''}
`).join('\n---\n') || 'No meeting transcripts available'}

# PROJECTS (${projects?.length || 0} total)
${projects?.map(p => `
- ${p.name} (${p.status})
  Budget: ${p.budget_range || 'Not specified'}
  Timeline: ${p.timeline || 'Not specified'}
  ${p.description ? `Description: ${p.description.substring(0, 200)}` : ''}
`).join('\n') || 'No projects recorded'}

# SALES PITCHES (${pitches?.length || 0} total)
${pitches?.map(p => `
- ${p.title || 'Untitled'} (${new Date(p.created_at).toLocaleDateString()})
  Focus: ${p.pitch_content?.substring(0, 150) || ''}
`).join('\n') || 'No pitches saved'}

# DOCUMENTS (${documentsList.length} files)
${documentsList.map(d => `- ${d.name} (${d.type || 'unknown type'})`).join('\n') || 'No documents uploaded'}

# SOCIAL MEDIA PRESENCE
LinkedIn: ${client.linkedin_url || 'Not provided'}
Twitter: ${client.twitter_url || 'Not provided'}
Facebook: ${client.facebook_url || 'Not provided'}
Instagram: ${client.instagram_url || 'Not provided'}

# MARKET INTELLIGENCE (Web Search Results)
${marketIntelligence || 'No external market data available'}
`;

    const analysisPrompt = `You are an elite business intelligence analyst specializing in client relationship analysis, behavioral psychology, and market intelligence. Analyze this comprehensive client data and provide deep insights.

${clientContext}

## ANALYSIS FRAMEWORK

Provide a comprehensive analysis in JSON format with the following structure:

{
  \"executiveSummary\": \"2-3 sentence high-level overview of this client relationship and status\",

  \"clientProfile\": {
    \"maturityLevel\": \"early-stage | growing | established | enterprise\",
    \"sophisticationScore\": number (0-100, based on goals clarity, processes, expectations),
    \"readinessToEngage\": \"high | medium | low\",
    \"strategicValue\": number (0-100, their long-term potential value)
  },

  \"behavioralAnalysis\": {
    \"communicationStyle\": \"formal | professional | casual | mixed\",
    \"decisionMakingPattern\": \"data-driven | relationship-driven | consensus-based | hierarchical | fast-moving | cautious\",
    \"engagementLevel\": \"highly engaged | moderately engaged | passive | disengaged\",
    \"responsePattern\": \"quick responder | thoughtful responder | slow responder | inconsistent\",
    \"meetingBehavior\": \"Analysis of meeting frequency, topics, tone, and outcomes based on transcripts\",
    \"projectEngagement\": \"Analysis of how they engage with projects - active, hands-off, demanding, collaborative, etc.\",
    \"reliabilityScore\": number (0-100, based on meeting consistency, communication patterns)
  },

  \"sentimentAnalysis\": {
    \"overallSentiment\": \"very positive | positive | neutral | concerned | negative\",
    \"sentimentScore\": number (0-100, overall satisfaction and relationship health),
    \"satisfactionDrivers\": [\"key factors driving positive sentiment\"],
    \"concernAreas\": [\"areas of concern or dissatisfaction if any\"],
    \"relationshipTrend\": \"improving | stable | declining\",
    \"trustLevel\": \"high | medium | low\",
    \"enthusiasmLevel\": number (0-100, their excitement about working together),
    \"sentimentEvolution\": \"How sentiment has evolved over time based on meeting history\"
  },

  \"psychographicProfile\": {
    \"priorities\": [\"ranked list of what matters most to this client\"],
    \"painPoints\": [\"their biggest challenges and frustrations\"],
    \"motivations\": [\"what drives their decision-making\"],
    \"riskTolerance\": \"risk-averse | balanced | risk-taking\",
    \"innovationAppetite\": \"bleeding-edge | early-adopter | pragmatic | conservative\",
    \"valueOrientation\": \"cost-focused | quality-focused | speed-focused | relationship-focused | innovation-focused\"
  },

  \"relationshipHealth\": {
    \"healthScore\": number (0-100, overall relationship health),
    \"strengthAreas\": [\"what's working well in the relationship\"],
    \"riskAreas\": [\"potential problems or red flags\"],
    \"churnRisk\": \"low | medium | high\",
    \"expansionPotential\": \"low | medium | high\",
    \"loyaltyScore\": number (0-100, likelihood they'll stay long-term)
  },

  \"marketContext\": {
    \"industryPosition\": \"Analysis of their position in their industry based on web search\",
    \"competitivePressure\": \"low | moderate | high\",
    \"growthTrajectory\": \"declining | stable | growing | rapid growth\",
    \"marketChallenges\": [\"key challenges they face in their market\"],
    \"marketOpportunities\": [\"opportunities visible in their market\"],
    \"industryTrends\": [\"relevant trends affecting them\"],
    \"reputationInsights\": \"What the market/public perception is of this company\"
  },

  \"opportunityAnalysis\": {
    \"upsellOpportunities\": [\"specific areas where you could expand services\"],
    \"crossSellOpportunities\": [\"other services they might need\"],
    \"valueGaps\": [\"unmet needs or problems you could solve\"],
    \"timingIndicators\": [\"signals that now is a good time to propose something\"],
    \"budgetIndicators\": \"Analysis of their budget capacity and spending patterns\",
    \"decisionTimeframe\": \"Estimated decision-making timeline - fast | medium | slow\"
  },

  \"actionableInsights\": {
    \"immediatePriorities\": [\"top 3-5 things to do in next 30 days\"],
    \"strategicRecommendations\": [\"long-term relationship strategies\"],
    \"communicationStrategy\": \"How to best communicate with this client based on their patterns\",
    \"engagementTactics\": [\"specific tactics to deepen the relationship\"],
    \"riskMitigation\": [\"actions to address any risk areas\"],
    \"nextBestActions\": [\"prioritized list of next steps to maximize value\"]
  },

  \"kpis\": {
    \"engagementScore\": number (0-100, how actively engaged they are),
    \"collaborationScore\": number (0-100, how well you work together),
    \"communicationScore\": number (0-100, quality of communication),
    \"alignmentScore\": number (0-100, alignment of goals and expectations),
    \"momentumScore\": number (0-100, forward momentum in relationship),
    \"valueRealizationScore\": number (0-100, are they getting value from you)
  },

  \"redFlags\": [\"Any concerning signals that require attention\"],
  \"greenFlags\": [\"Positive signals indicating strong relationship\"],

  \"predictiveInsights\": {
    \"likelyNextStep\": \"Prediction of what they'll likely do next\",
    \"retentionProbability\": number (0-100, likelihood of retention),
    \"growthProbability\": number (0-100, likelihood of expanding spend),
    \"timeToDecision\": \"Estimated time for major decisions - days | weeks | months\",
    \"influencers\": [\"key people who influence their decisions based on contacts\"]
  }
}

## CRITICAL REQUIREMENTS:
1. Base analysis ONLY on factual data provided - never invent information
2. If data is limited, indicate \"Limited data\" and provide what you can
3. Use meeting transcripts to understand actual communication patterns and tone
4. Use web search results to contextualize their market position and challenges
5. Consider contact influence levels when analyzing decision-making
6. Look for patterns across meetings, projects, and interactions
7. Be honest about areas of concern - don't sugarcoat problems
8. Provide specific, actionable recommendations based on actual data
9. Respond ONLY with valid JSON, no additional text

Analyze comprehensively and provide strategic, actionable intelligence.`;

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
            content: 'You are an elite business intelligence analyst with expertise in behavioral psychology, sentiment analysis, and strategic relationship management. You provide deep, actionable insights based on comprehensive data analysis. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        temperature: 0.7,
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
      console.error('Parse error:', e);
      throw new Error('Failed to parse AI insights. The AI response may not be valid JSON.');
    }

    console.log('Insights generated successfully');

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        ai_insights: insights,
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
        insights,
        dataGathered: {
          client: true,
          contacts: contacts?.length || 0,
          meetings: meetings?.length || 0,
          projects: projects?.length || 0,
          pitches: pitches?.length || 0,
          documents: documentsList.length,
          marketIntelligence: !!marketIntelligence,
        },
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