import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GenerateOpportunitiesRequest {
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

    const { clientId }: GenerateOpportunitiesRequest = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('openai_api_key, perplexity_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const openaiKey = apiKeys?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    const perplexityKey = apiKeys?.perplexity_api_key || Deno.env.get('PERPLEXITY_API_KEY');

    if (!openaiKey) {
      throw new Error('OpenAI API key is not configured. Please add your API key in Settings.');
    }

    console.log(`Generating growth opportunities for client: ${clientId}`);

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (!client) {
      throw new Error('Client not found');
    }

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

    const { data: meetings } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('meeting_date', { ascending: false })
      .limit(5);

    console.log('Gathering market intelligence...');

    let marketIntelligence = '';
    if (client.name && perplexityKey) {
      try {
        const searchQuery = `Research current trends, challenges, and opportunities in the ${client.industry || 'business'} industry for ${client.name}. Focus on:
1. Emerging technology trends affecting this industry
2. Digital transformation opportunities
3. Common pain points companies face
4. Growth opportunities and market gaps
5. Competitive landscape evolution`;

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
                content: 'You are a market research analyst specializing in identifying growth opportunities and industry trends.'
              },
              {
                role: 'user',
                content: searchQuery
              }
            ],
            temperature: 0.2,
            max_tokens: 1500
          })
        });

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          marketIntelligence = perplexityData.choices[0]?.message?.content || '';
        }
      } catch (e) {
        console.log('Market intelligence search failed:', e);
      }
    }

    console.log('Analyzing with 3-layer intelligence framework...');

    const intelligenceContext = `
# INTELLIGENCE LAYER 1: CLIENT INTELLIGENCE

## Company Profile
Name: ${client.name}
Industry: ${client.industry || 'Not specified'}
Company Size: ${client.company_size || 'Not specified'}
Location: ${client.city ? `${client.city}, ${client.country || ''}` : client.country || 'Not specified'}
Website: ${client.website || 'Not specified'}

## Strategic Context
Short-term Goals: ${client.short_term_goals || 'Not specified'}
Long-term Goals: ${client.long_term_goals || 'Not specified'}
Expectations: ${client.expectations || 'Not specified'}
Pain Points: ${client.pain_points || 'Not specified'}
Budget Range: ${client.budget_range || 'Not specified'}

## Behavioral & Sentiment Data
${client.ai_insights ? `
Maturity Level: ${client.ai_insights.clientProfile?.maturityLevel || 'Unknown'}
Sophistication Score: ${client.ai_insights.clientProfile?.sophisticationScore || 'N/A'}/100
Strategic Value: ${client.ai_insights.clientProfile?.strategicValue || 'N/A'}/100
Readiness to Engage: ${client.ai_insights.clientProfile?.readinessToEngage || 'Unknown'}

Communication Style: ${client.ai_insights.behavioralAnalysis?.communicationStyle || 'Unknown'}
Decision Making: ${client.ai_insights.behavioralAnalysis?.decisionMakingPattern || 'Unknown'}
Engagement Level: ${client.ai_insights.behavioralAnalysis?.engagementLevel || 'Unknown'}

Overall Sentiment: ${client.ai_insights.sentimentAnalysis?.overallSentiment || 'Unknown'}
Sentiment Score: ${client.ai_insights.sentimentAnalysis?.sentimentScore || 'N/A'}/100
Trust Level: ${client.ai_insights.sentimentAnalysis?.trustLevel || 'Unknown'}
Enthusiasm: ${client.ai_insights.sentimentAnalysis?.enthusiasmLevel || 'N/A'}/100

Priorities: ${client.ai_insights.psychographicProfile?.priorities?.join(', ') || 'Not specified'}
Pain Points: ${client.ai_insights.psychographicProfile?.painPoints?.join(', ') || 'Not specified'}
Motivations: ${client.ai_insights.psychographicProfile?.motivations?.join(', ') || 'Not specified'}
Risk Tolerance: ${client.ai_insights.psychographicProfile?.riskTolerance || 'Unknown'}
Innovation Appetite: ${client.ai_insights.psychographicProfile?.innovationAppetite || 'Unknown'}
Value Orientation: ${client.ai_insights.psychographicProfile?.valueOrientation || 'Unknown'}

