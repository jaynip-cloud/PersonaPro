import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GenerateOpportunitiesRequest {
  clientId: string;
  models?: ('openai' | 'gemini' | 'perplexity')[]; // Optional: specify which models to use
}

// Helper function to calculate text similarity using embeddings
async function calculateSimilarity(
  text1: string,
  text2: string,
  apiKey: string
): Promise<number> {
  try {
    // Generate embeddings for both texts
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: [text1, text2],
      }),
    });

    if (!embeddingResponse.ok) {
      return 0; // Return 0 similarity if embedding fails
    }

    const embeddingData = await embeddingResponse.json();
    const embedding1 = embeddingData.data[0].embedding;
    const embedding2 = embeddingData.data[1].embedding;

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return similarity;
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

// Smart deduplication: Check against all existing opportunities using semantic similarity
async function checkForDuplicates(
  newOpportunity: { title: string; description: string },
  existingOpportunities: any[],
  openaiKey: string,
  similarityThreshold: number = 0.85 // 85% similarity = duplicate
): Promise<{ isDuplicate: boolean; similarOpportunity?: any; similarity?: number }> {
  if (!existingOpportunities || existingOpportunities.length === 0) {
    return { isDuplicate: false };
  }

  const newText = `${newOpportunity.title} ${newOpportunity.description}`.toLowerCase();

  for (const existing of existingOpportunities) {
    const existingText = `${existing.title} ${existing.description || ''}`.toLowerCase();
    
    // Quick text-based check first (exact match)
    if (newText === existingText) {
      return { isDuplicate: true, similarOpportunity: existing, similarity: 1.0 };
    }

    // Semantic similarity check using embeddings
    const similarity = await calculateSimilarity(newText, existingText, openaiKey);
    
    if (similarity >= similarityThreshold) {
      return { isDuplicate: true, similarOpportunity: existing, similarity };
    }
  }

  return { isDuplicate: false };
}

// Calculate quality score for an opportunity
function calculateQualityScore(
  opportunity: any,
  client: any,
  marketIntelligence: string,
  companyProfile: any
): number {
  let score = 0;
  const maxScore = 100;

  // 1. Data Quality (30 points)
  let dataQualityScore = 0;
  if (client.ai_insights) dataQualityScore += 10;
  if (marketIntelligence && marketIntelligence.length > 100) dataQualityScore += 10;
  if (companyProfile?.services && companyProfile.services.length > 0) dataQualityScore += 10;
  score += dataQualityScore;

  // 2. Specificity (25 points)
  let specificityScore = 0;
  const titleLength = opportunity.title?.length || 0;
  const descLength = opportunity.description?.length || 0;
  if (titleLength > 20 && titleLength < 80) specificityScore += 10;
  if (descLength > 100 && descLength < 500) specificityScore += 15;
  score += specificityScore;

  // 3. Personalization (25 points)
  let personalizationScore = 0;
  const desc = (opportunity.description || '').toLowerCase();
  if (client.name && desc.includes(client.name.toLowerCase())) personalizationScore += 5;
  if (client.industry && desc.includes(client.industry.toLowerCase())) personalizationScore += 5;
  if (client.pain_points && client.pain_points.length > 0) {
    const painPointMentioned = client.pain_points.some((pp: string) => 
      desc.includes(pp.toLowerCase().substring(0, 20))
    );
    if (painPointMentioned) personalizationScore += 10;
  }
  if (companyProfile?.company_name && desc.includes(companyProfile.company_name.toLowerCase())) {
    personalizationScore += 5;
  }
  score += personalizationScore;

  // 4. Capability Match (20 points)
  let capabilityScore = 0;
  if (companyProfile?.services && companyProfile.services.length > 0) {
    const serviceMentioned = companyProfile.services.some((s: any) => {
      const serviceName = (s.name || s.title || '').toLowerCase();
      return desc.includes(serviceName.substring(0, 15));
    });
    if (serviceMentioned) capabilityScore += 20;
  }
  score += capabilityScore;

  return Math.min(score, maxScore);
}

