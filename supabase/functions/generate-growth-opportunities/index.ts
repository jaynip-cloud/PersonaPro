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

    // Fetch case studies from both company_profiles and case_studies table
    const { data: caseStudiesFromTable } = await supabase
      .from('case_studies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

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

    // Fetch existing opportunities to avoid generating similar ones
    const { data: existingOpportunities } = await supabase
      .from('opportunities')
      .select('id, title, description, created_at')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20); // Get recent opportunities to avoid duplicates

    let marketIntelligence = '';
    let marketIntelligenceError: string | null = null;
    
     if (!client.name) {
       marketIntelligenceError = 'Client name is required for market intelligence';
     } else if (!perplexityKey) {
       marketIntelligenceError = 'Perplexity API key is required for market intelligence';
    } else {
      try {
        // Build comprehensive search query based on available client data
        const searchComponents = [
          `Research ${client.name} (${client.industry || 'business'} industry)`
        ];

        // Add specific queries based on available data
        if (client.linkedin_url || client.twitter_url || client.website) {
          searchComponents.push('Find recent company news, announcements, and leadership updates');
        }

        if (clientBlogs !== 'Not specified') {
          searchComponents.push('Analyze their content themes and thought leadership focus areas');
        }

        if (clientTechnologies !== 'Not specified') {
          searchComponents.push('Identify integration and technology modernization opportunities based on their current tech stack');
        }

        if (clientCompetitors !== 'Not specified') {
          searchComponents.push('Compare their competitive positioning and identify differentiation opportunities');
        }

        const searchQuery = `${searchComponents.join('. ')}

Focus on:
1. Recent company news, initiatives, and strategic moves
2. Industry trends and challenges affecting ${client.industry || 'their sector'}
3. Technology adoption patterns and digital transformation needs
4. Growth opportunities and expansion signals
5. Leadership changes, funding rounds, or major announcements
6. Social media activity and brand positioning
7. Content marketing themes and customer pain points they're addressing
8. Competitive threats and market positioning
9. Innovation initiatives and R&D focus areas
10. Partnership and collaboration opportunities

Provide specific, actionable insights that could inform a growth opportunity proposal.`;


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
          
           if (!marketIntelligence) {
             marketIntelligenceError = 'Perplexity API returned empty content';
           }
         } else {
           const errorText = await perplexityResponse.text();
           marketIntelligenceError = `Perplexity API error: ${perplexityResponse.status}`;
         }
       } catch (e) {
         marketIntelligenceError = e instanceof Error ? e.message : 'Unknown error';
       }
     }

    // Build comprehensive client intelligence including new fields
    const clientServices = client.services && Array.isArray(client.services) && client.services.length > 0
      ? client.services.map((s: any) => `  • ${s.name || ''}: ${s.description || ''}`).join('\n')
      : 'Not specified';

    const clientTechnologies = client.technologies && Array.isArray(client.technologies) && client.technologies.length > 0
      ? client.technologies.map((t: any) => `  • ${t.name || t} ${t.category ? `(${t.category})` : ''}`).join('\n')
      : 'Not specified';

    const clientBlogs = client.blogs && Array.isArray(client.blogs) && client.blogs.length > 0
      ? client.blogs.slice(0, 8).map((b: any) => `  • "${b.title || ''}" ${b.date ? `(${b.date})` : ''} ${b.url ? `- ${b.url}` : ''}`).join('\n')
      : 'Not specified';

    const clientPainPoints = client.pain_points && Array.isArray(client.pain_points) && client.pain_points.length > 0
      ? client.pain_points.map((p: string) => `  • ${p}`).join('\n')
      : 'Not specified';

    const clientCompetitors = client.competitors && Array.isArray(client.competitors) && client.competitors.length > 0
      ? client.competitors.map((c: any) => `  • ${c.name || c} ${c.comparison || c.description ? `- ${c.comparison || c.description}` : ''}`).join('\n')
      : 'Not specified';

    const intelligenceContext = `
# INTELLIGENCE LAYER 1: CLIENT INTELLIGENCE

## Company Profile
Name: ${client.name}
Industry: ${client.industry || 'Not specified'}
Company Size: ${client.company_size || 'Not specified'}
Location: ${client.city ? `${client.city}, ${client.country || ''}` : client.country || 'Not specified'}
Website: ${client.website || 'Not specified'}
LinkedIn: ${client.linkedin_url || 'Not specified'}
Twitter: ${client.twitter_url || 'Not specified'}
Facebook: ${client.facebook_url || 'Not specified'}

## Services/Products They Currently Use
${clientServices}

## Technology Stack & Tools
${clientTechnologies}

## Recent Content & Thought Leadership
Blog Posts & Articles:
${clientBlogs}

## Strategic Context
Short-term Goals: ${client.short_term_goals || 'Not specified'}
Long-term Goals: ${client.long_term_goals || 'Not specified'}
Expectations: ${client.expectations || 'Not specified'}
Budget Range: ${client.budget_range || 'Not specified'}

## Pain Points & Challenges
${clientPainPoints}

## Competitive Landscape
Competitors They Consider:
${clientCompetitors}

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

## Recent Interactions & Meeting Intelligence
${meetings && meetings.length > 0 ? meetings.map(m => {
  const parts = [`Meeting: ${m.title} (${new Date(m.meeting_date).toLocaleDateString()})`];
  if (m.sentiment) parts.push(`  Sentiment: ${m.sentiment}`);
  if (m.key_topics && Array.isArray(m.key_topics)) parts.push(`  Topics: ${m.key_topics.join(', ')}`);
  if (m.action_items && Array.isArray(m.action_items) && m.action_items.length > 0) {
    parts.push(`  Action Items: ${m.action_items.slice(0, 3).join('; ')}`);
  }
  if (m.transcript_text) {
    const excerpt = m.transcript_text.substring(0, 500);
    parts.push(`  Key Excerpt: ${excerpt}${m.transcript_text.length > 500 ? '...' : ''}`);
  }
  return parts.join('\n');
}).join('\n\n') : 'No recent meetings'}

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

## Your Expertise & Strengths
${companyProfile?.ai_insights?.strengths && Array.isArray(companyProfile.ai_insights.strengths) && companyProfile.ai_insights.strengths.length > 0 ?
  `Core Strengths: ${companyProfile.ai_insights.strengths.join(', ')}` : ''}
${companyProfile?.ai_insights?.unique_value_propositions && Array.isArray(companyProfile.ai_insights.unique_value_propositions) && companyProfile.ai_insights.unique_value_propositions.length > 0 ?
  `Unique Value Propositions: ${companyProfile.ai_insights.unique_value_propositions.join(', ')}` : ''}
${companyProfile?.ai_insights?.proven_roi_areas && Array.isArray(companyProfile.ai_insights.proven_roi_areas) && companyProfile.ai_insights.proven_roi_areas.length > 0 ?
  `Proven ROI Areas: ${companyProfile.ai_insights.proven_roi_areas.join(', ')}` : ''}
${companyProfile?.ai_insights?.innovation_capabilities && Array.isArray(companyProfile.ai_insights.innovation_capabilities) && companyProfile.ai_insights.innovation_capabilities.length > 0 ?
  `Innovation Capabilities: ${companyProfile.ai_insights.innovation_capabilities.join(', ')}` : ''}
${companyProfile?.value_proposition ? `Value Proposition: ${companyProfile.value_proposition}` : ''}

## Case Studies & Success Stories
${(companyProfile?.case_studies && Array.isArray(companyProfile.case_studies) && companyProfile.case_studies.length > 0) || (caseStudiesFromTable && caseStudiesFromTable.length > 0) ?
  [
    ...(companyProfile?.case_studies && Array.isArray(companyProfile.case_studies) ? companyProfile.case_studies : []),
    ...(caseStudiesFromTable || [])
  ].slice(0, 10).map((cs: any) => `
