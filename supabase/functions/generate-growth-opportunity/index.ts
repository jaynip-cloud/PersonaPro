import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid authorization');
    }

    const { clientId } = await req.json();

    if (!clientId) {
      throw new Error('Client ID is required');
    }

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

    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .limit(10);

    const { data: transcripts } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: existingOpportunities } = await supabase
      .from('opportunities')
      .select('title, description')
      .eq('client_id', clientId)
      .eq('user_id', user.id);

    const { data: settings } = await supabase
      .from('settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single();

    if (!settings?.openai_api_key) {
      throw new Error('OpenAI API key not configured. Please add it in Settings.');
    }

    const contextData = {
      client: {
        name: client.company,
        industry: client.industry,
        size: client.company_size,
        description: client.description,
        website: client.website,
        tags: client.tags,
      },
      contacts: contacts?.map(c => ({
        name: c.name,
        role: c.role,
        isDecisionMaker: c.is_decision_maker,
      })) || [],
      recentTranscripts: transcripts?.map(t => ({
        title: t.title,
        summary: t.summary,
        keyPoints: t.key_points,
      })) || [],
      documentCount: documents?.length || 0,
      existingOpportunities: existingOpportunities?.map(o => o.title) || [],
    };

    const prompt = `You are a business development AI analyzing client data to identify growth opportunities.

Client Context:
- Company: ${contextData.client.name}
- Industry: ${contextData.client.industry || 'Unknown'}
- Company Size: ${contextData.client.size || 'Unknown'}
- Description: ${contextData.client.description || 'No description available'}

Key Contacts:
${contextData.contacts.map(c => `- ${c.name} (${c.role})${c.isDecisionMaker ? ' - Decision Maker' : ''}`).join('\n')}

Recent Meeting Insights:
${contextData.recentTranscripts.length > 0 ? contextData.recentTranscripts.map(t => `- ${t.title}: ${t.summary || 'No summary'}`).join('\n') : 'No recent meetings'}

Documents: ${contextData.documentCount} documents uploaded

Existing Opportunities: ${contextData.existingOpportunities.length > 0 ? contextData.existingOpportunities.join(', ') : 'None'}

Based on this information, identify ONE high-value growth opportunity that:
1. Is specific and actionable
2. Aligns with the client's industry and size
3. Different from existing opportunities
4. Based on actual client data (not generic)
5. Has clear business value

Respond with ONLY a JSON object in this exact format:
{
  "title": "Specific, compelling opportunity title (max 60 chars)",
  "description": "Detailed description explaining why this opportunity exists, what value it brings, and how it addresses client needs (2-3 sentences)",
  "value": 75000,
  "probability": 65,
  "expectedCloseDate": "2026-03-15",
  "reasoning": "Brief explanation of the AI analysis that led to this opportunity"
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.openai_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a business development AI. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content.trim();
    
    let opportunityData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      opportunityData = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (e) {
      throw new Error(`Failed to parse AI response: ${aiResponse}`);
    }

    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const { data: newOpportunity, error: insertError } = await supabase
      .from('opportunities')
      .insert({
        client_id: clientId,
        user_id: user.id,
        title: opportunityData.title,
        description: opportunityData.description,
        value: opportunityData.value || 50000,
        probability: opportunityData.probability || 50,
        expected_close_date: opportunityData.expectedCloseDate || threeMonthsFromNow.toISOString(),
        stage: 'lead',
        is_ai_generated: true,
        source: 'AI Analysis',
        ai_analysis: {
          reasoning: opportunityData.reasoning,
          generatedAt: new Date().toISOString(),
          contextSummary: {
            contactsAnalyzed: contextData.contacts.length,
            transcriptsReviewed: contextData.recentTranscripts.length,
            documentsConsidered: contextData.documentCount,
          },
        },
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        opportunity: newOpportunity,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating opportunity:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});