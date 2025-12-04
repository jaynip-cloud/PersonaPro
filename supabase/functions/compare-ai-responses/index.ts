import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logger, LogContext } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  perplexityResponse: any; // Can be full response with {success, data, metadata} or just the data object
  openaiResponse: any; // Can be full response with {success, data, metadata} or just the data object
  clientName?: string;
  companyName?: string;
  dataType?: 'client' | 'company'; // Type of data being compared
}

interface ComparisonResult {
  recommendedModel: 'perplexity' | 'openai';
  score: {
    perplexity: number;
    openai: number;
  };
  reasoning: string;
  strengths: {
    perplexity: string[];
    openai: string[];
  };
  weaknesses: {
    perplexity: string[];
    openai: string[];
  };
  completeness: {
    perplexity: number;
    openai: number;
  };
  keyDifferences?: string[];
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let context: LogContext = { functionName: 'compare-ai-responses' };

  logger.startFlow('AI RESPONSE COMPARISON', context);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    logger.step('CORS', 'Handling preflight request', context);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Step 1: Authentication
    logger.step('AUTH', 'Starting authentication', context);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('Missing authorization header', context);
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logger.error('Authentication failed', context, { error: userError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.userId = user.id;
    logger.success('User authenticated', context, { userId: user.id });

    // Step 2: Parse request
    logger.step('PARSE', 'Parsing request body', context);
    const body: RequestBody = await req.json();
    let { perplexityResponse, openaiResponse, clientName, companyName, dataType } = body;

    if (!perplexityResponse || !openaiResponse) {
      logger.error('Missing response data', context);
      return new Response(
        JSON.stringify({ error: 'Both perplexityResponse and openaiResponse are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine data type if not provided
    if (!dataType) {
      // Auto-detect based on response structure
      if (perplexityResponse.companyName || openaiResponse.companyName || companyName) {
        dataType = 'company';
      } else {
        dataType = 'client';
      }
    }

    // Extract data field if responses are wrapped (from enrich functions)
    if (perplexityResponse.data) {
      perplexityResponse = perplexityResponse.data;
      logger.debug('Extracted data from perplexity response', context);
    }
    if (openaiResponse.data) {
      openaiResponse = openaiResponse.data;
      logger.debug('Extracted data from openai response', context);
    }

    // Get entity name based on data type
    let entityName: string;
    if (dataType === 'company') {
      entityName = companyName || perplexityResponse.companyName || openaiResponse.companyName || 'Unknown Company';
      context.companyName = entityName;
    } else {
      entityName = clientName || perplexityResponse.company || openaiResponse.company || 'Unknown Company';
      context.clientName = entityName;
    }

    logger.info('Request validated', context, { 
      dataType,
      entityName,
      perplexityFields: Object.keys(perplexityResponse).length,
      openaiFields: Object.keys(openaiResponse).length
    });

    // Step 3: Get API key
    logger.step('CONFIG', 'Retrieving API key', context);
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      logger.error('OPENAI_API_KEY not found', context);
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    logger.success('API key retrieved', context);

    // Step 4: Calculate completeness scores
    logger.step('CALCULATE_COMPLETENESS', 'Calculating completeness scores', context);
    const calculateCompleteness = (data: any, type: 'client' | 'company'): { score: number; details: any } => {
      if (type === 'company') {
        // Company profile specific completeness calculation
        const basicFields = [
          'companyName', 'website', 'industry', 'description', 'valueProposition',
          'founded', 'location', 'size', 'mission', 'vision'
        ];
        const contactFields = ['email', 'phone', 'address'];
        const socialFields = ['linkedinUrl', 'twitterUrl', 'facebookUrl', 'instagramUrl', 'youtubeUrl'];
        
        let populatedBasicFields = 0;
        basicFields.forEach(field => {
          const value = data[field];
          if (typeof value === 'string' && value.trim().length > 0) populatedBasicFields++;
        });
        
        let populatedContactFields = 0;
        contactFields.forEach(field => {
          const value = data[field];
          if (typeof value === 'string' && value.trim().length > 0) populatedContactFields++;
        });
        
        let populatedSocialFields = 0;
        socialFields.forEach(field => {
          const value = data[field];
          if (typeof value === 'string' && value.trim().length > 0) populatedSocialFields++;
        });
        
        const hasServices = Array.isArray(data.services) && data.services.length > 0;
        const hasLeadership = Array.isArray(data.leadership) && data.leadership.length > 0;
        const hasBlogs = Array.isArray(data.blogs) && data.blogs.length > 0;
        const hasTechStack = data.technology?.stack && Array.isArray(data.technology.stack) && data.technology.stack.length > 0;
        const hasPartners = data.technology?.partners && Array.isArray(data.technology.partners) && data.technology.partners.length > 0;
        const hasIntegrations = data.technology?.integrations && Array.isArray(data.technology.integrations) && data.technology.integrations.length > 0;
        
        const totalFields = 10 + 3 + 5 + 6; // basic + contact + social + complex
        const populatedFields = populatedBasicFields + populatedContactFields + populatedSocialFields +
          (hasServices ? 1 : 0) + (hasLeadership ? 1 : 0) + (hasBlogs ? 1 : 0) +
          (hasTechStack ? 1 : 0) + (hasPartners ? 1 : 0) + (hasIntegrations ? 1 : 0);
        
        const arrayFields = ['services', 'leadership', 'blogs', 'technology'];
        const populatedArrays = [
          hasServices, hasLeadership, hasBlogs, (hasTechStack || hasPartners || hasIntegrations)
        ].filter(Boolean).length;
        
        return {
          score: Math.round((populatedFields / totalFields) * 100),
          details: {
            totalFields,
            populatedFields,
            arrayFields: arrayFields.length,
            populatedArrays,
            arrayCompleteness: arrayFields.length > 0 
              ? Math.round((populatedArrays / arrayFields.length) * 100)
              : 100,
            servicesCount: hasServices ? data.services.length : 0,
            leadershipCount: hasLeadership ? data.leadership.length : 0,
            blogsCount: hasBlogs ? data.blogs.length : 0,
            techStackCount: hasTechStack ? data.technology.stack.length : 0
          }
        };
      } else {
        // Client data completeness calculation (original logic)
        const fields = Object.keys(data);
        const populated = fields.filter(key => {
          const value = data[key];
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'string') return value.trim().length > 0;
          return value !== null && value !== undefined;
        });
        
        // Calculate detailed metrics
        const arrayFields = fields.filter(key => Array.isArray(data[key]));
        const populatedArrays = arrayFields.filter(key => Array.isArray(data[key]) && data[key].length > 0);
        
        return {
          score: Math.round((populated.length / fields.length) * 100),
          details: {
            totalFields: fields.length,
            populatedFields: populated.length,
            arrayFields: arrayFields.length,
            populatedArrays: populatedArrays.length,
            arrayCompleteness: arrayFields.length > 0 
              ? Math.round((populatedArrays.length / arrayFields.length) * 100)
              : 100
          }
        };
      }
    };

    const perplexityCompleteness = calculateCompleteness(perplexityResponse, dataType);
    const openaiCompleteness = calculateCompleteness(openaiResponse, dataType);

    logger.info('Completeness calculated', context, { 
      perplexity: `${perplexityCompleteness.score}%`,
      openai: `${openaiCompleteness.score}%`,
      perplexityDetails: perplexityCompleteness.details,
      openaiDetails: openaiCompleteness.details
    });

    // Step 5: Construct comparison prompt
    logger.step('PROMPT', 'Constructing comparison prompt', context);
    const entityType = dataType === 'company' ? 'company profile' : 'client profile';
    const comparisonPrompt = `You are an expert business intelligence analyst. Compare two AI-generated ${entityType}s for "${entityName}" and determine which provides better, more comprehensive, and more accurate information.

PERPLEXITY RESPONSE:
${JSON.stringify(perplexityResponse, null, 2)}

OPENAI RESPONSE:
${JSON.stringify(openaiResponse, null, 2)}

COMPLETENESS METRICS:
- Perplexity: ${perplexityCompleteness.score}% (${perplexityCompleteness.details.populatedFields}/${perplexityCompleteness.details.totalFields} fields populated, ${perplexityCompleteness.details.populatedArrays}/${perplexityCompleteness.details.arrayFields} arrays populated)
- OpenAI: ${openaiCompleteness.score}% (${openaiCompleteness.details.populatedFields}/${openaiCompleteness.details.totalFields} fields populated, ${openaiCompleteness.details.populatedArrays}/${openaiCompleteness.details.arrayFields} arrays populated)

Evaluate both responses comprehensively based on:

1. COMPLETENESS: How many fields are populated with actual data (not empty strings/arrays)
   - Check: contact info (email, phone), social media URLs, blog posts, technologies${dataType === 'company' ? ', leadership team, mission/vision, value proposition' : ', competitors'}, services
   - Perplexity: ${perplexityCompleteness.score}% complete
   - OpenAI: ${openaiCompleteness.score}% complete

2. ACCURACY: How accurate the information is based on known facts about "${entityName}"
   - Verify: company name, industry, description, location, founding year
   - Check if data makes sense and is consistent

3. DETAIL LEVEL: Depth and richness of information provided
   - Compare: description length, service details, technology lists, blog post counts${dataType === 'company' ? ', leadership team details, mission/vision statements' : ''}
   - Which provides more actionable insights?

4. DATA QUALITY: Structure, consistency, and validity
   - Check: proper JSON structure, valid URLs, consistent formatting
   - Are blog URLs absolute and valid? Are social media URLs complete?
   - Are arrays properly formatted? Are dates in correct format?${dataType === 'company' ? '\n   - Are leadership members properly structured? Is technology stack comprehensive?' : ''}

5. RELEVANCE: Information is actually about "${entityName}"
   - Verify: company name matches, website matches, industry is correct
   - Check for any irrelevant or incorrect data

6. RECENCY: How current the information appears to be
   - Check: blog post dates, company information freshness
   - Which seems more up-to-date?

7. UNIQUENESS: Which provides unique information the other doesn't have?
   - Compare: unique fields, unique blog posts, unique technologies
   - Which adds more value?

Return a JSON object with this EXACT structure:
{
  "recommendedModel": "perplexity" or "openai",
  "score": {
    "perplexity": number between 0-100 (overall quality score),
    "openai": number between 0-100 (overall quality score)
  },
  "reasoning": "Detailed explanation (3-4 sentences) of why one model is recommended, including specific examples from the data. Be specific about what data points make one better than the other.",
  "strengths": {
    "perplexity": ["specific strength 1 with example", "specific strength 2 with example", "specific strength 3 with example"],
    "openai": ["specific strength 1 with example", "specific strength 2 with example", "specific strength 3 with example"]
  },
  "weaknesses": {
    "perplexity": ["specific weakness 1 with example", "specific weakness 2 with example"],
    "openai": ["specific weakness 1 with example", "specific weakness 2 with example"]
  },
  "keyDifferences": [
    "Difference 1: specific example",
    "Difference 2: specific example",
    "Difference 3: specific example"
  ]
}

Be objective, thorough, and provide specific examples from the actual data. Focus on actionable insights.`;

    logger.debug('Comparison prompt constructed', context, { promptLength: comparisonPrompt.length });

    // Step 6: Call OpenAI for comparison
    logger.step('API_CALL', 'Calling OpenAI for comparison', context);
    logger.apiCall('OpenAI', 'POST', 'https://api.openai.com/v1/chat/completions', context);

    const apiStartTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at evaluating business intelligence data quality. Compare two AI-generated company profiles objectively and return ONLY valid JSON. No markdown, no explanations, just JSON. Be thorough, specific, and provide actionable insights.'
          },
          {
            role: 'user',
            content: comparisonPrompt
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 3000,
      }),
    });

    const apiDuration = Date.now() - apiStartTime;
    logger.apiResponse('OpenAI', response.status, apiDuration, context, {
      model: 'gpt-4o',
      purpose: 'comparison'
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI API error', context, { status: response.status, error: errorText });
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    // Step 7: Parse comparison response
    logger.step('PARSE_RESPONSE', 'Parsing comparison response', context);
    const comparisonData = await response.json();
    let comparisonText = comparisonData.choices[0]?.message?.content || '';
    comparisonText = comparisonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    logger.debug('Comparison response cleaned', context, { length: comparisonText.length });

    let parsedComparison: any;
    try {
      parsedComparison = JSON.parse(comparisonText);
      logger.success('Comparison JSON parsed successfully', context);
    } catch (parseError) {
      logger.error('JSON parse error', context, { error: parseError });
      throw new Error(`Failed to parse comparison JSON: ${parseError}`);
    }

    // Step 8: Build result
    logger.step('BUILD_RESULT', 'Building comparison result', context);
    const result: ComparisonResult = {
      recommendedModel: (parsedComparison.recommendedModel === 'perplexity' || parsedComparison.recommendedModel === 'openai')
        ? parsedComparison.recommendedModel
        : (perplexityCompleteness.score >= openaiCompleteness.score ? 'perplexity' : 'openai'),
      score: {
        perplexity: typeof parsedComparison.score?.perplexity === 'number' 
          ? Math.max(0, Math.min(100, parsedComparison.score.perplexity))
          : 0,
        openai: typeof parsedComparison.score?.openai === 'number'
          ? Math.max(0, Math.min(100, parsedComparison.score.openai))
          : 0,
      },
      reasoning: parsedComparison.reasoning || 'Unable to determine recommendation',
      strengths: {
        perplexity: Array.isArray(parsedComparison.strengths?.perplexity) 
          ? parsedComparison.strengths.perplexity 
          : [],
        openai: Array.isArray(parsedComparison.strengths?.openai) 
          ? parsedComparison.strengths.openai 
          : [],
      },
      weaknesses: {
        perplexity: Array.isArray(parsedComparison.weaknesses?.perplexity) 
          ? parsedComparison.weaknesses.perplexity 
          : [],
        openai: Array.isArray(parsedComparison.weaknesses?.openai) 
          ? parsedComparison.weaknesses.openai 
          : [],
      },
      completeness: {
        perplexity: perplexityCompleteness.score,
        openai: openaiCompleteness.score,
      },
      keyDifferences: Array.isArray(parsedComparison.keyDifferences)
        ? parsedComparison.keyDifferences
        : [],
    };

    logger.info('Comparison result built', context, {
      recommended: result.recommendedModel,
      scores: result.score,
      completeness: result.completeness
    });

    const totalDuration = Date.now() - startTime;
    logger.endFlow('AI RESPONSE COMPARISON', context, {
      duration: `${totalDuration}ms`,
      recommended: result.recommendedModel,
      scores: result.score,
      apiDuration: `${apiDuration}ms`
    });

    return new Response(
      JSON.stringify({
        success: true,
        comparison: result,
        metadata: {
          processingTime: totalDuration,
          apiTime: apiDuration,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error('Comparison failed', context, { 
      error: error.message,
      stack: error.stack,
      duration: `${totalDuration}ms`
    });

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

