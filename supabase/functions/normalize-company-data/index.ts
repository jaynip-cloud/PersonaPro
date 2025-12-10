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
  linkedinUrl: string;
}

interface CompanyProfileResponse {
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
  email: string;
  phone: string;
  address: string;
  linkedinUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
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

interface VerificationReport {
  confidenceScore: number;
  verifiedFields: string[];
  flaggedFields: Array<{
    field: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  verificationReport: string;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let context: LogContext = { functionName: 'normalize-company-data' };

  logger.startFlow('COMPANY DATA NORMALIZATION WITH VERIFICATION', context);

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
    const { companyName, website, linkedinUrl } = body;

    if (!companyName || !website || !linkedinUrl) {
      logger.error('Missing required fields', context, { body });
      return new Response(
        JSON.stringify({ error: 'companyName, website, and linkedinUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.companyName = companyName;
    logger.info('Request validated', context, { companyName, website, linkedinUrl });

    // Step 3: Get API keys
    logger.step('CONFIG', 'Retrieving API keys', context);
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!perplexityApiKey) {
      logger.error('PERPLEXITY_API_KEY not found', context);
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openaiApiKey) {
      logger.error('OPENAI_API_KEY not found', context);
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.success('API keys retrieved', context);

    // Step 4: Call Perplexity API to fetch company data
    logger.step('PERPLEXITY_FETCH', 'Fetching company data from Perplexity', context);
    const perplexityPrompt = `You are an expert business intelligence analyst specializing in comprehensive company profile data extraction. Your mission is to extract EVERY available piece of information about this company using web search, website analysis, and public data sources.

COMPANY INFORMATION:
- Company Name: ${companyName}
- Website: ${website}
- LinkedIn URL: ${linkedinUrl}

🚨 CRITICAL EXTRACTION REQUIREMENTS - BE EXTREMELY THOROUGH 🚨

**SEARCH STRATEGY - YOU MUST:**
1. Perform MULTIPLE web searches for each category of information
2. Visit the company website directly and crawl ALL pages (About, Contact, Team, Services, Blog, Careers, Partners, Technology)
3. Search LinkedIn company page thoroughly (People section, Posts, About section, Jobs)
4. Search for company news articles, press releases, and industry publications
5. Search for company profiles on Crunchbase, Glassdoor, Indeed, and other business directories
6. Search for individual leadership team members on LinkedIn, company website, and news articles
7. Search for company blog posts, articles, case studies, and resources
8. Search for technology mentions in job postings, case studies, and partner pages

1. BASIC COMPANY INFORMATION (MANDATORY - EXTRACT ALL):
   - Official company name (exact as shown on website/LinkedIn)
   - Industry/sector (specific, not generic)
   - Comprehensive company description (3-5 sentences minimum about what they do, their market position, key differentiators)
   - Value proposition (what makes them unique, key benefits they offer)
   - Year founded (YYYY format) - search company history, about page, LinkedIn, Crunchbase
   - Company size (e.g., "50-200 employees", "1000+ employees") - search LinkedIn, Glassdoor, company website
   - Full location (City, State/Province, Country format) - search contact page, LinkedIn, Google Maps
   - Mission statement (MANDATORY - search about page, values page, company culture page, LinkedIn About section)
   - Vision statement (MANDATORY - search about page, values page, company culture page, LinkedIn About section)

2. CONTACT INFORMATION (MANDATORY - EXTRACT FROM WEBSITE DIRECTLY):
   - Primary email address (MANDATORY - MUST be extracted from website. Search contact page, footer, header, about page, careers page, every page footer. Look for: contact@, info@, hello@, sales@, support@, careers@, press@, inquiries@. Check HTML source, footer links, contact forms, "Get in touch" sections. If email exists on website, you MUST find it.)
   - Primary phone number (MANDATORY - MUST be extracted from website. Search contact page, footer, header, about page, every page footer. Check HTML source, footer text, "Call us" sections, contact forms. Look for phone numbers in any format. If phone exists on website, you MUST find it.)
   - Full physical address (MANDATORY - street address, city, state/province, country, ZIP/postal code - search contact page, footer, about page, Google Maps, business directories)

3. SOCIAL MEDIA PROFILES (MANDATORY - EXTRACT ALL THAT EXIST):
   - LinkedIn company page URL (already provided: ${linkedinUrl} - verify and extract)
   - Twitter/X profile URL (search website footer, header, social media sections, company posts, news articles)
   - Facebook page URL (search website footer, header, social media sections, company posts)
   - Instagram profile URL (search website footer, header, social media sections, company posts)
   - YouTube channel URL (search website footer, header, social media sections, company posts)
   - CRITICAL: If ANY social media profile exists, you MUST extract the FULL URL. Do NOT leave empty if profiles exist.

4. SERVICES/PRODUCTS (COMPREHENSIVE - EXTRACT ALL):
   - Visit services, products, solutions, offerings, capabilities, or solutions pages
   - Extract ALL services/products offered (minimum 5-10 if available, or ALL if fewer)
   - For each service/product, extract:
     * Name (clear, specific service name)
     * Description (detailed 2-3 sentences about what it does, key features, benefits)
     * Optional: Tags (relevant keywords/categories)
     * Optional: Pricing information (if publicly available)

5. LEADERSHIP TEAM (COMPREHENSIVE - EXTRACT ALL MEMBERS WITH FULL DETAILS):
   - Search team page, about page, leadership page, executive team page, company website
   - Extract ALL leadership members, executives, founders, key decision makers
   - For each person, extract:
     * Full name (as shown on website)
     * Job title/role (exact title)
     * Bio (MANDATORY - 2-3 sentences about their background, experience - search company bio page, news articles, about page)
     * LinkedIn profile URL (DO NOT EXTRACT - leave empty string "")
     * Email (if publicly available on website - search contact pages, team pages, press releases)
     * Experience (MANDATORY - key career highlights, previous roles - search company bio, news articles, about page)
     * Education (if mentioned - search company bio, news articles)
     * Skills (relevant skills/expertise if mentioned - search company bio)
   - Minimum 3-10 leadership members if available
   - Focus on: CEO, CTO, CFO, COO, Founders, VPs, Directors, Heads of departments
   - CRITICAL: 
     * DO NOT extract LinkedIn profile URLs for leadership members - leave linkedinUrl as empty string ""
     * For each leadership member found, you MUST extract their bio and experience. Do NOT leave these fields empty if the person exists.

6. BLOG ARTICLES (MANDATORY - EXTRACT ALL BLOG POSTS FROM WEBSITE):
   - MANDATORY: Visit and search ALL blog-related sections on the website:
     * website.com/blog
     * website.com/articles
     * website.com/news
     * website.com/insights
     * website.com/resources
     * website.com/thought-leadership
     * website.com/posts
     * website.com/stories
     * website.com/updates
     * Check website sitemap for blog URLs
     * Search for any page with "blog", "article", "news", "post" in the URL
   - Extract ALL blog posts found (minimum 10-15 if available, or ALL if fewer)
   - For each blog post, extract:
     * Title (exact headline)
     * FULL absolute URL (MUST start with https:// or http:// - convert relative URLs to absolute)
     * Publication date (any format - extract from post metadata, page source, or visible date)
     * Summary (1-2 sentence summary of article content - read the first paragraph or excerpt)
     * Author name (if mentioned - check author section, byline, or post metadata)
   - CRITICAL: 
     * Blog URLs MUST be complete absolute URLs. If relative URL found (e.g., "/blog/post-title"), convert to full URL (e.g., "https://${website}/blog/post-title")
     * If blog section exists on website, you MUST extract blog posts. Do NOT return empty array if blog exists.
     * Search website HTML source, sitemap, and all navigation links for blog posts.
     * Extract blog posts even if they don't have all metadata (date, summary, author) - if title and URL exist, include them.

7. TECHNOLOGY STACK (COMPREHENSIVE - EXTRACT ALL TECHNOLOGIES):
   - Search technology page, about page, careers/jobs page (tech requirements), partners page, case studies, solutions pages
   - Extract ALL technologies, frameworks, tools, platforms used:
     * Programming languages (JavaScript, Python, Java, Go, etc.)
     * Frameworks (React, Vue, Angular, Node.js, Django, Rails, etc.)
     * Databases (PostgreSQL, MySQL, MongoDB, Redis, etc.)
     * Cloud platforms (AWS, Azure, Google Cloud, etc.)
     * DevOps tools (Docker, Kubernetes, Jenkins, etc.)
     * Analytics tools (Google Analytics, Mixpanel, etc.)
     * APIs and integrations mentioned
   - Minimum 10-15 technologies if available
   - Also extract:
     * Technology partners (companies they partner with for tech - search partners page, case studies, press releases)
     * Integrations (third-party platforms/services they integrate with - search integrations page, API docs, solutions pages)

🔴 STRICT EXTRACTION RULES:
- Extract ONLY factual, verifiable information
- Use MULTIPLE web searches to find the most current information
- Prioritize official company website and LinkedIn, but also search other sources
- If information is not found after thorough search, use empty string "" or empty array []
- DO NOT guess or infer information
- DO NOT use placeholder or example data
- For URLs: Always extract FULL absolute URLs (starting with http:// or https://)
- For arrays: Include ALL items found, not just a few
- For leadership: If you find a person's name and role, you MUST search for their bio, experience, and LinkedIn URL - do not leave these empty

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
          "linkedinUrl": "",
          "email": "Email if publicly available on website",
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

    const perplexityStartTime = Date.now();
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
            content: 'You are an expert business intelligence analyst specializing in comprehensive company profile data extraction. Extract ALL available company information and return ONLY valid JSON. No markdown, no explanations, just JSON. CRITICAL INSTRUCTIONS: 1) Extract email and phone number DIRECTLY from the website - they are usually in footer, contact page, or header. If they exist on website, you MUST find them. 2) DO NOT extract LinkedIn profile URLs for leadership team members - leave linkedinUrl as empty string "" for all leadership entries. 3) Extract ALL blog posts from website - search blog sections thoroughly, check sitemap, and extract all posts found. If blog exists, you MUST extract posts. 4) Be EXTREMELY thorough: extract ALL contact information (email, phone, address), ALL social media URLs, ALL services/products, ALL leadership team members with bio and experience (but NO LinkedIn URLs), ALL blog posts, and ALL technologies used. Always return FULL absolute URLs for blogs and social media.'
          },
          {
            role: 'user',
            content: perplexityPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    const perplexityDuration = Date.now() - perplexityStartTime;
    logger.apiResponse('Perplexity', perplexityResponse.status, perplexityDuration, context, {
      model: 'sonar'
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      logger.error('Perplexity API error', context, { 
        status: perplexityResponse.status, 
        error: errorText 
      });
      throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`);
    }

    // Step 5: Parse Perplexity response
    logger.step('PARSE_PERPLEXITY', 'Parsing Perplexity response', context);
    const perplexityData = await perplexityResponse.json();
    let perplexityText = perplexityData.choices[0]?.message?.content || '';
    perplexityText = perplexityText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let perplexityParsedData: any;
    try {
      perplexityParsedData = JSON.parse(perplexityText);
      logger.success('Perplexity JSON parsed successfully', context);
    } catch (parseError) {
      logger.error('Perplexity JSON parse error', context, { 
        error: parseError, 
        responseText: perplexityText.substring(0, 500) 
      });
      throw new Error(`Failed to parse Perplexity JSON response: ${parseError}`);
    }

    // Step 6: Send to GPT for cleaning, standardization, and verification
    logger.step('GPT_PROCESSING', 'Sending data to GPT for cleaning, standardization, and verification', context);
    
    const gptPrompt = `You are an expert data quality analyst specializing in cleaning, standardizing, and verifying company profile data. Your task is to:

1. **CLEAN** the data (PRESERVE ALL VALID DATA):
   - Remove ONLY true duplicates (exact duplicates of services, leadership members, blog posts)
   - Remove ONLY invalid entries (entries with completely empty required fields like name="", or clearly malformed data)
   - Remove ONLY placeholder or example data (e.g., "Example Company", "John Doe", "example@email.com")
   - PRESERVE all valid data even if some fields are empty (e.g., if a leadership member has name and role but no bio, KEEP them)
   - DO NOT remove entries just because some optional fields are empty
   - For leadership: If name and role exist, KEEP the entry even if bio, email, experience, education, skills, or linkedinUrl are empty
   - For blogs: If title and url exist, KEEP the entry even if date, summary, or author are empty
   - For services: If name exists, KEEP the entry even if description, tags, or pricing are empty

2. **STANDARDIZE** the data (PRESERVE ALL EXTRACTED INFORMATION):
   - Format dates consistently (YYYY-MM-DD or YYYY format, but preserve original if format is unclear)
   - Ensure all URLs are absolute URLs (starting with http:// or https://) - convert relative URLs to absolute
   - Format phone numbers consistently (international format with country code if available)
   - Normalize email addresses (lowercase, remove spaces, but preserve original if valid)
   - Standardize company size format (e.g., "50-200 employees")
   - Ensure location format is consistent (City, State/Province, Country)
   - PRESERVE all extracted information - do not remove fields just because they don't match a format

3. **VERIFY** the data (FLAG ISSUES BUT PRESERVE DATA):
   - Verify company name matches the provided inputs (${companyName})
   - Validate that website URL (${website}) matches the extracted website
   - Validate that LinkedIn URL (${linkedinUrl}) matches the extracted LinkedIn URL
   - Check email domains match the company website domain (flag if different, but preserve if valid format)
   - Verify phone numbers are in valid format (flag if invalid, but preserve if valid)
   - Flag any inconsistencies between different data sources
   - Verify URLs are accessible/real (check format, not actual accessibility)
   - Cross-check data consistency (e.g., location consistency across fields)
   - PRESERVE all data even if verification flags issues - only remove clearly invalid data

**ORIGINAL INPUT DATA:**
- Company Name: ${companyName}
- Website: ${website}
- LinkedIn URL: ${linkedinUrl}

**PERPLEXITY EXTRACTED DATA:**
${JSON.stringify(perplexityParsedData, null, 2)}

**YOUR TASKS:**
1. Clean the data (remove duplicates, invalid entries)
2. Standardize all fields (format dates, URLs, phone numbers, emails)
3. Verify accuracy against original inputs
4. Flag any suspicious or inconsistent data
5. Return cleaned, standardized, and verified data

Return ONLY valid JSON in this EXACT structure:

{
  "data": {
    "companyName": "Cleaned and verified company name",
    "website": "Standardized website URL",
    "industry": "Standardized industry",
    "description": "Cleaned description",
    "valueProposition": "Cleaned value proposition",
    "founded": "YYYY format",
    "location": "City, State/Province, Country",
    "size": "Standardized size format",
    "mission": "Cleaned mission",
    "vision": "Cleaned vision",
    "email": "Normalized email (lowercase)",
    "phone": "International format phone",
    "address": "Standardized address",
    "linkedinUrl": "Absolute URL",
    "twitterUrl": "Absolute URL or empty",
    "facebookUrl": "Absolute URL or empty",
    "instagramUrl": "Absolute URL or empty",
    "youtubeUrl": "Absolute URL or empty",
    "services": [
      {
        "id": "service-id",
        "name": "Service name",
        "description": "Service description",
        "tags": ["tag1", "tag2"],
        "pricing": "Pricing if available"
      }
    ],
    "leadership": [
      {
        "id": "leader-id",
        "name": "Full name",
        "role": "Job title",
        "bio": "Bio",
        "linkedinUrl": "",
        "email": "Normalized email or empty",
        "experience": "Experience or empty",
        "education": "Education or empty",
        "skills": ["skill1", "skill2"]
      }
    ],
    "blogs": [
      {
        "id": "blog-id",
        "title": "Blog title",
        "url": "Absolute URL",
        "date": "YYYY-MM-DD or YYYY",
        "summary": "Summary",
        "author": "Author or empty"
      }
    ],
    "technology": {
      "stack": ["Tech1", "Tech2"],
      "partners": ["Partner1", "Partner2"],
      "integrations": ["Integration1", "Integration2"]
    }
  },
  "verification": {
    "confidenceScore": 85,
    "verifiedFields": ["companyName", "website", "email"],
    "flaggedFields": [
      {
        "field": "phone",
        "reason": "Phone number format inconsistent",
        "severity": "low"
      }
    ],
    "verificationReport": "Detailed verification report explaining what was verified, what was flagged, and overall data quality assessment (3-4 sentences)"
  }
}

CRITICAL: Return ONLY the JSON object. No markdown formatting, no explanations, no additional text. Just pure JSON.`;

    const gptStartTime = Date.now();
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert data quality analyst. Clean, standardize, and verify company profile data. Return ONLY valid JSON. No markdown, no explanations, just JSON.'
          },
          {
            role: 'user',
            content: gptPrompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 16000,
      }),
    });

