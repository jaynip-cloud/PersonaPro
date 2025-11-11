import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GeneratePitchRequest {
  clientId: string;
  opportunityId?: string;
  projectId?: string;
  services?: string[];
  tone?: 'formal' | 'casual';
  length?: 'short' | 'long';
  customContext?: string;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header is required' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const { clientId, opportunityId, projectId, services, tone = 'formal', length = 'long', customContext }: GeneratePitchRequest = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('openai_api_key, perplexity_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const openaiKey = apiKeys?.openai_api_key || Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OpenAI API key is not configured. Please add your API key in Settings.');
    }

    // Fetch client data
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (!client) {
      throw new Error('Client not found');
    }

    // Fetch opportunity if provided
    let opportunity = null;
    if (opportunityId) {
      const { data: oppData } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .eq('user_id', user.id)
        .single();
      opportunity = oppData;
    }

    // Fetch project if provided
    let project = null;
    if (projectId) {
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();
      project = projData;
    }

    // Fetch company profile
    const { data: companyProfile } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Fetch case studies
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
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: meetings } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('meeting_date', { ascending: false })
      .limit(5);

    // Build intelligence layers
    const clientIntelligence = `
# LAYER 1: CLIENT INTELLIGENCE

## Company Profile
Name: ${client.name || client.company || 'Not specified'}
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
${projects?.slice(0, 5).map(p => `- ${p.name} (${p.status}) - ${p.summary || p.description || 'No description'}`).join('\n') || 'No project history'}

## Recent Interactions
${meetings?.map(m => `- ${m.title} (${m.meeting_date}) - ${m.summary || 'No summary'}`).join('\n') || 'No recent meetings'}
`;

    const opportunityIntelligence = opportunity ? `
# LAYER 2: OPPORTUNITY INTELLIGENCE

## Opportunity Details
Title: ${opportunity.title}
Description: ${opportunity.description}
Created: ${opportunity.created_at}
AI Generated: ${opportunity.is_ai_generated ? 'Yes' : 'No'}

## Opportunity Context
${opportunity.ai_analysis ? `
Client Need: ${opportunity.ai_analysis.clientNeed || 'Not specified'}
Market Context: ${opportunity.ai_analysis.marketContext || 'Not specified'}
Capability Match: ${opportunity.ai_analysis.capabilityMatch || 'Not specified'}
Timing: ${opportunity.ai_analysis.timing || 'Not specified'}
Value Proposition: ${opportunity.ai_analysis.valueProposition || 'Not specified'}
` : 'No detailed analysis available'}
` : project ? `
# LAYER 2: PROJECT INTELLIGENCE

## Project Details
Name: ${project.name}
Description: ${project.description || project.summary || 'No description'}
Status: ${project.status}
Type: ${project.project_type || 'Not specified'}
Budget: ${project.budget || 'Not specified'}
Timeline: ${project.timeline || 'Not specified'}
` : customContext ? `
# LAYER 2: CUSTOM CONTEXT

${customContext}
` : `
# LAYER 2: OPPORTUNITY INTELLIGENCE

No specific opportunity or project provided. Generate a pitch based on client's general needs and goals.
`;

    const companyKnowledgeBase = `
# LAYER 3: COMPANY KNOWLEDGE BASE

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

    const pitchPrompt = `You are an elite sales strategist and pitch writer specializing in creating compelling, personalized business proposals. Your task is to generate a high-impact pitch that combines deep client intelligence, opportunity context, and your company's proven capabilities.

${clientIntelligence}

${opportunityIntelligence}

${companyKnowledgeBase}

## YOUR TASK

Generate a compelling pitch that:

1. **Uses Client Intelligence** - Tailor the pitch to their:
   - Pain points & goals (from their profile and AI insights)
   - Sentiment & relationship status (trust level, enthusiasm, relationship health)
   - Risk tolerance & decision-making style (from behavioral analysis)
   - Motivations & value orientation (from psychographic profile)
   - Industry & market context

2. **References Opportunity Intelligence** - Address:
   - Why this opportunity exists (client need, market gap, timing)
   - Business impact if implemented (expected outcomes, ROI)
   - Strategic relevance & timing (why now?)
   - Expected outcomes (measurable benefits)