Relationship Health: ${client.ai_insights.relationshipHealth?.healthScore || 'N/A'}/100
Churn Risk: ${client.ai_insights.relationshipHealth?.churnRisk || 'Unknown'}
Expansion Potential: ${client.ai_insights.relationshipHealth?.expansionPotential || 'Unknown'}
` : 'No AI insights available - limited behavioral data'}

## Key Contacts (${contacts?.length || 0})
${contacts?.map(c => `- ${c.name} (${c.title || 'No title'}) - ${c.is_decision_maker ? 'Decision Maker' : 'Contributor'} - Influence: ${c.influence_level || 'Unknown'}`).join('\n') || 'No contacts recorded'}

## Project History (${projects?.length || 0})
${projects?.slice(0, 5).map(p => `- ${p.name} (${p.status}) - Budget: ${p.budget_range || 'N/A'}`).join('\n') || 'No project history'}

## Recent Interactions
${meetings?.map(m => `- ${m.title} (${m.meeting_date})`).join('\n') || 'No recent meetings'}

# INTELLIGENCE LAYER 2: MARKET & EXTERNAL INTELLIGENCE

## Industry Context
${marketIntelligence || 'Limited external market data available'}

${client.ai_insights?.marketContext ? `
Industry Position: ${client.ai_insights.marketContext.industryPosition}
Competitive Pressure: ${client.ai_insights.marketContext.competitivePressure}
Growth Trajectory: ${client.ai_insights.marketContext.growthTrajectory}

Market Challenges:
${client.ai_insights.marketContext.marketChallenges?.map(c => `- ${c}`).join('\n')}

Market Opportunities:
${client.ai_insights.marketContext.marketOpportunities?.map(o => `- ${o}`).join('\n')}

Industry Trends:
${client.ai_insights.marketContext.industryTrends?.map(t => `- ${t}`).join('\n')}
` : ''}

# INTELLIGENCE LAYER 3: COMPANY KNOWLEDGE BASE (Internal Capabilities)

## Your Company Profile
${companyProfile?.company_name ? `Company: ${companyProfile.company_name}` : 'Company profile not set up'}
${companyProfile?.industry ? `Industry Focus: ${companyProfile.industry}` : ''}
${companyProfile?.about ? `About: ${companyProfile.about}` : ''}

## Your Services & Offerings
${companyProfile?.services && Array.isArray(companyProfile.services) && companyProfile.services.length > 0 ?
  companyProfile.services.map((s: any) => `
