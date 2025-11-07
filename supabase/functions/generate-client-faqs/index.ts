import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { clientId } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'clientId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch meeting transcripts
    const { data: transcripts, error: transcriptsError } = await supabaseClient
      .from('meeting_transcripts')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('meeting_date', { ascending: false });

    if (transcriptsError) {
      console.error('Error fetching transcripts:', transcriptsError);
    }

    // Fetch client insights if available
    const { data: insights } = await supabaseClient
      .from('client_intelligence')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch documents for additional context
    const { data: documents } = await supabaseClient
      .from('documents')
      .select('name, summary, insights')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .limit(10);

    // Fetch call records
    const { data: callRecords } = await supabaseClient
      .from('call_records')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('call_date', { ascending: false })
      .limit(10);

    // Build comprehensive context
    const transcriptsText = transcripts && transcripts.length > 0
      ? transcripts.map((t, i) => 
          `Meeting ${i + 1}: ${t.title || 'Untitled Meeting'}
Date: ${t.meeting_date ? new Date(t.meeting_date).toLocaleDateString() : 'Unknown'}
${t.transcript_text || t.transcript || 'No transcript available'}
${t.action_items && t.action_items.length > 0 ? `\nAction Items: ${t.action_items.join(', ')}` : ''}
${t.sentiment ? `Sentiment: ${t.sentiment}` : ''}
---`
        ).join('\n\n')
      : 'No meeting transcripts available.';

    const clientContext = `
# CLIENT PROFILE

## Basic Information
- Company Name: ${client.company || client.name || 'N/A'}
- Contact Name: ${client.name || 'N/A'}
- Industry: ${client.industry || 'N/A'}
- Location: ${client.location || client.city || 'N/A'}
- Email: ${client.email || 'N/A'}
- Phone: ${client.phone || 'N/A'}
- Website: ${client.website || 'N/A'}
- Status: ${client.status || 'N/A'}

## Strategic Context
- Short-term Goals: ${client.short_term_goals || 'Not specified'}
- Long-term Goals: ${client.long_term_goals || 'Not specified'}
- Expectations: ${client.expectations || 'Not specified'}
- Pain Points: ${client.pain_points || 'Not specified'}
- Budget Range: ${client.budget_range || 'Not specified'}

## AI Insights (if available)
${insights ? `
- Maturity Level: ${insights.ai_insights?.clientProfile?.maturityLevel || 'Unknown'}
- Communication Style: ${insights.ai_insights?.behavioralAnalysis?.communicationStyle || 'Unknown'}
- Overall Sentiment: ${insights.ai_insights?.sentimentAnalysis?.overallSentiment || 'Unknown'}
- Engagement Level: ${insights.ai_insights?.behavioralAnalysis?.engagementLevel || 'Unknown'}
- Priorities: ${insights.ai_insights?.psychographicProfile?.priorities?.join(', ') || 'Not specified'}
- Pain Points: ${insights.ai_insights?.psychographicProfile?.painPoints?.join(', ') || 'Not specified'}
` : 'No AI insights available yet.'}

## Documents Summary
${documents && documents.length > 0
  ? documents.map((doc, i) => 
      `${i + 1}. ${doc.name || 'Untitled Document'}
   Summary: ${doc.summary || 'No summary available'}
   Insights: ${doc.insights && doc.insights.length > 0 ? doc.insights.join(', ') : 'None'}`
    ).join('\n\n')
  : 'No documents uploaded.'}

## Call Records Summary
${callRecords && callRecords.length > 0
  ? callRecords.map((call, i) => 
      `${i + 1}. Call on ${call.call_date ? new Date(call.call_date).toLocaleDateString() : 'Unknown Date'}
   Type: ${call.type || 'Unknown'}
   Summary: ${call.summary || 'No summary available'}
   Key Points: ${call.key_points && call.key_points.length > 0 ? call.key_points.join(', ') : 'None'}
   Sentiment: ${call.sentiment || 'Unknown'}`
    ).join('\n\n')
  : 'No call records available.'}
`;

    // Predefined FAQ questions
    const predefinedQuestions = [
      {
        question: "What are the client's main pain points and challenges?",
        category: "Pain Points & Challenges"
      },
      {
        question: "What are the client's short-term and long-term goals?",
        category: "Goals & Objectives"
      },
      {
        question: "What is the client's communication style and preferences?",
        category: "Communication"
      },
      {
        question: "What is the client's decision-making process and timeline?",
        category: "Decision Making"
      },
      {
        question: "What is the client's budget range and spending capacity?",
        category: "Budget & Financial"
      },
      {
        question: "What are the client's key priorities and focus areas?",
        category: "Priorities"
      },
      {
        question: "What is the overall sentiment and relationship health?",
        category: "Relationship Health"
      },
      {
        question: "What are the client's expectations from our partnership?",
        category: "Expectations"
      },
      {
        question: "What action items or next steps were discussed?",
        category: "Action Items"
      },
      {
        question: "What are potential risks or concerns with this client?",
        category: "Risk Assessment"
      },
      {
        question: "What upsell or cross-sell opportunities exist?",
        category: "Opportunities"
      },
      {
        question: "What is the client's industry position and market context?",
        category: "Market Context"
      }
    ];

    // Build the intelligence analysis prompt
    const analysisPrompt = `You are an elite business intelligence analyst specializing in extracting actionable insights from client interactions, meeting transcripts, and relationship data. Your task is to analyze the provided client data and meeting transcripts to answer predefined Frequently Asked Questions (FAQs) about the client.

# CLIENT DATA CONTEXT

${clientContext}

# MEETING TRANSCRIPTS

${transcriptsText}

# ANALYSIS INSTRUCTIONS

Analyze the above client data and meeting transcripts to answer the following predefined FAQ questions. For each question:

1. **Extract Evidence**: Cite specific information from meeting transcripts, client data, or documents that support your answer
2. **Provide Context**: Include relevant details, dates, and examples from the transcripts
3. **Be Specific**: Use actual quotes, numbers, and concrete examples when available
4. **Identify Gaps**: If information is missing or unclear, state what is known and what needs clarification
5. **Prioritize Recent Data**: Give more weight to recent meetings and interactions
6. **Synthesize Insights**: Combine information from multiple sources to provide comprehensive answers

# PREDEFINED FAQ QUESTIONS

Answer each of the following questions based on the client data and meeting transcripts:

${predefinedQuestions.map((q, i) => `${i + 1}. **${q.question}** (Category: ${q.category})`).join('\n')}

# OUTPUT FORMAT

Provide your analysis in JSON format with the following structure:

{
  "faqs": [
    {
      "question": "Exact question text",
      "category": "Category name",
      "answer": "Comprehensive answer based on transcripts and client data (2-4 sentences minimum)",
      "evidence": [
        {
          "source": "meeting_transcript | client_data | document | call_record",
          "sourceDetails": "Meeting title or document name",
          "date": "Date of the source",
          "quote": "Direct quote or excerpt supporting the answer",
          "relevance": "high | medium | low"
        }
      ],
      "confidence": "high | medium | low",
      "lastUpdated": "Date of most recent relevant information",
      "needsClarification": false,
      "clarificationNotes": "What additional information would be helpful (if any)"
    }
  ],
  "summary": {
    "totalTranscripts": number,
    "dateRange": "Earliest to latest meeting date",
    "keyThemes": ["Main themes discussed across meetings"],
    "dataQuality": "high | medium | low",
    "coverage": "How well the transcripts cover each FAQ category"
  },
  "recommendations": [
    "Actionable recommendations based on the FAQ analysis"
  ]
}

# CRITICAL REQUIREMENTS

1. **Accuracy First**: Only state facts that can be directly supported by the provided data
2. **No Assumptions**: If information is not available, clearly state "Information not available in transcripts" rather than guessing
3. **Quote Sources**: Include direct quotes from transcripts when possible
4. **Chronological Context**: Note when information was discussed (recent vs. older meetings)
5. **Confidence Levels**: Assign confidence based on:
   - High: Multiple sources confirm, recent data, specific quotes
   - Medium: Some evidence, may be inferred from context
   - Low: Limited evidence, older data, or requires inference
6. **Actionable**: Focus on insights that can inform relationship management and business decisions

# ANALYSIS PROCESS

1. Read through all meeting transcripts chronologically
2. Extract key information relevant to each FAQ question
3. Cross-reference with client profile data and documents
4. Identify patterns, trends, and changes over time
5. Synthesize findings into comprehensive answers
6. Cite specific evidence for each answer

Begin your analysis now.`;

    // Call OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business intelligence analyst. Always respond with valid JSON only, no additional text or markdown formatting.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to generate FAQs', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const faqAnalysis = JSON.parse(openaiData.choices[0].message.content);

    // Save FAQs to database (optional - create a table for this)
    // For now, just return the results

    return new Response(
      JSON.stringify({
        success: true,
        faqs: faqAnalysis.faqs || [],
        summary: faqAnalysis.summary || {},
        recommendations: faqAnalysis.recommendations || [],
        metadata: {
          clientId,
          transcriptsAnalyzed: transcripts?.length || 0,
          documentsAnalyzed: documents?.length || 0,
          callRecordsAnalyzed: callRecords?.length || 0,
          generatedAt: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating FAQs:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate FAQs', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

