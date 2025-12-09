import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logger, LogContext } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  clientName: string;
  websiteUrl: string;
  linkedinUrl: string;
}

interface GeminiResponse {
  company: string;
  website: string;
  industry: string;
  description: string;
  founded: string;
  companySize: string;
  employeeCount: string;
  annualRevenue: string;
  city: string;
  country: string;
  zipCode: string;
  linkedinUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  contactName: string;
  primaryEmail: string;
  primaryPhone: string;
  jobTitle: string;
  services: Array<{ name: string; description: string }>;
  technologies: Array<{ name: string; category: string }>;
  painPoints: Array<string>;
  competitors: Array<{ name: string; comparison: string }>;
  blogs: Array<{ title: string; url: string; date: string }>;
  shortTermGoals: string;
  longTermGoals: string;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let context: LogContext = { functionName: 'enrich-client-gemini' };

  logger.startFlow('GEMINI CLIENT ENRICHMENT', context);

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
    const { clientName, websiteUrl, linkedinUrl } = body;

    if (!clientName || !websiteUrl || !linkedinUrl) {
      logger.error('Missing required fields', context, { body });
      return new Response(
        JSON.stringify({ error: 'clientName, websiteUrl, and linkedinUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.clientName = clientName;
    logger.info('Request validated', context, { clientName, websiteUrl, linkedinUrl });

    // Step 3: Get API key (from database first, then environment)
    logger.step('CONFIG', 'Retrieving API key', context);
    const { data: apiKeys } = await supabaseClient
      .from('api_keys')
      .select('gemini_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const geminiApiKey = apiKeys?.gemini_api_key || Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      logger.error('GEMINI_API_KEY not found', context);
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured. Please add it in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.success('API key retrieved', context);

    // Step 4: Construct prompt
    logger.step('PROMPT', 'Constructing AI prompt', context);
    const prompt = `You are an expert business intelligence analyst. Research and extract comprehensive information about this company using web search.

Company Name: ${clientName}
Website: ${websiteUrl}
LinkedIn: ${linkedinUrl}

CRITICAL EXTRACTION INSTRUCTIONS:
1. CONTACT INFORMATION: Search the company website's contact page, about page, and footer for:
   - Email addresses (look for contact@, info@, hello@, or general email patterns)
   - Phone numbers (including country codes and formatting)
   - Full physical address including street address, city, state/province, country, and ZIP/postal code

2. SOCIAL MEDIA (MANDATORY - DO NOT SKIP): You MUST actively search for and extract ALL social media profiles:
   - Instagram: Search website footer, header, contact page, about page, and any social media icons/links. Look for patterns like instagram.com/companyname or @companyname. Extract the FULL URL.
   - Twitter/X: Search website footer, header, contact page, about page. Look for patterns like twitter.com/companyname, x.com/companyname, or @companyname. Extract the FULL URL.
   - Facebook: Search website footer, header, contact page, about page. Look for patterns like facebook.com/companyname or fb.com/companyname. Extract the FULL URL.
   - If ANY social media profile exists, you MUST include it. Do NOT leave these fields empty if the profiles exist.

3. BLOG INFORMATION (COMPREHENSIVE EXTRACTION - CRITICAL URL FORMAT): You MUST thoroughly check for blog content:
   - Visit the blog URL (typically website.com/blog, website.com/blog/, website.com/articles, website.com/news, or website.com/insights)
   - Extract ALL available blog posts, not just a few
   - For each blog post, extract: title, FULL ABSOLUTE URL, and publication date
   - CRITICAL: Blog URLs MUST be complete absolute URLs starting with "https://" or "http://"
   - DO NOT use relative URLs (e.g., "/blog/post-title") - convert them to full URLs (e.g., "https://website.com/blog/post-title")
   - Verify the URL structure matches the actual blog structure on the website
   - If you find a blog post, construct the FULL URL by combining the website base URL with the post path
   - Example: If website is "https://example.com" and post path is "/blog/my-article", the full URL should be "https://example.com/blog/my-article"
   - Include at least 10-15 recent blog posts if available, or ALL posts if fewer than 15
   - If the company has an active blog, you MUST populate the blogs array with multiple entries

4. LOCATION DETAILS: Extract complete address information:
   - Street address
   - City
   - State/Province (if applicable)
   - Country
   - ZIP/Postal code (CRITICAL - search specifically for this)

5. TEAM INFORMATION: Search for key team members:
   - Founders, CEOs, Managing Directors
   - Their names, titles, and contact information if available

6. TECHNOLOGIES (COMPREHENSIVE): Extract ALL technologies, frameworks, tools, and platforms:
   - Programming languages (JavaScript, Python, Java, etc.)
   - Frameworks (React, Node.js, Django, etc.)
   - Databases (PostgreSQL, MongoDB, etc.)
   - Cloud platforms (AWS, Azure, GCP, etc.)
   - Tools and services (Docker, Kubernetes, etc.)
   - Any technology mentioned on their website, services page, or case studies
   - Include at least 10-15 technologies if available

7. COMPETITORS (ACTIVE SEARCH REQUIRED): You MUST search for and identify competitors:
   - Search for companies in the same industry offering similar services
   - Look for competitor mentions in blog posts, case studies, or industry reports
   - Include at least 3-5 major competitors with brief comparisons
   - If competitors exist, you MUST populate this array

Extract ALL available information and return a JSON object with this EXACT structure (use empty strings or empty arrays if information is not available):

{
  "company": "string - Company name",
  "website": "string - Website URL",
  "industry": "string - Primary industry",
  "description": "string - Detailed company description/overview",
  "founded": "string - Year founded",
  "companySize": "string - Size category (e.g., '50-200 employees')",
  "employeeCount": "string - Number of employees (exact or range)",
  "annualRevenue": "string - Annual revenue (range or amount)",
  "city": "string - City location",
  "country": "string - Country",
  "zipCode": "string - Zip/postal code (MUST extract from full address if available)",
  "linkedinUrl": "string - LinkedIn company page URL",
  "twitterUrl": "string - Twitter handle or URL",
  "facebookUrl": "string - Facebook page URL",
  "instagramUrl": "string - Instagram profile URL (search website footer and social sections)",
  "contactName": "string - Primary contact person name (founder, CEO, or main contact)",
  "primaryEmail": "string - Primary email address (from contact page or website)",
  "primaryPhone": "string - Primary phone number (with country code if available)",
  "jobTitle": "string - Contact's job title/role",
  "services": [{"name": "string", "description": "string"}],
  "technologies": [{"name": "string", "category": "string"}],
  "painPoints": ["string - Business challenges"],
  "competitors": [{"name": "string", "comparison": "string"}],
  "blogs": [{"title": "string", "url": "string - MUST be FULL absolute URL starting with https:// or http://", "date": "string"}],
  "shortTermGoals": "string - 3-6 month goals",
  "longTermGoals": "string - 1-5 year vision"
}

CRITICAL EXTRACTION RULES:
- Use web search to find the most current and accurate information
- Be EXTREMELY thorough - extract EVERY piece of available information
- SPECIFICALLY search the company website for contact information, social links, and blog content
- Check website footer, header, contact page, about page, services page, and social media sections
- For SOCIAL MEDIA URLs (twitterUrl, facebookUrl, instagramUrl): 
  * You MUST actively search for these. Check footer, header, contact page, about page
  * Look for social media icons, links, or mentions
  * If ANY social profile exists, extract the FULL URL (e.g., "https://www.instagram.com/rivuletiq/")
  * Do NOT leave these empty if profiles exist - search more thoroughly
- For zipCode: Extract from the full address if provided (e.g., "Ahmedabad 380054" → zipCode: "380054")
- For primaryEmail: Look for contact@, info@, hello@, or similar email patterns on the website
- For primaryPhone: Extract phone numbers from contact pages, including country codes
- For blogs: 
  * Visit the blog section (website.com/blog, website.com/articles, etc.)
  * Extract ALL or MANY blog posts (aim for 10-15+ if available)
  * CRITICAL: URLs MUST be FULL absolute URLs starting with "https://" or "http://"
  * DO NOT use relative URLs - always construct complete URLs by combining website base URL with post path
  * Verify URL structure: if website is "https://example.com" and post is "/blog/article", URL should be "https://example.com/blog/article"
  * Include title, FULL absolute URL (not relative), and publication date for each
  * If blog exists, populate with multiple entries
- For technologies:
  * Extract ALL technologies mentioned anywhere on the website
  * Include programming languages, frameworks, databases, cloud platforms, tools
  * Aim for 10-15+ technologies if available
  * Check services page, case studies, tech stack sections
- For competitors:
  * Actively search for companies in the same industry
  * Look for competitor mentions in content, industry reports, or market analysis
  * Include at least 3-5 competitors with brief comparison notes
  * If competitors exist, populate this array
- Ensure all string fields are strings (not null)
- Ensure all arrays are arrays (not null)
- Return ONLY valid JSON, no markdown formatting
- If information is genuinely not found after thorough search, use empty string "" or empty array []
- For dates, use YYYY-MM-DD format
- Extract real, factual information only
- REMEMBER: Be comprehensive - extract ALL available data, not just partial information`;

    logger.debug('Prompt constructed', context, { promptLength: prompt.length });

    // Step 5: Call Gemini API
    logger.step('API_CALL', 'Calling Gemini API', context);
    
    // Try multiple model names in order of preference
    // Primary: gemini-2.5-flash (as requested by user)
    const modelNames = [
      'gemini-2.5-flash',      // Primary model - latest Flash version
      'gemini-1.5-flash',      // Fallback - stable and widely available
      'gemini-2.0-flash-exp'   // Alternative experimental version
    ];
    
    let lastError: Error | null = null;
    let geminiData: any = null;
    let modelName = modelNames[0];
    let apiDuration = 0;
    let content = '';
    
    // Try each model until one works
    // Also try different API versions if needed
    const apiVersions = ['v1beta', 'v1'];
    
    for (const tryModelName of modelNames) {
      for (const apiVersion of apiVersions) {
        try {
          const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${tryModelName}:generateContent`;
          logger.apiCall('Gemini', 'POST', apiUrl, context);
          
          const apiStartTime = Date.now();
          
          // Build generation config - responseMimeType is only available in v1beta
          const generationConfig: any = {
            temperature: 0.1,
            maxOutputTokens: 8192,
          };
          
          // Only add responseMimeType for v1beta API
          if (apiVersion === 'v1beta') {
            generationConfig.responseMimeType = "application/json";
          }
          
          const response = await fetch(
            `${apiUrl}?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: generationConfig,
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_NONE"
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_NONE"
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_NONE"
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_NONE"
                }
              ]
            }),
          }
        );
        
        apiDuration = Date.now() - apiStartTime;
        logger.apiResponse('Gemini', response.status, apiDuration, context, {
          model: tryModelName,
          apiVersion: apiVersion
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          logger.warn(`Model ${tryModelName} with ${apiVersion} failed`, context, { 
            status: response.status, 
            error: errorText 
          });
          lastError = new Error(`Gemini API error with ${tryModelName} (${apiVersion}): ${response.status} - ${errorText}`);
          continue; // Try next API version or model
        }
        
        geminiData = await response.json();
        
        // Check if we got a valid response
        if (geminiData.error) {
          logger.warn(`Model ${tryModelName} (${apiVersion}) returned error`, context, { error: geminiData.error });
          lastError = new Error(`Gemini API error: ${JSON.stringify(geminiData.error)}`);
          continue; // Try next API version or model
        }
        
        if (!geminiData.candidates || geminiData.candidates.length === 0) {
          logger.warn(`Model ${tryModelName} (${apiVersion}) returned no candidates`, context, {
            fullResponse: JSON.stringify(geminiData).substring(0, 500)
          });
          lastError = new Error('Gemini API returned no candidates');
          continue; // Try next API version or model
        }
        
        const candidate = geminiData.candidates[0];
        
        // Check finish reason
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          logger.warn(`Model ${tryModelName} (${apiVersion}) finished with non-STOP reason`, context, { 
            finishReason: candidate.finishReason,
            safetyRatings: candidate.safetyRatings
          });
          
          // If blocked by safety, try next model/version
          if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
            lastError = new Error(`Content blocked by safety filters: ${candidate.finishReason}`);
            continue; // Try next API version or model
          }
        }
        
        // Extract content - try multiple possible structures
        content = '';
        
        // Try standard structure: candidates[0].content.parts[0].text
        if (candidate.content?.parts?.[0]?.text) {
          content = candidate.content.parts[0].text;
        }
        // Try alternative: candidates[0].text
        else if (candidate.text) {
          content = candidate.text;
        }
        // Try: candidates[0].output
        else if (candidate.output) {
          content = candidate.output;
        }
        // Try: candidates[0].content directly as string
        else if (typeof candidate.content === 'string') {
          content = candidate.content;
        }
        
        if (!content || content.trim() === '') {
          logger.warn(`Model ${tryModelName} (${apiVersion}) returned empty content`, context, {
            finishReason: candidate.finishReason,
            safetyRatings: candidate.safetyRatings,
            candidate: JSON.stringify(candidate).substring(0, 500)
          });
          lastError = new Error(`Empty response from ${tryModelName} (${apiVersion}). Finish reason: ${candidate.finishReason || 'unknown'}`);
          continue; // Try next API version or model
        }
        
        // Success! Use this model and API version
        modelName = tryModelName;
        logger.success(`Successfully using model: ${modelName} with API version: ${apiVersion}`, context);
        break; // Break out of API version loop
      } catch (error: any) {
        logger.warn(`Model ${tryModelName} (${apiVersion}) failed with exception`, context, { error: error.message });
        lastError = error;
        continue; // Try next API version
      }
    }
    
    // If we successfully got content, break out of model loop too
    if (content && content.trim() !== '') {
      break;
    }
  }
    
    // If all models failed, throw the last error
    if (!geminiData || !content || content.trim() === '') {
      logger.error('All Gemini models failed', context, { 
        lastError: lastError?.message,
        hasGeminiData: !!geminiData,
        hasContent: !!content
      });
      throw lastError || new Error('All Gemini model attempts failed');
    }

    // Step 6: Log successful response
    logger.step('PARSE_RESPONSE', 'Parsing API response', context);
    logger.debug('Raw API response received', context, { 
      candidates: geminiData.candidates?.length,
      usage: geminiData.usageMetadata,
      model: modelName,
      contentLength: content.length,
      fullResponse: JSON.stringify(geminiData).substring(0, 1000)
    });

    logger.debug('Extracted response text', context, { length: content.length });

    // Step 7: Clean and parse JSON
    logger.step('CLEAN_JSON', 'Cleaning and parsing JSON', context);
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let parsedData: GeminiResponse;
    try {
      parsedData = JSON.parse(cleanedContent);
      logger.success('JSON parsed successfully', context);
    } catch (parseError) {
      logger.error('JSON parse error', context, { 
        error: parseError,
        content: cleanedContent.substring(0, 500) 
      });
      throw new Error(`Failed to parse Gemini response: ${parseError}`);
    }

    // Step 8: Normalize data
    logger.step('NORMALIZE', 'Normalizing and validating data', context);
    
    // Helper function to normalize blog URLs to absolute URLs
    const normalizeBlogUrl = (url: string, baseUrl: string): string => {
      if (!url || !url.trim()) return '';
      const trimmedUrl = url.trim();
      
      // If already absolute URL, return as is
      if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        return trimmedUrl;
      }
      
      // If relative URL, construct absolute URL
      if (trimmedUrl.startsWith('/')) {
        try {
          const base = new URL(baseUrl);
          return new URL(trimmedUrl, base.origin).href;
        } catch (e) {
          return trimmedUrl;
        }
      }
      
      // If relative path without leading slash, add it
      try {
        const base = new URL(baseUrl);
        return new URL('/' + trimmedUrl, base.origin).href;
      } catch (e) {
        return trimmedUrl;
      }
    };
    
    const baseWebsiteUrl = parsedData.website || websiteUrl || '';
    const normalizedBlogs = Array.isArray(parsedData.blogs) 
      ? parsedData.blogs.map(blog => ({
          title: blog.title || '',
          url: normalizeBlogUrl(blog.url || '', baseWebsiteUrl),
          date: blog.date || ''
        }))
      : [];
    
    const normalizedData: GeminiResponse = {
      company: parsedData.company || clientName || '',
      website: parsedData.website || websiteUrl || '',
      industry: parsedData.industry || '',
      description: parsedData.description || '',
      founded: parsedData.founded || '',
      companySize: parsedData.companySize || '',
      employeeCount: parsedData.employeeCount || '',
      annualRevenue: parsedData.annualRevenue || '',
      city: parsedData.city || '',
      country: parsedData.country || '',
      zipCode: parsedData.zipCode || '',
      linkedinUrl: parsedData.linkedinUrl || linkedinUrl || '',
      twitterUrl: parsedData.twitterUrl || '',
      facebookUrl: parsedData.facebookUrl || '',
      instagramUrl: parsedData.instagramUrl || '',
      contactName: parsedData.contactName || '',
      primaryEmail: parsedData.primaryEmail || '',
      primaryPhone: parsedData.primaryPhone || '',
      jobTitle: parsedData.jobTitle || '',
      services: Array.isArray(parsedData.services) ? parsedData.services : [],
      technologies: Array.isArray(parsedData.technologies) ? parsedData.technologies : [],
      painPoints: Array.isArray(parsedData.painPoints) ? parsedData.painPoints : [],
      competitors: Array.isArray(parsedData.competitors) ? parsedData.competitors : [],
      blogs: normalizedBlogs,
      shortTermGoals: parsedData.shortTermGoals || '',
      longTermGoals: parsedData.longTermGoals || '',
    };

    // Step 9: Calculate completeness
    logger.step('CALCULATE', 'Calculating completeness score', context);
    const fields = Object.keys(normalizedData);
    const populatedFields = fields.filter(key => {
      const value = normalizedData[key as keyof GeminiResponse];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== null && value !== undefined;
    });
    const completenessScore = Math.round((populatedFields.length / fields.length) * 100);

    logger.info('Data normalization complete', context, { 
      completenessScore: `${completenessScore}%`,
      populatedFields: populatedFields.length,
      totalFields: fields.length,
      servicesCount: normalizedData.services.length,
      technologiesCount: normalizedData.technologies.length,
      blogsCount: normalizedData.blogs.length,
    });

    const totalDuration = Date.now() - startTime;
    logger.endFlow('GEMINI CLIENT ENRICHMENT', context, {
      duration: `${totalDuration}ms`,
      completenessScore: `${completenessScore}%`,
      apiDuration: `${apiDuration}ms`
    });

    return new Response(
      JSON.stringify({
        success: true,
        model: 'gemini',
        data: normalizedData,
        metadata: {
          completenessScore,
          populatedFields: populatedFields.length,
          totalFields: fields.length,
          processingTime: totalDuration,
          apiTime: apiDuration,
          timestamp: new Date().toISOString(),
          tokenUsage: geminiData.usageMetadata,
          model: modelName
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error('Enrichment failed', context, { 
      error: error.message,
      stack: error.stack,
      duration: `${totalDuration}ms`
    });

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
        model: 'gemini',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

