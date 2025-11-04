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

    const prompt = `You are a business intelligence analyst. Analyze the following company data and provide comprehensive insights.

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

Provide insights in the following JSON format:
{
  "summary": "Brief 2-3 sentence overview of the company",
  "strengths": ["List of 3-5 key strengths"],
  "opportunities": ["List of 3-5 growth opportunities"],
  "marketPosition": "Analysis of market position and competitive advantage",
  "recommendations": ["List of 3-5 strategic recommendations"],
  "contentStrategy": "Insights based on blog content and thought leadership",
  "techStack": "Analysis of technology choices and capabilities"
}

Respond ONLY with valid JSON.`;

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
            content: 'You are a business intelligence analyst providing actionable insights. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
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