3. **Matches Company Knowledge Base** - Demonstrate credibility through:
   - Relevant services that address their needs
   - Unique selling propositions (USPs) that differentiate you
   - Case studies and proof of results (similar clients, similar challenges)
   - ROI expectations based on proven results
   - Differentiators that matter to this specific client

## PITCH OUTPUT FORMAT

Generate the pitch in this EXACT JSON structure:

{
  "title": "Compelling Project Pitch Title (60 chars max)",
  "openingHook": "1-2 lines capturing the client's current situation & opportunity",
  "problemFraming": "Short summary of the pain point/market gap and why it matters now",
  "proposedSolution": "How your company will solve it + approach/method",
  "valueOutcomes": [
    "Bullet point 1: Measurable benefit / ROI",
    "Bullet point 2: Measurable benefit / ROI",
    "Bullet point 3: Measurable benefit / ROI",
    "Bullet point 4: Measurable benefit / ROI (if long format)",
    "Bullet point 5: Measurable benefit / ROI (if long format)"
  ],
  "whyUs": "Tailored credibility statement connecting client needs to your proven strengths",
  "nextStepCTA": "Clear action – book meeting, schedule demo, or share proposal"
}

## CRITICAL REQUIREMENTS

1. **Personalization**: Reference specific client data points, pain points, goals, or insights from Layer 1
2. **Tone**: Use ${tone === 'formal' ? 'professional, formal business language' : 'conversational, friendly but professional language'}
3. **Length**: ${length === 'long' ? 'Include 5 value outcomes and more detailed sections' : 'Keep concise with 3 value outcomes and shorter sections'}
4. **Credibility**: Reference specific case studies, services, or strengths from Layer 3
5. **Relevance**: Connect the opportunity (Layer 2) to client needs (Layer 1) using your capabilities (Layer 3)
6. **Action-Oriented**: Make the CTA specific and compelling based on their decision-making style

## OUTPUT INSTRUCTIONS

- Return ONLY valid JSON in the exact format shown above
- Do NOT include markdown formatting
- Do NOT include explanations or commentary
- Ensure all fields are populated
- Value outcomes array should have ${length === 'long' ? '5' : '3'} items
- Make it feel personalized and insight-driven, not generic

Generate the pitch now:`;

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
            content: 'You are an elite sales strategist and pitch writer. You analyze 3 intelligence layers (Client Intelligence, Opportunity Intelligence, Company Knowledge Base) to generate personalized, compelling business pitches. You always return valid JSON only in the specified format. You never include markdown or explanations.',
          },
          {
            role: 'user',
            content: pitchPrompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    let responseText = openaiData.choices[0].message.content;

    // Extract JSON from response
    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      result = JSON.parse(responseText);
    } catch (e) {
      throw new Error('Failed to parse AI pitch response');
    }

    // Validate required fields
    if (!result.title || !result.openingHook || !result.problemFraming || !result.proposedSolution || !result.valueOutcomes || !result.whyUs || !result.nextStepCTA) {
      throw new Error('Invalid pitch format - missing required fields');
    }

    return new Response(
      JSON.stringify({
        success: true,
        pitch: result,
        metadata: {
          clientId,
          opportunityId: opportunityId || null,
          projectId: projectId || null,
          tone,
          length,
          intelligenceLayers: {
            clientIntelligence: !!(
              client && (
                client.company ||
                client.industry ||
                client.short_term_goals ||
                client.long_term_goals ||
                client.pain_points ||
                client.ai_insights ||
                (contacts && contacts.length > 0) ||
                (projects && projects.length > 0) ||
                (meetings && meetings.length > 0)
              )
            ),
            opportunityIntelligence: !!(opportunity || project || customContext),
            companyKnowledge: !!(
              companyProfile && (
                (companyProfile.services && Array.isArray(companyProfile.services) && companyProfile.services.length > 0) ||
                (companyProfile.case_studies && Array.isArray(companyProfile.case_studies) && companyProfile.case_studies.length > 0) ||
                companyProfile.value_proposition ||
                companyProfile.industries_served ||
                companyProfile.company_description
              ) ||
              (caseStudiesFromTable && caseStudiesFromTable.length > 0)
            )
          }
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate pitch'
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