    const gptDuration = Date.now() - gptStartTime;
    logger.apiResponse('OpenAI', gptResponse.status, gptDuration, context, {
      model: 'gpt-4o',
      purpose: 'cleaning_standardization_verification'
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      logger.error('OpenAI API error', context, { 
        status: gptResponse.status, 
        error: errorText 
      });
      throw new Error(`OpenAI API error: ${gptResponse.status} - ${errorText}`);
    }

    // Step 7: Parse GPT response
    logger.step('PARSE_GPT', 'Parsing GPT response', context);
    const gptData = await gptResponse.json();
    let gptText = gptData.choices[0]?.message?.content || '';
    gptText = gptText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let gptParsedData: any;
    try {
      gptParsedData = JSON.parse(gptText);
      logger.success('GPT JSON parsed successfully', context);
    } catch (parseError) {
      logger.error('GPT JSON parse error', context, { 
        error: parseError, 
        responseText: gptText.substring(0, 500) 
      });
      throw new Error(`Failed to parse GPT JSON response: ${parseError}`);
    }

    // Step 8: Final normalization and validation
    logger.step('FINAL_NORMALIZE', 'Final normalization and validation', context);
    
    const normalizedData: CompanyProfileResponse = {
      companyName: gptParsedData.data?.companyName || companyName || '',
      website: gptParsedData.data?.website || website || '',
      industry: gptParsedData.data?.industry || '',
      description: gptParsedData.data?.description || '',
      valueProposition: gptParsedData.data?.valueProposition || '',
      founded: gptParsedData.data?.founded || '',
      location: gptParsedData.data?.location || '',
      size: gptParsedData.data?.size || '',
      mission: gptParsedData.data?.mission || '',
      vision: gptParsedData.data?.vision || '',
      email: gptParsedData.data?.email || '',
      phone: gptParsedData.data?.phone || '',
      address: gptParsedData.data?.address || '',
      linkedinUrl: gptParsedData.data?.linkedinUrl || linkedinUrl || '',
      twitterUrl: gptParsedData.data?.twitterUrl || '',
      facebookUrl: gptParsedData.data?.facebookUrl || '',
      instagramUrl: gptParsedData.data?.instagramUrl || '',
      youtubeUrl: gptParsedData.data?.youtubeUrl || '',
      services: Array.isArray(gptParsedData.data?.services) 
        ? gptParsedData.data.services.map((s: any, index: number) => ({
            id: s.id || `service-${Date.now()}-${index}`,
            name: s.name || '',
            description: s.description || '',
            tags: Array.isArray(s.tags) ? s.tags : [],
            pricing: s.pricing || ''
          }))
        : [],
      leadership: Array.isArray(gptParsedData.data?.leadership)
        ? gptParsedData.data.leadership.map((l: any, index: number) => ({
            id: l.id || `leader-${Date.now()}-${index}`,
            name: l.name || '',
            role: l.role || '',
            bio: l.bio || '',
            linkedinUrl: '', // Always empty - do not extract LinkedIn profile URLs
            email: l.email || '',
            experience: l.experience || '',
            education: l.education || '',
            skills: Array.isArray(l.skills) ? l.skills : []
          }))
        : [],
      blogs: Array.isArray(gptParsedData.data?.blogs)
        ? gptParsedData.data.blogs.map((b: any, index: number) => ({
            id: b.id || `blog-${Date.now()}-${index}`,
            title: b.title || '',
            url: b.url || '',
            date: b.date || '',
            summary: b.summary || '',
            author: b.author || ''
          }))
        : [],
      technology: {
        stack: Array.isArray(gptParsedData.data?.technology?.stack) 
          ? gptParsedData.data.technology.stack 
          : [],
        partners: Array.isArray(gptParsedData.data?.technology?.partners)
          ? gptParsedData.data.technology.partners
          : [],
        integrations: Array.isArray(gptParsedData.data?.technology?.integrations)
          ? gptParsedData.data.technology.integrations
          : []
      }
    };

    const verification: VerificationReport = {
      confidenceScore: gptParsedData.verification?.confidenceScore || 0,
      verifiedFields: Array.isArray(gptParsedData.verification?.verifiedFields)
        ? gptParsedData.verification.verifiedFields
        : [],
      flaggedFields: Array.isArray(gptParsedData.verification?.flaggedFields)
        ? gptParsedData.verification.flaggedFields
        : [],
      verificationReport: gptParsedData.verification?.verificationReport || 'Verification completed'
    };

    // Calculate completeness score
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
    
    const totalFields = 10 + 3 + 5 + 6;
    const populatedFields = populatedBasicFields + populatedContactFields + populatedSocialFields +
      (hasServices ? 1 : 0) + (hasLeadership ? 1 : 0) + (hasBlogs ? 1 : 0) +
      (hasTechStack ? 1 : 0) + (hasPartners ? 1 : 0) + (hasIntegrations ? 1 : 0);
    
    const completenessScore = Math.round((populatedFields / totalFields) * 100);

    logger.info('Data normalization complete', context, { 
      completenessScore: `${completenessScore}%`,
      confidenceScore: `${verification.confidenceScore}%`,
      verifiedFieldsCount: verification.verifiedFields.length,
      flaggedFieldsCount: verification.flaggedFields.length,
      servicesCount: normalizedData.services.length,
      leadershipCount: normalizedData.leadership.length,
      blogsCount: normalizedData.blogs.length,
      techStackCount: normalizedData.technology.stack.length,
    });

    const totalDuration = Date.now() - startTime;
    logger.endFlow('COMPANY DATA NORMALIZATION WITH VERIFICATION', context, {
      duration: `${totalDuration}ms`,
      perplexityDuration: `${perplexityDuration}ms`,
      gptDuration: `${gptDuration}ms`,
      completenessScore: `${completenessScore}%`,
      confidenceScore: `${verification.confidenceScore}%`
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: normalizedData,
        verification: verification,
        metadata: {
          completenessScore,
          confidenceScore: verification.confidenceScore,
          populatedFields,
          totalFields,
          processingTime: totalDuration,
          perplexityTime: perplexityDuration,
          gptTime: gptDuration,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    logger.error('Normalization failed', context, { 
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

