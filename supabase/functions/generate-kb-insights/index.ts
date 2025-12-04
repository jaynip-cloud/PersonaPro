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

Provide comprehensive insights in the following JSON format. CRITICAL: ALL sections must be nested under executiveSummary.sections. Respond with ONLY valid JSON, no markdown, no explanations:

{
  "executiveSummary": {
    "overview": "A comprehensive 5-8 paragraph executive summary covering company overview, strengths, challenges, opportunities, technology capabilities, market position, competitive landscape, and overall strategic outlook. This should be a detailed narrative that ties all insights together.",
    "reasoning": "Explain WHY you wrote this summary. Cite specific data points from the company profile, services, technology stack, leadership team, blogs, and web search results.",
    
    "sections": {
      "companyProfile": {
        "maturityLevel": "early-stage | growing | established | enterprise",
        "sophisticationScore": number (0-100),
        "marketReadiness": number (0-100),
        "strategicValue": number (0-100),
        "keyCharacteristics": "Detailed 4-5 sentence description of what makes this company unique, including their core competencies, market positioning, and distinctive qualities",
        "companyOverview": "Comprehensive 4-6 sentence overview of the company's business model, target market, value proposition, and market presence",
        "reasoning": "Explain how you determined these characteristics based on the company data, services, and market intelligence"
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

      "strengths": {
        "coreStrengths": ["5-7 detailed strength descriptions, each 3-4 sentences with specific evidence, reasoning, and impact assessment"],
        "competitiveAdvantages": ["3-4 detailed differentiator descriptions with reasoning and sustainability assessment, each 2-3 sentences"],
        "uniqueValuePropositions": "Detailed 4-5 sentence analysis of what makes their value proposition unique and compelling",
        "reasoning": "Explain what data points led to identifying these strengths"
      },

      "opportunities": {
        "growthOpportunities": ["5-7 detailed opportunity descriptions, each 3-4 sentences with reasoning, potential impact, and feasibility assessment"],
        "expansionAreas": "Detailed 4-5 sentence analysis of potential expansion areas, new markets, or service extensions",
        "strategicPartnerships": "Detailed 3-4 sentence analysis of potential partnership opportunities based on their technology stack and market position",
        "recommendedApproach": "Detailed 4-5 sentence strategy for how to capitalize on these opportunities",
        "reasoning": "Explain what data suggests these opportunities exist and why they're viable"
      },

      "technologyAssessment": {
        "techStackAnalysis": "Comprehensive 5-6 sentence technology analysis including modernity assessment, capabilities, limitations, scalability, and strategic implications",
        "techModernityScore": number (0-100),
        "techModernityReasoning": "Detailed 4-5 sentence explanation with specific evidence about their technology choices",
        "partnersAnalysis": "Detailed 3-4 sentence analysis of their technology partners and what this indicates about their strategy",
        "integrationsAnalysis": "Detailed 3-4 sentence analysis of their integrations and ecosystem connectivity",
        "innovationLevel": "bleeding-edge | early-adopter | pragmatic | conservative",
        "innovationReasoning": "Detailed 3-4 sentence explanation of their innovation approach based on technology choices",
        "techRecommendations": ["3-4 detailed recommendations for technology improvements or additions, each 2-3 sentences"],
        "reasoning": "Explain how the technology stack data informed this assessment"
      },

      "contentStrategy": {
        "contentAnalysis": "Detailed 5-6 sentence analysis of content strategy including strengths, gaps, quality assessment, and thought leadership positioning",
        "contentScore": number (0-100),
        "contentScoreReasoning": "Detailed 4-5 sentence explanation with specific evidence about blog quantity, quality, topics, and engagement",
        "contentBehavior": "Detailed 3-4 sentence assessment of their content publishing patterns, topics, and audience engagement",
        "contentGaps": ["3-4 detailed descriptions of content gaps or missed opportunities, each 2-3 sentences"],
        "contentRecommendations": ["4-5 detailed recommendations for content strategy improvements, each 2-3 sentences with expected outcomes"],
        "reasoning": "Explain how the blog data and content analysis led to these insights"
      },

      "leadershipTeam": {
        "teamAnalysis": "Detailed 4-5 sentence analysis of the leadership team's composition, experience, diversity, and strategic positioning",
        "teamStrengthScore": number (0-100),
        "teamStrengthReasoning": "Detailed 4-5 sentence explanation with specific evidence about team size, experience, backgrounds, and track records",
        "leadershipGaps": ["2-3 detailed descriptions of potential leadership gaps or areas for strengthening, each 2-3 sentences"],
        "teamRecommendations": ["3-4 detailed recommendations for team development or expansion, each 2-3 sentences"],
        "reasoning": "Explain how the leadership data informed this assessment"
      },

      "brandPresence": {
        "brandAnalysis": "Detailed 4-5 sentence analysis of brand presence, online visibility, social media engagement, and market perception",
        "brandPresenceScore": number (0-100),
        "brandPresenceReasoning": "Detailed 4-5 sentence explanation with specific evidence about online presence, social media activity, and brand recognition",
        "marketPerception": "Detailed 4-5 sentence analysis of how the market perceives this company based on web search and brand indicators",
        "brandTone": "professional | innovative | approachable | technical | authoritative",
        "brandRecommendations": ["3-4 detailed recommendations for brand presence improvements, each 2-3 sentences"],
        "reasoning": "Explain how web search results and brand indicators informed this analysis"
      },

      "keyMetrics": {
        "contentScore": number (0-100),
        "teamStrength": number (0-100),
        "techModernity": number (0-100),
        "marketReadiness": number (0-100),
        "brandPresence": number (0-100),
        "growthPotential": number (0-100),
        "overallScore": number (0-100),
        "overallScoreReasoning": "Detailed 5-6 sentence explanation of how the overall score was calculated, weighting factors, and what it indicates about the company's position"
      },

      "sentimentAnalysis": {
        "overallSentiment": "very positive | positive | neutral | concerned | negative",
        "sentimentScore": number (0-100),
        "brandTone": "professional | innovative | approachable | technical | authoritative",
        "marketPerception": "Detailed 5-6 sentence analysis of market perception based on web search, brand presence, and content analysis",
        "confidenceLevel": "high | medium | low",
        "sentimentTrend": "improving | stable | declining",
        "reasoning": "Detailed 4-5 sentence evidence-based explanation of sentiment drivers and supporting data"
      },

      "behaviorAnalysis": {
        "contentBehavior": "Detailed 4-5 sentence assessment of content publishing behavior, topics, frequency, and engagement patterns with reasoning",
        "marketApproach": "Detailed 4-5 sentence assessment of their market approach, positioning strategy, and go-to-market behavior with reasoning",
        "innovationLevel": "bleeding-edge | early-adopter | pragmatic | conservative",
        "innovationReasoning": "Detailed 3-4 sentence explanation of innovation classification based on technology and market behavior",
        "customerFocus": "Detailed 4-5 sentence assessment of customer focus, target market clarity, and customer-centricity with evidence",
        "growthOrientation": "Detailed 4-5 sentence assessment of growth orientation, expansion mindset, and scalability indicators"
      },

      "riskFactors": {
        "identifiedRisks": ["4-6 detailed risk descriptions, each 3-4 sentences including severity assessment, reasoning, potential impact, and mitigation strategies"],
        "riskLevel": "low | medium | high",
        "riskMitigation": "Detailed 4-5 sentence overall risk mitigation strategy and recommendations"
      },

      "strategicRecommendations": {
        "immediatePriorities": ["5-7 detailed immediate action items for next 30-60 days, each 3-4 sentences with specific steps, expected outcomes, and priority indicators"],
        "strategicInitiatives": ["5-7 detailed long-term strategic recommendations, each 4-5 sentences with reasoning, expected outcomes, implementation approach, and success metrics"],
        "communicationStrategy": "Detailed 4-5 sentence recommendation for how to best communicate the company's value proposition and positioning",
        "growthStrategy": "Detailed 5-6 sentence comprehensive growth strategy recommendation based on all analysis",
        "reasoning": "Detailed 5-6 sentence explanation of the strategic thinking behind each recommendation, connecting them to the data analysis"
      },

      "dataAnalysis": {
        "companyProfileUsage": "Detailed 4-5 sentence explanation of how company profile data (services, technology, leadership, blogs) contributed to insights. Cite specific examples.",
        "marketIntelligenceUsage": "Detailed 4-5 sentence explanation of how Perplexity search results contributed. What specific insights came from market intelligence?",
        "dataConfidence": "high | medium | low",
        "dataConfidenceReasoning": "Detailed 3-4 sentence explanation of confidence level and why. What data sources were most reliable?",
        "dataGaps": "Detailed 3-4 sentence description of what data is missing that would improve the analysis"
      }
    }
  }
}

CRITICAL: Your response must be ONLY the JSON object above with actual data filled in. No markdown formatting, no code blocks, no explanations outside the JSON. Start with { and end with }. Be EXTREMELY thorough and detailed in every field - provide executive-level depth, not surface observations.`;

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
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 12000, // Increased for much more detailed insights
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    let insightsText = openaiData.choices[0]?.message?.content;

    if (!insightsText || insightsText.trim().length === 0) {
      console.error('OpenAI returned empty response');
      throw new Error('AI returned an empty response. Please try again.');
    }

    // Clean up the response text
    insightsText = insightsText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let insights;
    try {
      // Validate JSON structure before parsing
      if (!insightsText.startsWith('{') || !insightsText.trim().endsWith('}')) {
        console.error('Response does not appear to be valid JSON:', insightsText.substring(0, 200));
        throw new Error('AI response is not in valid JSON format');
      }

      insights = JSON.parse(insightsText);
      
      // Validate required fields exist
      if (!insights.executiveSummary) {
        console.error('Response missing executiveSummary:', Object.keys(insights));
        throw new Error('AI response is missing required executiveSummary field');
      }
      
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      console.error('Response text (first 500 chars):', insightsText.substring(0, 500));
      console.error('Response text (last 200 chars):', insightsText.substring(Math.max(0, insightsText.length - 200)));
      throw new Error(`Failed to parse AI insights: ${e.message || 'Invalid JSON format'}`);
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
