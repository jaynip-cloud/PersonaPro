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

interface PerplexityResponse {
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
  let context: LogContext = { functionName: 'enrich-client-perplexity' };

  logger.startFlow('PERPLEXITY CLIENT ENRICHMENT', context);

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

    // Step 3: Get API key
    logger.step('CONFIG', 'Retrieving API key', context);
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      logger.error('PERPLEXITY_API_KEY not found', context);
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
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
  "technologies": [{"name": "string", "category": "string"}], // Extract ALL technologies, frameworks, tools, platforms used by the company
  "painPoints": ["string - Business challenges"],
  "competitors": [{"name": "string", "comparison": "string"}], // Extract ALL major competitors in the same industry/market
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

    // Step 5: Call Perplexity API
    logger.step('API_CALL', 'Calling Perplexity API', context);
    logger.apiCall('Perplexity', 'POST', 'https://api.perplexity.ai/chat/completions', context);

    const apiStartTime = Date.now();
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${perplexityApiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence analyst. Extract company information and return ONLY valid JSON. No markdown, no explanations, just JSON. CRITICAL: Be EXTREMELY thorough and comprehensive. Extract ALL available information including: contact details (email, phone), ALL social media URLs (Twitter, Facebook, Instagram), ALL blog posts (10-15+ if available), ALL technologies used (10-15+ if available), ALL competitors (3-5+ if available), and complete address information. Do NOT skip fields if the information exists - search more thoroughly.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    const apiDuration = Date.now() - apiStartTime;
    logger.apiResponse('Perplexity', response.status, apiDuration, context, {
      model: 'sonar'
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Perplexity API error', context, { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    // Step 6: Parse response
    logger.step('PARSE_RESPONSE', 'Parsing API response', context);
    const perplexityData = await response.json();
    logger.debug('Raw API response received', context, { 
      choices: perplexityData.choices?.length,
      usage: perplexityData.usage 
    });

    let responseText = perplexityData.choices[0]?.message?.content || '';
    logger.debug('Extracted response text', context, { length: responseText.length });

    // Step 7: Clean and parse JSON
    logger.step('CLEAN_JSON', 'Cleaning and parsing JSON', context);
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let parsedData: PerplexityResponse;
    try {
      parsedData = JSON.parse(responseText);
      logger.success('JSON parsed successfully', context);
    } catch (parseError) {
      logger.error('JSON parse error', context, { 
        error: parseError, 
        responseText: responseText.substring(0, 500) 
      });
      throw new Error(`Failed to parse JSON response: ${parseError}`);
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
    
    const normalizedData: PerplexityResponse = {
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
      const value = normalizedData[key as keyof PerplexityResponse];
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
    logger.endFlow('PERPLEXITY CLIENT ENRICHMENT', context, {
      duration: `${totalDuration}ms`,
      completenessScore: `${completenessScore}%`,
      apiDuration: `${apiDuration}ms`
    });

    return new Response(
      JSON.stringify({
        success: true,
        model: 'perplexity',
        data: normalizedData,
        metadata: {
          completenessScore,
          populatedFields: populatedFields.length,
          totalFields: fields.length,
          processingTime: totalDuration,
          apiTime: apiDuration,
          timestamp: new Date().toISOString(),
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
        model: 'perplexity',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