Case Study: ${cs.title || cs.name || 'Untitled'}
${cs.client_name ? `Client: ${cs.client_name}` : ''}
${cs.industry ? `Industry: ${cs.industry}` : ''}
${cs.description ? `Description: ${cs.description}` : ''}
${cs.services && Array.isArray(cs.services) ? `Services Used: ${cs.services.join(', ')}` : ''}
${cs.results && Array.isArray(cs.results) ? `Results: ${cs.results.join('; ')}` : ''}
${cs.metrics ? `Metrics: ${JSON.stringify(cs.metrics)}` : ''}
`).join('\n---\n') : 'No case studies documented'}

## Frameworks & Approach
${companyProfile?.ai_insights?.frameworks && Array.isArray(companyProfile.ai_insights.frameworks) && companyProfile.ai_insights.frameworks.length > 0 ?
  `Frameworks & Methodologies: ${companyProfile.ai_insights.frameworks.join(', ')}` : ''}
${companyProfile?.ai_insights?.approach ? `Approach: ${companyProfile.ai_insights.approach}` : ''}
`;

    const opportunityPrompt = `You are an elite business development strategist with deep expertise in opportunity identification, strategic selling, and capability matching.

${intelligenceContext}

## EXISTING OPPORTUNITIES TO AVOID DUPLICATING

${existingOpportunities && existingOpportunities.length > 0 ? `
The following opportunities have already been identified for this client. You MUST generate a COMPLETELY DIFFERENT opportunity that:
- Addresses a DIFFERENT need, pain point, or goal
- Focuses on a DIFFERENT area or capability
- Uses a DIFFERENT approach or solution
- Is DISTINCT and UNIQUE from all existing opportunities below

