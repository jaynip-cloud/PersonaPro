import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logger, LogContext } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  companyName: string;
  website: string;
  linkedinUrl?: string;
  industry?: string; // Optional for backward compatibility
}

interface CompanyProfileResponse {
  // Basic Company Info
  companyName: string;
  website: string;
  industry: string;
  description: string;
  valueProposition: string;
  founded: string;
  location: string;
  size: string;
  mission: string;
  vision: string;
  
  // Contact Info
  email: string;
  phone: string;
  address: string;
  
  // Social Profiles
  linkedinUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  
  // Complex Data (JSONB)
  services: Array<{
    id?: string;
    name: string;
    description: string;
    tags?: string[];
    pricing?: string;
  }>;
  leadership: Array<{
    id?: string;
    name: string;
    role: string;
    bio: string;
    linkedinUrl?: string;
    email?: string;
    experience?: string;
    education?: string;
    skills?: string[];
  }>;
  blogs: Array<{
    id?: string;
    title: string;
    url: string;
    date: string;
    summary: string;
    author: string;
  }>;
  technology: {
    stack: string[];
    partners: string[];
    integrations: string[];
  };
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let context: LogContext = { functionName: 'enrich-company-perplexity' };

  logger.startFlow('PERPLEXITY COMPANY PROFILE ENRICHMENT', context);

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
    const { companyName, website, linkedinUrl, industry } = body;