Service: ${s.name || s.title}
Description: ${s.description}
${s.features ? `Key Features: ${Array.isArray(s.features) ? s.features.join(', ') : s.features}` : ''}
${s.pricing ? `Pricing: ${s.pricing}` : ''}
${s.targetMarket ? `Target Market: ${s.targetMarket}` : ''}
${s.benefits ? `Benefits: ${s.benefits}` : ''}
`).join('\n---\n') : 'No services documented in knowledge base'}

## Your Expertise Areas
${companyProfile?.ai_insights?.strengths ?
  `Core Strengths: ${companyProfile.ai_insights.strengths.join(', ')}` : ''}
${companyProfile?.ai_insights?.unique_value_propositions ?
  `Unique Value Propositions: ${companyProfile.ai_insights.unique_value_propositions.join(', ')}` : ''}
${companyProfile?.ai_insights?.proven_roi_areas ?
  `Proven ROI Areas: ${companyProfile.ai_insights.proven_roi_areas.join(', ')}` : ''}
${companyProfile?.ai_insights?.innovation_capabilities ?
  `Innovation Capabilities: ${companyProfile.ai_insights.innovation_capabilities.join(', ')}` : ''}
`;

    const opportunityPrompt = `You are an elite business development strategist with deep expertise in opportunity identification, strategic selling, and capability matching.

${intelligenceContext}

## YOUR TASK

Analyze the 3 intelligence layers above and generate 3-5 HIGH-QUALITY, ACTIONABLE growth opportunities that:

1. Address SPECIFIC client needs or gaps identified in their profile
2. Match directly with your company's documented services and capabilities
3. Are TIMELY and RELEVANT based on client's readiness, behavior, and market context
4. Have clear business value and ROI potential
5. Are realistic given the relationship health and trust level

## CRITICAL REQUIREMENTS

1. **Match Client Need to Company Capability**: Each opportunity MUST connect:
   - A specific client pain point or goal (Layer 1)
   - A relevant market trend or challenge (Layer 2)
   - A specific service/capability you offer (Layer 3)

2. **Consider Readiness & Timing**:
   - Account for client's decision-making speed, risk tolerance, innovation appetite
   - Consider relationship health and trust level
   - Factor in budget capacity and spending patterns

3. **Be Specific, Not Generic**:
   - Don't suggest \"Cloud Migration\" generically
   - DO suggest \"Migrate legacy inventory system to cloud platform (ServiceX) to address scalability issues identified in Q3 meeting\"

4. **Quality Over Quantity**: Generate 3-5 strong opportunities, not 10 weak ones

5. **Avoid Irrelevant Suggestions**:
   - If client is risk-averse, don't suggest bleeding-edge tech
   - If they're cost-focused, emphasize ROI and efficiency
   - If relationship is new, suggest smaller engagement first

## OUTPUT FORMAT

Return ONLY valid JSON in this exact structure:

{
  \"opportunities\": [
    {
      \"title\": \"Concise, compelling opportunity title (50 chars max)\",
      \"description\": \"2-3 sentence description of the opportunity, what it addresses, and expected value\",
      \"reasoning\": {
        \"clientNeed\": \"Specific need/gap from client intelligence\",
        \"marketContext\": \"Relevant market trend or challenge\",
        \"capabilityMatch\": \"Your specific service/offering that addresses this\",
        \"timing\": \"Why now is the right time\",
        \"valueProposition\": \"Expected business value and ROI\"
      },
      \"estimatedValue\": \"Low | Medium | High | Very High\",
      \"urgency\": \"Low | Medium | High\",
      \"confidence\": \"Low | Medium | High\",
      \"recommendedApproach\": \"Brief suggestion on how to introduce this opportunity\",
      \"expectedBudgetRange\": \"Estimated budget range if available\",
      \"successFactors\": [\"key factor 1\", \"key factor 2\"]
    }
  ],
  \"analysisMetadata\": {
    \"dataQuality\": \"High | Medium | Low - based on data completeness\",
    \"confidenceLevel\": \"Overall confidence in recommendations\",
    \"keyInsights\": [\"2-3 key insights that informed these opportunities\"],
    \"riskFactors\": [\"Any risks or concerns to be aware of\"]
  }
}

Analyze deeply and provide STRATEGIC, HIGH-VALUE opportunities that will drive real business growth.`;

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
            content: 'You are an elite business development strategist specializing in opportunity identification and strategic selling. You match client needs with service capabilities and identify high-value growth opportunities. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: opportunityPrompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 3000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    let responseText = openaiData.choices[0].message.content;

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse AI response:', responseText);
      console.error('Parse error:', e);
      throw new Error('Failed to parse AI opportunities response');
    }

    console.log(`Generated ${result.opportunities?.length || 0} opportunities`);

    const opportunitiesToInsert = result.opportunities.map((opp: any) => ({
      client_id: clientId,
      user_id: user.id,
      title: opp.title,
      description: opp.description,
      is_ai_generated: true,
      ai_analysis: {
        reasoning: opp.reasoning,
        estimatedValue: opp.estimatedValue,
        urgency: opp.urgency,
        confidence: opp.confidence,
        recommendedApproach: opp.recommendedApproach,
        expectedBudgetRange: opp.expectedBudgetRange,
        successFactors: opp.successFactors,
        metadata: result.analysisMetadata
      },
      created_at: new Date().toISOString()
    }));

    const { data: insertedOpportunities, error: insertError } = await supabase
      .from('opportunities')
      .insert(opportunitiesToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting opportunities:', insertError);
      throw new Error('Failed to save opportunities to database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        opportunities: insertedOpportunities,
        analysisMetadata: result.analysisMetadata,
        intelligenceLayers: {
          clientIntelligence: !!client.ai_insights,
          marketIntelligence: !!marketIntelligence,
          companyKnowledge: !!(companyProfile?.services && Array.isArray(companyProfile.services) && companyProfile.services.length > 0)
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error generating growth opportunities:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate opportunities'
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
