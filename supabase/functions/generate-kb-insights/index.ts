import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CompanyProfile {
  company_name: string;
  industry: string;
  about: string;
  value_proposition: string;
  services: any[];
  leadership: any[];
  blogs: any[];
  technology: {
    stack: string[];
    partners: string[];
    integrations: string[];
  };
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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile, error: profileError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Company profile not found');
    }

    const companyData: CompanyProfile = profile;

    let additionalContext = '';

    // Fetch documents from storage if available
    try {
      const { data: documents } = await supabase.storage
        .from('client-documents')
        .list(user.id);

      if (documents && documents.length > 0) {
        additionalContext += '\n\nUploaded Documents Available:\n';
        documents.forEach(doc => {
          additionalContext += `- ${doc.name}\n`;
        });
      }
    } catch (e) {
      console.log('No documents found');
    }

    // Perform web search for company information
    let webSearchContext = '';
    if (companyData.company_name) {
      try {
        const searchQuery = `${companyData.company_name} ${companyData.industry || ''} company information`;
        const searchResponse = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': Deno.env.get('BRAVE_SEARCH_API_KEY') || ''
          }
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.web?.results?.length > 0) {
            webSearchContext = '\n\nExternal Web Search Results:\n';
            searchData.web.results.slice(0, 5).forEach((result: any) => {
              webSearchContext += `\nTitle: ${result.title}\nURL: ${result.url}\nDescription: ${result.description}\n`;
            });
          }
        }
      } catch (e) {
        console.log('Web search not available:', e);
      }
    }

    const prompt = `You are a business intelligence analyst specializing in behavioral analysis, sentiment analysis, and KPI assessment. Analyze the following company data comprehensively using both internal knowledge base data and external information.

Company: ${companyData.company_name || 'Not specified'}
Industry: ${companyData.industry || 'Not specified'}
About: ${companyData.about || 'Not specified'}
Value Proposition: ${companyData.value_proposition || 'Not specified'}

Services: ${JSON.stringify(companyData.services || [])}
Leadership: ${JSON.stringify(companyData.leadership || [])}
Blogs: ${JSON.stringify(companyData.blogs || [])}
Technology Stack: ${JSON.stringify(companyData.technology?.stack || [])}
Partners: ${JSON.stringify(companyData.technology?.partners || [])}
Integrations: ${JSON.stringify(companyData.technology?.integrations || [])}
${additionalContext}
${webSearchContext}

## KPI MEASUREMENT METHODOLOGY

Score each KPI from 0-100 using the following criteria:

**1. Content Score (0-100)**
- 0-20: No blog content or minimal content (0-2 blogs)
- 21-40: Some content but infrequent (3-5 blogs, basic quality)
- 41-60: Regular content with decent quality (6-10 blogs, some depth)
- 61-80: Strong content library (11-20 blogs, good insights, thought leadership)
- 81-100: Exceptional content (20+ blogs, industry-leading insights, regular publishing)

**2. Team Strength (0-100)**
- 0-20: No leadership info or minimal team (0-1 people)
- 21-40: Small team with basic experience (2-3 people, limited backgrounds)
- 41-60: Decent team size (4-6 people) with relevant industry experience
- 61-80: Strong leadership (7-10 people) with deep expertise and proven track records
- 81-100: Exceptional team (10+ people) with industry veterans, awards, notable achievements

**3. Tech Modernity (0-100)**
- 0-20: Outdated or legacy technologies only
- 21-40: Mixed old/new tech, some modern frameworks
- 41-60: Mostly modern stack with some industry-standard tools
- 61-80: Cutting-edge technologies, cloud-native, modern frameworks
- 81-100: Bleeding-edge tech, innovative tools, AI/ML integration, microservices

**4. Market Readiness (0-100)**
- 0-20: Unclear value proposition, poorly defined services
- 21-40: Basic service offering, limited differentiation
- 41-60: Clear services, defined target market, some differentiation
- 61-80: Strong service portfolio, well-positioned, clear competitive advantage
- 81-100: Market leader positioning, comprehensive solutions, strong differentiators

**5. Brand Presence (0-100)**
- 0-20: Minimal online presence, no social media, basic website
- 21-40: Basic presence, some social profiles, limited engagement
- 41-60: Active on key platforms, decent website, some content marketing
- 61-80: Strong multi-channel presence, active engagement, professional branding
- 81-100: Industry influencer status, viral content, major partnerships, press coverage

**6. Growth Potential (0-100)**
- 0-20: Stagnant market, no clear growth path, major limitations
- 21-40: Limited opportunities, constrained by resources or market
- 41-60: Moderate growth opportunities, some expansion paths available
- 61-80: Strong growth potential, multiple expansion opportunities, scalable model
- 81-100: Explosive growth potential, massive market, innovative approach, viral potential

Use both the internal knowledge base data AND external web search results to provide accurate, realistic scores.

Provide comprehensive insights in the following JSON format:
{
  "summary": "Brief 2-3 sentence overview of the company",
  "strengths": ["List of 3-5 key strengths"],
  "opportunities": ["List of 3-5 growth opportunities"],
  "marketPosition": "Analysis of market position and competitive advantage",
  "recommendations": ["List of 3-5 strategic recommendations"],
  "contentStrategy": "Insights based on blog content and thought leadership",
  "techStack": "Analysis of technology choices and capabilities",
  "kpis": {
    "contentScore": number (0-100, based on blog quality and quantity),
    "teamStrength": number (0-100, based on leadership experience and size),
    "techModernity": number (0-100, based on technology stack modernity),
    "marketReadiness": number (0-100, based on services and positioning),
    "brandPresence": number (0-100, based on overall online presence),
    "growthPotential": number (0-100, based on opportunities and capabilities)
  },
  "sentiment": {
    "overall": "positive" | "neutral" | "negative",
    "score": number (0-100, overall sentiment score),
    "brandTone": "professional" | "casual" | "technical" | "innovative" | "traditional",
    "marketPerception": "Analysis of how the company is likely perceived in the market",
    "confidenceLevel": "high" | "medium" | "low"
  },
  "behaviorAnalysis": {
    "contentBehavior": "Analysis of content creation patterns and thought leadership approach",
    "marketApproach": "Analysis of market positioning and targeting strategy",
    "innovationLevel": "conservative" | "moderate" | "aggressive",
    "customerFocus": "Analysis of customer-centric approach based on services and messaging",
    "growthOrientation": "Analysis of growth mindset and expansion readiness"
  },
  "riskFactors": ["List of 2-4 potential risks or challenges"],
  "competitiveEdge": ["List of 2-3 unique differentiators"]
}

Respond ONLY with valid JSON. Ensure all scores are realistic and based on the actual data provided.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence analyst providing actionable insights with behavioral and sentiment analysis. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const insightsText = openaiData.choices[0].message.content;
    
    let insights;
    try {
      insights = JSON.parse(insightsText);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', insightsText);
      throw new Error('Failed to parse AI insights');
    }

    const { error: updateError } = await supabase
      .from('company_profiles')
      .update({
        ai_insights: insights,
        ai_insights_generated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ insights }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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