    if (!companyName || !website || (!linkedinUrl && !industry)) {
      logger.error('Missing required fields', context, { body });
      return new Response(
        JSON.stringify({ error: 'companyName, website, and either linkedinUrl or industry are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.companyName = companyName;
    logger.info('Request validated', context, { companyName, website, linkedinUrl, industry });

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

    // Step 4: Construct comprehensive prompt
    logger.step('PROMPT', 'Constructing comprehensive AI prompt', context);
    const prompt = `You are an expert business intelligence analyst specializing in comprehensive company profile data extraction. Your mission is to extract EVERY available piece of information about this company using web search, website analysis, and public data sources.

COMPANY INFORMATION:
- Company Name: ${companyName}
- Website: ${website}
${linkedinUrl ? `- LinkedIn URL: ${linkedinUrl}` : ''}
${industry ? `- Industry: ${industry}` : ''}

🚨 CRITICAL EXTRACTION REQUIREMENTS - BE EXTREMELY THOROUGH 🚨

1. BASIC COMPANY INFORMATION (MANDATORY - EXTRACT ALL):
   - Official company name (exact as shown on website/LinkedIn)
   - Industry/sector (specific, not generic)
   - Comprehensive company description (3-5 sentences minimum about what they do, their market position, key differentiators)
   - Value proposition (what makes them unique, key benefits they offer)
   - Year founded (YYYY format)
   - Company size (e.g., "50-200 employees", "1000+ employees")
   - Full location (City, State/Province, Country format)
   - Mission statement (if available on website/about page)
   - Vision statement (if available on website/about page)

2. CONTACT INFORMATION (MANDATORY - SEARCH THOROUGHLY):
   - Primary email address (search contact page, footer, about page - look for contact@, info@, hello@, sales@)
   - Primary phone number (with country code if available - search contact page, footer)
   - Full physical address (street address, city, state/province, country, ZIP/postal code - search contact page, footer, about page)

3. SOCIAL MEDIA PROFILES (MANDATORY - EXTRACT ALL THAT EXIST):
   - LinkedIn company page URL (search website footer, header, about page, contact page)
   - Twitter/X profile URL (search website footer, header, social media sections)
   - Facebook page URL (search website footer, header, social media sections)
   - Instagram profile URL (search website footer, header, social media sections)
   - YouTube channel URL (search website footer, header, social media sections)
   - CRITICAL: If ANY social media profile exists, you MUST extract the FULL URL. Do NOT leave empty if profiles exist.

4. SERVICES/PRODUCTS (COMPREHENSIVE - EXTRACT ALL):
   - Visit services, products, solutions, or offerings pages
   - Extract ALL services/products offered (minimum 5-10 if available)
   - For each service/product, extract:
     * Name (clear, specific service name)
     * Description (detailed 2-3 sentences about what it does, key features, benefits)
     * Optional: Tags (relevant keywords/categories)
     * Optional: Pricing information (if publicly available)

5. LEADERSHIP TEAM (COMPREHENSIVE - EXTRACT ALL MEMBERS):
   - Search team page, about page, leadership page, LinkedIn company "People" section
   - Extract ALL leadership members, executives, founders, key decision makers
   - For each person, extract:
     * Full name (as shown on website/LinkedIn)
     * Job title/role (exact title)
     * Bio (2-3 sentences about their background, experience)
     * LinkedIn profile URL (if available)
     * Email (if publicly available)
     * Experience (key career highlights if available)
     * Education (if mentioned)
     * Skills (relevant skills/expertise if mentioned)
   - Minimum 3-10 leadership members if available
   - Focus on: CEO, CTO, CFO, COO, Founders, VPs, Directors, Heads of departments

6. BLOG ARTICLES (COMPREHENSIVE - EXTRACT ALL RECENT POSTS):
   - Visit blog section (website.com/blog, website.com/articles, website.com/news, website.com/insights)
   - Extract ALL or MANY recent blog posts (minimum 10-15 if available, or ALL if fewer)
   - For each blog post, extract:
     * Title (exact headline)
     * FULL absolute URL (MUST start with https:// or http:// - convert relative URLs to absolute)
     * Publication date (any format)
     * Summary (1-2 sentence summary of article content)
     * Author name (if mentioned)
   - CRITICAL: Blog URLs MUST be complete absolute URLs. If relative URL found (e.g., "/blog/post-title"), convert to full URL (e.g., "https://${website}/blog/post-title")

7. TECHNOLOGY STACK (COMPREHENSIVE - EXTRACT ALL TECHNOLOGIES):
   - Search technology page, about page, careers/jobs page (tech requirements), partners page
   - Extract ALL technologies, frameworks, tools, platforms used:
     * Programming languages (JavaScript, Python, Java, Go, etc.)
     * Frameworks (React, Vue, Angular, Node.js, Django, Rails, etc.)
     * Databases (PostgreSQL, MySQL, MongoDB, Redis, etc.)
     * Cloud platforms (AWS, Azure, Google Cloud, etc.)
     * DevOps tools (Docker, Kubernetes, Jenkins, etc.)
     * Analytics tools (Google Analytics, Mixpanel, etc.)
   - Minimum 10-15 technologies if available
   - Also extract:
     * Technology partners (companies they partner with for tech)
     * Integrations (third-party platforms/services they integrate with)

8. ADDITIONAL DATA (IF AVAILABLE):
   - Recent news/press releases about the company
   - Awards or recognition
   - Key partnerships
   - Market position information

🔴 STRICT EXTRACTION RULES:
- Extract ONLY factual, verifiable information
- Use web search to find the most current information
- Prioritize official company website and LinkedIn
- If information is not found after thorough search, use empty string "" or empty array []
- DO NOT guess or infer information
- DO NOT use placeholder or example data
- For URLs: Always extract FULL absolute URLs (starting with http:// or https://)
- For arrays: Include ALL items found, not just a few

Return ONLY valid JSON in this EXACT structure (use empty strings or empty arrays if information is not available):

{
  "companyName": "Full official company name",
  "website": "Website URL",
  "industry": "Specific industry/sector",
  "description": "Comprehensive 3-5 sentence company description",
  "valueProposition": "What makes them unique, key value proposition",
  "founded": "Year founded in YYYY format",
  "location": "City, State/Province, Country",
  "size": "Company size (e.g., '50-200 employees')",
  "mission": "Mission statement if available",
  "vision": "Vision statement if available",
  "email": "Primary contact email (from contact page/footer)",
  "phone": "Primary phone number with country code if available",
  "address": "Full physical address: street, city, state, country, ZIP",
  "linkedinUrl": "Full LinkedIn company page URL",
  "twitterUrl": "Full Twitter/X profile URL",
  "facebookUrl": "Full Facebook page URL",
  "instagramUrl": "Full Instagram profile URL",
  "youtubeUrl": "Full YouTube channel URL",
  "services": [
    {
      "name": "Service/Product name",
      "description": "Detailed 2-3 sentence description",
      "tags": ["tag1", "tag2"],
      "pricing": "Pricing info if available"
    }
  ],
  "leadership": [
    {
      "name": "Full name",
      "role": "Job title/role",
      "bio": "2-3 sentence bio",
      "linkedinUrl": "LinkedIn profile URL if available",
      "email": "Email if publicly available",
      "experience": "Key experience highlights",
      "education": "Education if mentioned",
      "skills": ["skill1", "skill2"]
    }
  ],
  "blogs": [
    {
      "title": "Blog post title",
      "url": "FULL absolute URL (https://website.com/blog/post-title)",
      "date": "Publication date",
      "summary": "1-2 sentence summary",
      "author": "Author name if mentioned"
    }
  ],
  "technology": {
    "stack": ["Technology 1", "Technology 2", "Framework 1", "Database 1"],
    "partners": ["Partner Company 1", "Partner Company 2"],
    "integrations": ["Integration 1", "Integration 2", "Platform 1"]
  }
}

CRITICAL: Return ONLY the JSON object. No markdown formatting, no explanations, no additional text. Just pure JSON.`;

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
            content: 'You are an expert business intelligence analyst specializing in comprehensive company profile data extraction. Extract ALL available company information and return ONLY valid JSON. No markdown, no explanations, just JSON. CRITICAL: Be EXTREMELY thorough and comprehensive. Extract ALL available information including: complete company details, ALL contact information (email, phone, address), ALL social media URLs (LinkedIn, Twitter, Facebook, Instagram, YouTube), ALL services/products (5-10+ if available), ALL leadership team members (3-10+ if available), ALL blog posts (10-15+ if available), and ALL technologies used (10-15+ if available). Do NOT skip fields if the information exists - search more thoroughly. Always return FULL absolute URLs for blogs and social media.'
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
    
    let parsedData: any;
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
    
    // Helper function to normalize URLs to absolute URLs
    const normalizeUrl = (url: string, baseUrl: string): string => {
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
    
    const baseWebsiteUrl = parsedData.website || website || '';
    
    // Normalize blog URLs
    const normalizedBlogs = Array.isArray(parsedData.blogs) 
      ? parsedData.blogs.map((blog: any, index: number) => ({
          id: blog.id || `blog-${Date.now()}-${index}`,
          title: blog.title || '',
          url: normalizeUrl(blog.url || '', baseWebsiteUrl),
          date: blog.date || '',
          summary: blog.summary || '',
          author: blog.author || ''
        }))
      : [];
    
    // Normalize services
    const normalizedServices = Array.isArray(parsedData.services)
      ? parsedData.services.map((service: any, index: number) => ({
          id: service.id || `service-${Date.now()}-${index}`,
          name: service.name || '',
          description: service.description || '',
          tags: Array.isArray(service.tags) ? service.tags : [],
          pricing: service.pricing || ''
        }))
      : [];
    
    // Normalize leadership
    const normalizedLeadership = Array.isArray(parsedData.leadership)
      ? parsedData.leadership.map((leader: any, index: number) => ({
          id: leader.id || `leader-${Date.now()}-${index}`,
          name: leader.name || '',
          role: leader.role || '',
          bio: leader.bio || '',
          linkedinUrl: leader.linkedinUrl || '',
          email: leader.email || '',
          experience: leader.experience || '',
          education: leader.education || '',
          skills: Array.isArray(leader.skills) ? leader.skills : []
        }))
      : [];
    
    // Normalize technology
    const normalizedTechnology = {
      stack: Array.isArray(parsedData.technology?.stack) ? parsedData.technology.stack : [],
      partners: Array.isArray(parsedData.technology?.partners) ? parsedData.technology.partners : [],
      integrations: Array.isArray(parsedData.technology?.integrations) ? parsedData.technology.integrations : []
    };
    
    const normalizedData: CompanyProfileResponse = {
      companyName: parsedData.companyName || companyName || '',
      website: parsedData.website || website || '',
      industry: parsedData.industry || industry || '',
      description: parsedData.description || '',
      valueProposition: parsedData.valueProposition || '',
      founded: parsedData.founded || '',
      location: parsedData.location || '',
      size: parsedData.size || '',
      mission: parsedData.mission || '',
      vision: parsedData.vision || '',
      email: parsedData.email || '',
      phone: parsedData.phone || '',
      address: parsedData.address || '',
      linkedinUrl: normalizeUrl(parsedData.linkedinUrl || '', baseWebsiteUrl),
      twitterUrl: normalizeUrl(parsedData.twitterUrl || '', baseWebsiteUrl),
      facebookUrl: normalizeUrl(parsedData.facebookUrl || '', baseWebsiteUrl),
      instagramUrl: normalizeUrl(parsedData.instagramUrl || '', baseWebsiteUrl),
      youtubeUrl: normalizeUrl(parsedData.youtubeUrl || '', baseWebsiteUrl),
      services: normalizedServices,
      leadership: normalizedLeadership,
      blogs: normalizedBlogs,
      technology: normalizedTechnology,
    };

    // Step 9: Calculate completeness
    logger.step('CALCULATE', 'Calculating completeness score', context);
    
    // Define all fields to check
    const basicFields = [
      'companyName', 'website', 'industry', 'description', 'valueProposition',
      'founded', 'location', 'size', 'mission', 'vision'
    ];
    const contactFields = ['email', 'phone', 'address'];
    const socialFields = ['linkedinUrl', 'twitterUrl', 'facebookUrl', 'instagramUrl', 'youtubeUrl'];
    
    let populatedBasicFields = 0;
    basicFields.forEach(field => {
      const value = normalizedData[field as keyof CompanyProfileResponse];
      if (typeof value === 'string' && value.trim().length > 0) populatedBasicFields++;
    });
    
    let populatedContactFields = 0;
    contactFields.forEach(field => {
      const value = normalizedData[field as keyof CompanyProfileResponse];
      if (typeof value === 'string' && value.trim().length > 0) populatedContactFields++;
    });
    
    let populatedSocialFields = 0;
    socialFields.forEach(field => {
      const value = normalizedData[field as keyof CompanyProfileResponse];
      if (typeof value === 'string' && value.trim().length > 0) populatedSocialFields++;
    });
    
    const hasServices = normalizedData.services.length > 0;
    const hasLeadership = normalizedData.leadership.length > 0;
    const hasBlogs = normalizedData.blogs.length > 0;
    const hasTechStack = normalizedData.technology.stack.length > 0;
    const hasPartners = normalizedData.technology.partners.length > 0;
    const hasIntegrations = normalizedData.technology.integrations.length > 0;
    
    // Calculate weighted completeness
    const totalFields = 10 + 3 + 5 + 6; // basic + contact + social + complex
    const populatedFields = populatedBasicFields + populatedContactFields + populatedSocialFields +
      (hasServices ? 1 : 0) + (hasLeadership ? 1 : 0) + (hasBlogs ? 1 : 0) +
      (hasTechStack ? 1 : 0) + (hasPartners ? 1 : 0) + (hasIntegrations ? 1 : 0);
    
    const completenessScore = Math.round((populatedFields / totalFields) * 100);

    logger.info('Data normalization complete', context, { 
      completenessScore: `${completenessScore}%`,
      populatedFields,
      totalFields,
      servicesCount: normalizedData.services.length,
      leadershipCount: normalizedData.leadership.length,
      blogsCount: normalizedData.blogs.length,
      techStackCount: normalizedData.technology.stack.length,
    });

    const totalDuration = Date.now() - startTime;
    logger.endFlow('PERPLEXITY COMPANY PROFILE ENRICHMENT', context, {
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
          populatedFields,
          totalFields,
          processingTime: totalDuration,
          apiTime: apiDuration,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
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

