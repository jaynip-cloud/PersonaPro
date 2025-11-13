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

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's API keys from database
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

    // Perform web search for company information using Perplexity API
    let webSearchContext = '';
    if (companyData.company_name) {
      try {
        if (perplexityKey) {
          const searchQuery = `Find comprehensive information about ${companyData.company_name}, a company in the ${companyData.industry || 'technology'} industry. Include: company overview, recent news, market presence, funding information, notable achievements, and online visibility.`;

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
                  content: 'You are a research assistant. Provide factual, concise information about companies based on current web data.'
                },
                {
                  role: 'user',
                  content: searchQuery
                }
              ],
              temperature: 0.2,
              max_tokens: 1000
            })
          });

          if (perplexityResponse.ok) {
            const perplexityData = await perplexityResponse.json();
            const searchResults = perplexityData.choices[0]?.message?.content;

            if (searchResults) {
              webSearchContext = `\n\nExternal Web Research (via Perplexity):\n${searchResults}\n`;
            }
          }
        } else {
          // Fallback to OpenAI for web information (using existing openaiKey)
          const searchQuery = `Based on your knowledge, provide a brief overview of ${companyData.company_name} in the ${companyData.industry || 'technology'} industry. Include any known information about their market presence, reputation, and notable characteristics. If you don't have specific information, indicate that.`;

          const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are a business research assistant. Provide factual information if known, or clearly state if information is not available.'
                },
                {
                  role: 'user',
                  content: searchQuery
                }
              ],
              temperature: 0.3,
              max_tokens: 500
            })
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const searchResults = fallbackData.choices[0]?.message?.content;

            if (searchResults) {
              webSearchContext = `\n\nExternal Context (OpenAI Knowledge Base):\n${searchResults}\n`;
            }
          }
        }
      } catch (e) {
        console.log('External search not available:', e);
      }
    }

    const prompt = `You are a senior business intelligence analyst specializing in comprehensive company analysis, behavioral insights, sentiment analysis, and strategic KPI assessment. Analyze the following company data in depth, providing detailed executive-level insights with clear reasoning for every assessment.

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

## CRITICAL INSTRUCTIONS

For EVERY insight, analysis, score, and recommendation, you MUST provide:
1. **Clear reasoning** - Explain WHY you reached this conclusion
2. **Supporting evidence** - Reference specific data points from the company profile
3. **Context** - Compare to industry standards and best practices
4. **Actionable depth** - Provide executive-level detail, not surface observations

Provide comprehensive insights in the following JSON format:
{
  "executiveSummary": "A comprehensive 4-6 paragraph executive summary that covers: 1) Company overview and core business model, 2) Key strengths and market positioning, 3) Current challenges and risk factors, 4) Strategic opportunities and growth potential, 5) Technology and innovation capabilities, 6) Overall assessment and outlook. This should be detailed enough for a C-level executive to understand the complete picture.",
  "summary": "Brief 2-3 sentence high-level overview",
  "strengths": [
    {
      "title": "Strength name",
      "description": "Detailed explanation of this strength (2-3 sentences)",
      "reasoning": "Why this is a strength and what evidence supports it",
      "impact": "How this strength benefits the company and its market position"
    }
  ],
  "opportunities": [
    {
      "title": "Opportunity name",
      "description": "Detailed explanation of this opportunity (2-3 sentences)",
      "reasoning": "Why this opportunity exists and how we identified it",
      "potential": "Expected impact and strategic value of pursuing this opportunity"
    }
  ],
  "marketPosition": {
    "overview": "Comprehensive analysis of market position (3-4 sentences)",
    "competitiveAdvantage": "Detailed explanation of competitive advantages",
    "marketFit": "Assessment of product-market fit and positioning",
    "reasoning": "Why we assess the market position this way, with supporting evidence"
  },
  "recommendations": [
    {
      "title": "Recommendation name",
      "description": "Detailed strategic recommendation (2-3 sentences)",
      "reasoning": "Why this recommendation is important and what problem it solves",
      "expectedOutcome": "What results this recommendation should achieve",
      "priority": "high" | "medium" | "low"
    }
  ],
  "contentStrategy": {
    "assessment": "Detailed analysis of content strategy and thought leadership (3-4 sentences)",
    "strengths": "What they do well in content",
    "gaps": "What's missing or could be improved",
    "reasoning": "Evidence from blog analysis and industry comparison"
  },
  "techStack": {
    "assessment": "Comprehensive technology analysis (3-4 sentences)",
    "modernityLevel": "Assessment of technology modernity",
    "capabilities": "What their tech stack enables them to do",
    "limitations": "Technology gaps or constraints",
    "reasoning": "Why this tech stack assessment is accurate"
  },
  "kpis": {
    "contentScore": {
      "score": number (0-100),
      "reasoning": "Detailed explanation of why this score was assigned, referencing specific data points",
      "evidence": "Specific examples from the data that support this score"
    },
    "teamStrength": {
      "score": number (0-100),
      "reasoning": "Detailed explanation of team assessment with evidence",
      "evidence": "Specific leadership qualities, experience, or team composition that justify the score"
    },
    "techModernity": {
      "score": number (0-100),
      "reasoning": "Detailed explanation of technology assessment",
      "evidence": "Specific technologies and tools that support this score"
    },
    "marketReadiness": {
      "score": number (0-100),
      "reasoning": "Detailed explanation of market readiness assessment",
      "evidence": "Service portfolio, positioning, and differentiation factors"
    },
    "brandPresence": {
      "score": number (0-100),
      "reasoning": "Detailed explanation of brand presence assessment",
      "evidence": "Online presence, engagement, and visibility indicators"
    },
    "growthPotential": {
      "score": number (0-100),
      "reasoning": "Detailed explanation of growth potential assessment",
      "evidence": "Market opportunities, scalability factors, and expansion paths"
    }
  },
  "sentiment": {
    "overall": "positive" | "neutral" | "negative",
    "score": number (0-100),
    "brandTone": "professional" | "casual" | "technical" | "innovative" | "traditional",
    "marketPerception": "Detailed analysis of market perception (3-4 sentences)",
    "confidenceLevel": "high" | "medium" | "low",
    "reasoning": "Why we assess sentiment this way with supporting evidence"
  },
  "behaviorAnalysis": {
    "contentBehavior": {
      "assessment": "Detailed analysis of content patterns (2-3 sentences)",
      "reasoning": "Evidence and patterns observed in their content strategy"
    },
    "marketApproach": {
      "assessment": "Detailed analysis of market strategy (2-3 sentences)",
      "reasoning": "How their approach reflects in their positioning and messaging"
    },
    "innovationLevel": "conservative" | "moderate" | "aggressive",
    "innovationReasoning": "Why we classify their innovation level this way",
    "customerFocus": {
      "assessment": "Detailed analysis of customer-centricity (2-3 sentences)",
      "reasoning": "Evidence from services, messaging, and approach"
    },
    "growthOrientation": {
      "assessment": "Detailed analysis of growth mindset (2-3 sentences)",
      "reasoning": "Indicators of growth readiness and expansion capability"
    }
  },
  "riskFactors": [
    {
      "risk": "Risk description",
      "severity": "high" | "medium" | "low",
      "reasoning": "Why this is a risk and what evidence supports it",
      "mitigation": "Suggested approach to address this risk"
    }
  ],
  "competitiveEdge": [
    {
      "differentiator": "Unique differentiator",
      "description": "Detailed explanation of this competitive advantage",
      "reasoning": "Why this creates a competitive advantage",
      "sustainability": "How sustainable this advantage is"
    }
  ]
}

Respond ONLY with valid JSON. Every assessment must include detailed reasoning with specific evidence from the data. Think like a senior consultant preparing an executive briefing - be thorough, analytical, and actionable.`;

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
            content: 'You are a senior business intelligence analyst providing comprehensive, executive-level insights with detailed reasoning and evidence for every assessment. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 8000,
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