Existing Opportunities:
${existingOpportunities.map((opp: any, idx: number) => `
${idx + 1}. "${opp.title}"
   Description: ${opp.description.substring(0, 200)}${opp.description.length > 200 ? '...' : ''}
`).join('\n')}

CRITICAL: Your new opportunity MUST be substantially different from ALL of the above. Do NOT suggest similar solutions, similar areas, or similar approaches. Think creatively and identify a NEW angle, NEW need, or NEW opportunity that hasn't been covered yet.
` : 'No existing opportunities found - you can generate any relevant opportunity.'}

## YOUR TASK

Analyze the 3 intelligence layers above and generate EXACTLY 1 (ONE) HIGH-QUALITY, PERSONALIZED, INSIGHT-DRIVEN growth opportunity that:

1. **Addresses a SPECIFIC client need or gap** identified in their profile (Layer 1: Client Intelligence)
2. **Aligns with relevant market trends or challenges** (Layer 2: Market & External Intelligence)
3. **Matches directly with your company's documented services, capabilities, or case studies** (Layer 3: Company Knowledge Base)
4. **Is TIMELY and STRATEGICALLY RELEVANT** based on client's readiness, behavior, sentiment, and market context
5. **Feels personalized** - reference specific client data points, pain points, or goals
6. **Is realistic** given the relationship health, trust level, and client's decision-making patterns

## CRITICAL REQUIREMENTS

### 1. Match Client Need to Company Capability (CRITICAL)
The opportunity MUST logically connect and COMPARE:
- **Client Need**: A specific pain point, goal, challenge, or technology gap from Layer 1 (Client Intelligence)
  * Analyze their current services/products they use - can we provide better alternatives?
  * Review their technology stack - are there integration or modernization opportunities?
  * Examine their pain points - which ones directly align with our solutions?
  * Study their blog content - what topics are they focused on that we can help with?
  * Consider their competitors - how can we help them differentiate or compete better?
  * Review meeting transcripts - what concerns or needs were expressed?
- **Market Context**: A relevant industry trend, competitive pressure, or market opportunity from Layer 2
  * Recent news or announcements about the client
  * Industry shifts affecting their business
  * Technology trends they should adopt
- **Your Capability**: A specific service, strength, case study, or expertise from Layer 3 (Company Knowledge Base)
  * Reference SPECIFIC services from your knowledge base that match their needs
  * Cite SPECIFIC case studies that demonstrate similar success
  * Highlight proven ROI areas that apply to their situation
  * Connect your unique value propositions to their challenges

### 2. Consider Readiness & Timing
- Account for client's decision-making speed, risk tolerance, innovation appetite
- Consider relationship health, trust level, and enthusiasm
- Factor in budget capacity, spending patterns, and maturity level
- Ensure the opportunity matches their sophistication level

### 3. Be Specific & Insight-Driven (USE THE DATA)
- **DON'T**: Suggest generic opportunities like "Cloud Migration" or "Digital Transformation"
- **DO**: Suggest specific, personalized opportunities that reference actual client data:
  * Example 1: "Integrate Salesforce with their current tech stack (React, Node.js) to automate lead management, addressing their pain point of 'manual data entry taking 10 hours/week' mentioned in the client profile"
  * Example 2: "Based on their recent blog posts about AI adoption challenges, offer our AI Strategy Workshop (Case Study: FinTech Inc - 35% efficiency gain)"
  * Example 3: "Help differentiate from competitor HubSpot by implementing custom automation workflows using our low-code platform (mentioned in their competitive analysis)"
  * Example 4: "Following up on action item from March 15 meeting about 'exploring analytics solutions', propose our Business Intelligence Dashboard service (proven ROI: RetailCorp case study)"

### 4. Reference Your Knowledge Base
- Reference specific services from your offerings
- Mention relevant case studies or success stories that demonstrate similar work
- Highlight your unique strengths or proven ROI areas that apply
- Connect to your frameworks or methodologies if relevant

### 5. Avoid Irrelevant Suggestions
- If client is risk-averse, don't suggest bleeding-edge tech
- If they're cost-focused, emphasize ROI and efficiency
- If relationship is new/weak, suggest smaller engagement first
- If client lacks innovation appetite, focus on proven solutions

### 6. Personalization Requirements
- Reference specific client data: industry, size, goals, pain points
- Mention behavioral insights: decision patterns, communication style, priorities
- Consider sentiment: trust level, enthusiasm, relationship health
- Factor in psychographics: motivations, risk tolerance, value orientation

## OUTPUT FORMAT

CRITICAL: You MUST return EXACTLY 1 opportunity. Return ONLY valid JSON in this exact structure (Title + Description only):

{
  \"opportunity\": {
    \"title\": \"Compelling, personalized opportunity title (60 chars max)\",
    \"description\": \"2-4 sentence personalized description that: (1) identifies the specific client need/gap, (2) explains how your service/capability addresses it, (3) references relevant case studies or strengths when applicable, (4) explains why this is timely and relevant for this specific client. Make it feel insight-driven and personalized, not generic.\"
  }
}

DO NOT return an array. DO NOT return multiple opportunities. Return ONLY the single opportunity object as shown above.

## EXAMPLE OUTPUT

{
  \"opportunity\": {
    \"title\": \"E-commerce Platform Migration for Scalability\",
    \"description\": \"Based on TechCorp's Q3 meeting notes mentioning inventory system bottlenecks during peak seasons and their goal to scale 3x by next year, our proven e-commerce migration framework (successfully deployed for RetailCorp with 40% performance improvement) directly addresses their scalability pain point. Given their high innovation appetite and strong relationship health, this is an ideal time to propose a phased migration that aligns with their growth trajectory.\"
  }
}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. You MUST generate EXACTLY 1 (ONE) opportunity - NOT 2, NOT 3, NOT multiple, NOT an array
2. Do NOT return an array of opportunities - this will cause an error
3. Do NOT use the format {"opportunities": [...]} - this is WRONG
4. Return ONLY the format {"opportunity": {"title": "...", "description": "..."}} - this is CORRECT
5. If you generate multiple opportunities, your response will be REJECTED and you will need to regenerate
6. Think carefully and choose THE SINGLE BEST opportunity - do not list multiple options

VALID OUTPUT FORMAT (copy this structure exactly):
{
  "opportunity": {
    "title": "Your opportunity title here",
    "description": "Your opportunity description here"
  }
}

INVALID OUTPUT FORMATS (DO NOT USE THESE):
- {"opportunities": [...]} ❌ WRONG
- Multiple opportunity objects ❌ WRONG
- An array of opportunities ❌ WRONG

Analyze deeply across all 3 intelligence layers and provide THE SINGLE BEST, MOST STRATEGIC, HIGH-VALUE, PERSONALIZED opportunity that will drive real business growth. 

CRITICAL REMINDER: If there are existing opportunities listed above, your new opportunity MUST be COMPLETELY DIFFERENT and UNIQUE from all of them. Think creatively and find a NEW angle, NEW need, or NEW opportunity that hasn't been suggested yet.

Remember: ONE opportunity only, in the exact format shown above.`;

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
            content: 'You are an elite business development strategist specializing in opportunity identification and strategic selling. You analyze 3 intelligence layers (Client Intelligence, Market Intelligence, Company Knowledge Base) to generate EXACTLY 1 personalized, insight-driven growth opportunity. You MUST return only 1 opportunity, never multiple. You match specific client needs with company capabilities, reference case studies when relevant, and ensure opportunities are timely and strategically relevant. CRITICAL: When existing opportunities are provided, you MUST generate a COMPLETELY DIFFERENT and UNIQUE opportunity that addresses different needs, uses different approaches, and explores new angles. Always respond with valid JSON only in the format: {"opportunity": {"title": "...", "description": "..."}}. Never return an array of opportunities.',
          },
          {
            role: 'user',
            content: opportunityPrompt,
          },
        ],
        temperature: 0.9, // Higher temperature for more variation and creativity between generations
        max_tokens: 1500, // Limit tokens to prevent multiple opportunities
      }),
    });

     if (!openaiResponse.ok) {
       const errorText = await openaiResponse.text();
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
      throw new Error('Failed to parse AI opportunities response');
    }

    // Extract single opportunity - handle both formats
    let singleOpportunity;
    if (result.opportunity) {
      // Correct format: single opportunity
      singleOpportunity = result.opportunity;
    } else if (result.opportunities && Array.isArray(result.opportunities) && result.opportunities.length > 0) {
      // Wrong format: array - take only the first one
      singleOpportunity = result.opportunities[0];
    } else {
      throw new Error('Invalid response format from AI - expected single opportunity');
    }

    if (!singleOpportunity || !singleOpportunity.title || !singleOpportunity.description) {
      throw new Error('Opportunity missing required fields: title or description');
    }

    // Check for duplicate opportunities created in the last 5 minutes for this client
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentOpportunities } = await supabase
      .from('opportunities')
      .select('id, title, description, created_at')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .eq('is_ai_generated', true)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });

    // Check if this exact opportunity was recently created
    if (recentOpportunities && recentOpportunities.length > 0) {
      const isDuplicate = recentOpportunities.some(
        opp => opp.title === singleOpportunity.title && opp.description === singleOpportunity.description
      );
      if (isDuplicate) {
        throw new Error('This opportunity was recently generated. Please wait a moment before generating again.');
      }
    }

    // Create exactly 1 opportunity object (not array)
    const opportunityToInsert = {
      client_id: clientId,
      user_id: user.id,
      title: singleOpportunity.title.trim(),
      description: singleOpportunity.description.trim(),
      is_ai_generated: true,
      ai_analysis: singleOpportunity.reasoning || {
        clientNeed: singleOpportunity.clientNeed,
        marketContext: singleOpportunity.marketContext,
        capabilityMatch: singleOpportunity.capabilityMatch,
        timing: singleOpportunity.timing,
        valueProposition: singleOpportunity.valueProposition
      },
      created_at: new Date().toISOString()
    };

    // Insert single opportunity (not array)
    const { data: insertedOpportunity, error: insertError } = await supabase
      .from('opportunities')
      .insert(opportunityToInsert)
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to save opportunity to database');
    }

    if (!insertedOpportunity) {
      throw new Error('No opportunity was inserted');
    }

    return new Response(
      JSON.stringify({
        success: true,
        opportunities: [insertedOpportunity], // Return as array for compatibility
        analysisMetadata: result.analysisMetadata,
        intelligenceLayers: {
          clientIntelligence: !!client.ai_insights,
          marketIntelligence: !!marketIntelligence,
          marketIntelligenceError: marketIntelligenceError || null,
          companyKnowledge: !!(
            (companyProfile?.services && Array.isArray(companyProfile.services) && companyProfile.services.length > 0) ||
            (companyProfile?.case_studies && Array.isArray(companyProfile.case_studies) && companyProfile.case_studies.length > 0) ||
            (caseStudiesFromTable && caseStudiesFromTable.length > 0) ||
            (companyProfile?.ai_insights?.strengths && Array.isArray(companyProfile.ai_insights.strengths) && companyProfile.ai_insights.strengths.length > 0)
          )
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