// Calculate data quality level
function calculateDataQuality(
  client: any,
  marketIntelligence: string,
  companyProfile: any
): 'high' | 'medium' | 'low' {
  let score = 0;
  
  if (client.ai_insights) score += 3;
  if (marketIntelligence && marketIntelligence.length > 200) score += 2;
  if (companyProfile?.services && companyProfile.services.length > 0) score += 2;
  if (client.pain_points && client.pain_points.length > 0) score += 1;
  if (client.technologies && client.technologies.length > 0) score += 1;
  if (companyProfile?.case_studies && companyProfile.case_studies.length > 0) score += 1;
  
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
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

    const { clientId, models }: GenerateOpportunitiesRequest = await req.json();

    if (!clientId) {
      throw new Error('clientId is required');
    }

    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('openai_api_key, perplexity_api_key, gemini_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const openaiKey = apiKeys?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    const perplexityKey = apiKeys?.perplexity_api_key || Deno.env.get('PERPLEXITY_API_KEY');
    const geminiKey = apiKeys?.gemini_api_key || Deno.env.get('GEMINI_API_KEY');

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

    // Fetch existing opportunities to avoid generating similar ones (get all, not just recent)
    const { data: existingOpportunities } = await supabase
      .from('opportunities')
      .select('id, title, description, created_at')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

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

        // Check if client has blogs
        const hasBlogs = client.blogs && Array.isArray(client.blogs) && client.blogs.length > 0;
        if (hasBlogs) {
          searchComponents.push('Analyze their content themes and thought leadership focus areas');
        }

        // Check if client has technologies
        const hasTechnologies = client.technologies && Array.isArray(client.technologies) && client.technologies.length > 0;
        if (hasTechnologies) {
          searchComponents.push('Identify integration and technology modernization opportunities based on their current tech stack');
        }

        // Check if client has competitors
        const hasCompetitors = client.competitors && Array.isArray(client.competitors) && client.competitors.length > 0;
        if (hasCompetitors) {
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

    const opportunityPrompt = `You are an elite business development strategist with deep expertise in opportunity identification, strategic selling, and capability matching. Your role is to analyze comprehensive client intelligence, market data, and company capabilities to generate highly accurate, personalized growth opportunities.

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
   Description: ${opp.description?.substring(0, 200) || ''}${opp.description && opp.description.length > 200 ? '...' : ''}
`).join('\n')}

CRITICAL: Your new opportunity MUST be substantially different from ALL of the above. Do NOT suggest similar solutions, similar areas, or similar approaches. Think creatively and identify a NEW angle, NEW need, or NEW opportunity that hasn't been covered yet.
` : 'No existing opportunities found - you can generate any relevant opportunity.'}

## YOUR TASK

Analyze the 3 intelligence layers above with EXTREME ATTENTION TO DETAIL and generate EXACTLY 1 (ONE) HIGH-QUALITY, PERSONALIZED, INSIGHT-DRIVEN growth opportunity that:

1. **Addresses a SPECIFIC client need or gap** identified in their profile (Layer 1: Client Intelligence)
   - Cross-reference their pain points with their technology stack
   - Match their goals with their current services/products
   - Connect meeting transcripts with their stated challenges
   - Use their blog content to understand their focus areas

2. **Aligns with relevant market trends or challenges** (Layer 2: Market & External Intelligence)
   - Reference specific market intelligence data provided
   - Connect industry trends to their business context
   - Consider competitive pressures mentioned in market research
   - Factor in timing based on recent company news/announcements

3. **Matches directly with your company's documented services, capabilities, or case studies** (Layer 3: Company Knowledge Base)
   - Reference SPECIFIC service names from your offerings
   - Cite SPECIFIC case studies that demonstrate similar success
   - Highlight proven ROI areas that apply to their situation
   - Connect your unique value propositions to their challenges

4. **Is TIMELY and STRATEGICALLY RELEVANT** based on:
   - Client's readiness to engage (from AI insights)
   - Relationship health and trust level
   - Decision-making patterns and speed
   - Budget capacity and spending patterns
   - Innovation appetite and risk tolerance

5. **Feels HIGHLY PERSONALIZED** - MUST reference:
   - Specific client data points (company name, industry, size)
   - Actual pain points from their profile
   - Real goals mentioned in their profile
   - Specific technologies they use
   - Actual meeting topics or action items

6. **Is realistic and actionable** given:
   - Relationship health and trust level
   - Client's decision-making patterns
   - Budget constraints mentioned
   - Maturity level and sophistication

## CRITICAL REQUIREMENTS FOR ACCURACY

### 1. Data-Driven Analysis (MANDATORY)
You MUST use the actual data provided:
- If client uses specific technologies, reference them by name
- If they have specific pain points, quote or reference them
- If meetings mentioned specific topics, incorporate them
- If market intelligence provided recent news, reference it
- If case studies exist, reference specific ones by name/client

### 2. Logical Connection (MANDATORY)
The opportunity MUST show clear logical flow:
- Client Need → Market Context → Your Capability → Opportunity
- Example: "Client's pain point X (from profile) + Market trend Y (from intelligence) + Our service Z (from knowledge base) = Opportunity"

### 3. Specificity Over Generality (MANDATORY)
- ❌ BAD: "Digital transformation services"
- ✅ GOOD: "Migrate their legacy PHP system (mentioned in tech stack) to modern Node.js architecture using our proven migration framework (Case Study: TechCorp - 50% performance improvement)"

### 4. Evidence-Based Reasoning (MANDATORY)
Every claim must be traceable to the data:
- "Based on their Q3 meeting notes mentioning..."
- "Given their pain point of 'X' stated in profile..."
- "Leveraging our Y service (documented in knowledge base)..."
- "Following market intelligence showing Z trend..."

### 5. Timing and Readiness (MANDATORY)
Consider ALL behavioral signals:
- If relationship health is high → suggest larger engagement
- If innovation appetite is low → suggest proven solutions
- If decision-making is slow → suggest phased approach
- If budget is constrained → emphasize ROI

## OUTPUT FORMAT

CRITICAL: You MUST return EXACTLY 1 opportunity. Return ONLY valid JSON in this exact structure:

{
  "opportunity": {
    "title": "Compelling, personalized opportunity title (60 chars max)",
    "description": "3-5 sentence personalized description that: (1) identifies the SPECIFIC client need/gap with data references, (2) explains how your SPECIFIC service/capability addresses it with service/case study names, (3) references relevant market context when applicable, (4) explains why this is timely and relevant for this SPECIFIC client using behavioral/sentiment data. Make it feel highly insight-driven and personalized, not generic.",
    "reasoning": {
      "clientNeed": "Specific need identified from Layer 1 data (quote or reference actual data)",
      "marketContext": "Relevant market trend or context from Layer 2 (reference specific intelligence)",
      "capabilityMatch": "How your specific service/capability matches (name the service/case study)",
      "timing": "Why this is timely (reference readiness, relationship health, sentiment data)",
      "valueProposition": "Specific value this opportunity provides (quantify if possible)"
    },
    "estimatedValue": "Estimated value range (e.g., '$50K - $100K' or 'High/Medium/Low')",
    "successProbability": 75,
    "urgency": "high|medium|low",
    "confidence": 85,
    "recommendedApproach": "Specific approach recommendation based on client's decision-making style",
    "successFactors": ["Factor 1", "Factor 2", "Factor 3"]
  }
}

DO NOT return an array. DO NOT return multiple opportunities. Return ONLY the single opportunity object as shown above.

## EXAMPLE OUTPUT

{
  "opportunity": {
    "title": "Salesforce-React Integration for Lead Automation",
    "description": "Based on TechCorp's Q3 meeting notes mentioning 'manual data entry taking 10 hours/week' and their current tech stack (React, Node.js, Salesforce), our proven integration framework (Case Study: FinTech Inc - 35% efficiency gain, $200K annual savings) directly addresses their automation pain point. Given their high innovation appetite (85/100) and strong relationship health (90/100), this is an ideal time to propose a phased integration that aligns with their goal to 'scale operations 3x by next year' mentioned in their profile.",
    "reasoning": {
      "clientNeed": "Manual data entry pain point (10 hours/week) from Q3 meeting + goal to scale 3x",
      "marketContext": "Industry trend toward automation in SaaS sector (from market intelligence)",
      "capabilityMatch": "Our Salesforce Integration Service (Case Study: FinTech Inc)",
      "timing": "High innovation appetite (85/100) + Strong relationship (90/100) + Active scaling phase",
      "valueProposition": "35% efficiency gain, $200K annual savings, 10 hours/week time savings"
    },
    "estimatedValue": "$75K - $125K",
    "successProbability": 80,
    "urgency": "high",
    "confidence": 88,
    "recommendedApproach": "Phased implementation starting with MVP, given their methodical decision-making style",
    "successFactors": ["Strong relationship health", "Clear pain point", "Proven case study match", "High innovation appetite"]
  }
}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. You MUST generate EXACTLY 1 (ONE) opportunity - NOT 2, NOT 3, NOT multiple, NOT an array
2. Do NOT return an array of opportunities - this will cause an error
3. Do NOT use the format {"opportunities": [...]} - this is WRONG
4. Return ONLY the format shown above with all reasoning fields
5. If you generate multiple opportunities, your response will be REJECTED
6. Think carefully and choose THE SINGLE BEST opportunity based on ALL available data
7. Reference SPECIFIC data points from the intelligence layers
8. Use actual names, numbers, and quotes from the provided data

Analyze deeply across all 3 intelligence layers and provide THE SINGLE BEST, MOST STRATEGIC, HIGH-VALUE, PERSONALIZED opportunity that will drive real business growth. 

CRITICAL REMINDER: If there are existing opportunities listed above, your new opportunity MUST be COMPLETELY DIFFERENT and UNIQUE from all of them. Think creatively and find a NEW angle, NEW need, or NEW opportunity that hasn't been suggested yet.

Remember: ONE opportunity only, in the exact format shown above, with ALL reasoning fields populated.`;

    // Determine which models to use
    const modelsToUse = models || ['openai', 'gemini']; // Default to OpenAI and Gemini

    const opportunities: any[] = [];
    const modelResults: any = {};

    // Generate opportunities from multiple AI models in parallel
    const generationPromises: Promise<any>[] = [];

    // OpenAI Generation
    if (modelsToUse.includes('openai') && openaiKey) {
      generationPromises.push(
        (async () => {
          try {
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
                    content: 'You are an elite business development strategist specializing in opportunity identification and strategic selling. You analyze 3 intelligence layers (Client Intelligence, Market Intelligence, Company Knowledge Base) to generate EXACTLY 1 personalized, insight-driven growth opportunity. You MUST return only 1 opportunity, never multiple. You match specific client needs with company capabilities, reference case studies when relevant, and ensure opportunities are timely and strategically relevant. CRITICAL: When existing opportunities are provided, you MUST generate a COMPLETELY DIFFERENT and UNIQUE opportunity that addresses different needs, uses different approaches, and explores new angles. Always respond with valid JSON only in the format specified in the user prompt. Never return an array of opportunities.',
                  },
                  {
                    role: 'user',
                    content: opportunityPrompt,
                  },
                ],
                temperature: 0.8,
                max_tokens: 2000,
                response_format: { type: "json_object" }
              }),
            });

            if (openaiResponse.ok) {
              const openaiData = await openaiResponse.json();
              let responseText = openaiData.choices[0].message.content;
              
              let result;
              try {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  responseText = jsonMatch[0];
                }
                result = JSON.parse(responseText);
                
                if (result.opportunity) {
                  return { model: 'openai', opportunity: result.opportunity, raw: result };
                }
              } catch (e) {
                console.error('OpenAI parse error:', e);
              }
            }
            return { model: 'openai', error: 'Failed to generate' };
          } catch (error: any) {
            console.error('OpenAI generation error:', error);
            return { model: 'openai', error: error.message };
          }
        })()
      );
    }

    // Gemini Generation
    if (modelsToUse.includes('gemini') && geminiKey) {
      generationPromises.push(
        (async () => {
          try {
            const modelName = 'gemini-1.5-flash';
            const apiVersion = 'v1beta';
            const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent`;
            
            const response = await fetch(
              `${apiUrl}?key=${geminiKey}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: `You are an elite business development strategist. ${opportunityPrompt}\n\nCRITICAL: Return ONLY valid JSON in this exact format: {"opportunity": {"title": "...", "description": "...", "reasoning": {...}, "estimatedValue": "...", "successProbability": 75, "urgency": "high|medium|low", "confidence": 85, "recommendedApproach": "...", "successFactors": [...]}}`
                    }]
                  }],
                  generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 2000,
                    responseMimeType: "application/json",
                  },
                }),
              }
            );

            if (response.ok) {
              const geminiData = await response.json();
              const candidate = geminiData.candidates?.[0];
              const content = candidate?.content?.parts?.[0]?.text || '';
              
              if (content) {
                try {
                  const result = JSON.parse(content);
                  if (result.opportunity) {
                    return { model: 'gemini', opportunity: result.opportunity, raw: result };
                  }
                } catch (e) {
                  console.error('Gemini parse error:', e);
                }
              }
            }
            return { model: 'gemini', error: 'Failed to generate' };
          } catch (error: any) {
            console.error('Gemini generation error:', error);
            return { model: 'gemini', error: error.message };
          }
        })()
      );
    }

    // Wait for all generations to complete
    const results = await Promise.allSettled(generationPromises);

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.opportunity) {
        modelResults[result.value.model] = result.value.opportunity;
        
        // Check for duplicates using smart deduplication
        const duplicateCheck = await checkForDuplicates(
          result.value.opportunity,
          existingOpportunities || [],
          openaiKey
        );
        
        if (!duplicateCheck.isDuplicate) {
          // Calculate quality score
          const qualityScore = calculateQualityScore(
            result.value.opportunity,
            client,
            marketIntelligence,
            companyProfile
          );
          
          // Add quality score and model info to opportunity
          result.value.opportunity.qualityScore = qualityScore;
          result.value.opportunity.generatedBy = result.value.model;
          
          opportunities.push(result.value.opportunity);
        } else {
          console.log(`Duplicate opportunity detected from ${result.value.model}, similarity: ${duplicateCheck.similarity}`);
        }
      }
    }

    // If no opportunities generated, throw error
    if (opportunities.length === 0) {
      throw new Error('Failed to generate opportunities from any AI model, or all were duplicates');
    }

    // Sort by quality score (highest first)
    opportunities.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));

    // Insert all generated opportunities
    const insertedOpportunities = [];

    for (const opp of opportunities) {
      // Check for duplicates again before inserting (against all existing, not just recent)
      const allExistingCheck = await checkForDuplicates(
        opp,
        existingOpportunities || [],
        openaiKey,
        0.80 // Slightly lower threshold for final check
      );
      
      if (allExistingCheck.isDuplicate) {
        console.log(`Skipping duplicate opportunity: ${opp.title}`);
        continue;
      }
      
      const opportunityToInsert = {
        client_id: clientId,
        user_id: user.id,
        title: opp.title.trim(),
        description: opp.description.trim(),
        is_ai_generated: true,
        ai_analysis: {
          reasoning: opp.reasoning || {},
          estimatedValue: opp.estimatedValue,
          urgency: opp.urgency,
          confidence: opp.confidence || opp.qualityScore,
          recommendedApproach: opp.recommendedApproach,
          successFactors: opp.successFactors || [],
          qualityScore: opp.qualityScore,
          generatedBy: opp.generatedBy,
          successProbability: opp.successProbability
        },
        value: opp.estimatedValue ? parseFloat(opp.estimatedValue.replace(/[^0-9.]/g, '')) : null,
        created_at: new Date().toISOString()
      };

      const { data: insertedOpportunity, error: insertError } = await supabase
        .from('opportunities')
        .insert(opportunityToInsert)
        .select()
        .single();

      if (!insertError && insertedOpportunity) {
        insertedOpportunities.push(insertedOpportunity);
      }
    }

    if (insertedOpportunities.length === 0) {
      throw new Error('All generated opportunities were duplicates or failed to save');
    }

    return new Response(
      JSON.stringify({
        success: true,
        opportunities: insertedOpportunities,
        modelResults: modelResults, // Show which models generated what
        qualityScores: insertedOpportunities.map(opp => ({
          id: opp.id,
          title: opp.title,
          qualityScore: opp.ai_analysis?.qualityScore,
          generatedBy: opp.ai_analysis?.generatedBy
        })),
        analysisMetadata: {
          dataQuality: calculateDataQuality(client, marketIntelligence, companyProfile),
          totalModelsUsed: Object.keys(modelResults).length,
          duplicatesFiltered: opportunities.length - insertedOpportunities.length
        },
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
