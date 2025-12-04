import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logger, LogContext } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

interface RequestBody {
  companyName: string;
  website: string;
  linkedinUrl?: string;
  industry?: string; // Optional for backward compatibility
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let context: LogContext = {
    functionName: 'enrich-company-openai'
  };
  logger.startFlow('OPENAI COMPANY PROFILE ENRICHMENT', context);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    logger.step('CORS', 'Handling preflight request', context);
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  
  try {
    // Step 1: Authentication
    logger.step('AUTH', 'Starting authentication', context);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('Missing authorization header', context);
      return new Response(JSON.stringify({
        error: 'Missing authorization header'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logger.error('Authentication failed', context, {
        error: userError
      });
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    context.userId = user.id;
    logger.success('User authenticated', context, {
      userId: user.id
    });
    
    // Step 2: Parse request
    logger.step('PARSE', 'Parsing request body', context);
    const body: RequestBody = await req.json();
    const { companyName, website, linkedinUrl, industry } = body;
    
    if (!companyName || !website || (!linkedinUrl && !industry)) {
      logger.error('Missing required fields', context, {
        body
      });
      return new Response(JSON.stringify({
        error: 'companyName, website, and either linkedinUrl or industry are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    context.companyName = companyName;
    logger.info('Request validated', context, {
      companyName,
      website,
      linkedinUrl,
      industry
    });
    
    // Step 3: Get API key
    logger.step('CONFIG', 'Retrieving API key', context);
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      logger.error('OPENAI_API_KEY not found', context);
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    logger.success('API key retrieved', context);
    
    // Step 4: Construct comprehensive prompt
    logger.step('PROMPT', 'Constructing comprehensive AI prompt', context);
    const prompt = `# ✅ **COMPREHENSIVE COMPANY PROFILE INTELLIGENCE EXTRACTION — GPT-4**

You are an expert business intelligence analyst with access to a comprehensive knowledge base about companies.

**YOUR MISSION:** Extract ALL available information about "${companyName}" from your knowledge base to create a complete company profile. Be THOROUGH and COMPREHENSIVE. Your goal is to achieve 80%+ field completion, not just 20%.

**Company Details:**
- Company Name: ${companyName}
- Website: ${website}
${linkedinUrl ? `- LinkedIn URL: ${linkedinUrl}` : ''}
${industry ? `- Industry: ${industry}` : ''}

---

# 🔍 **EXTRACTION STRATEGY**

## **1. USE YOUR KNOWLEDGE BASE ACTIVELY**

You have knowledge about "${companyName}" in your training data. You MUST:
- **Actively recall** information you know about this company
- **Extract comprehensively** - don't leave fields empty if you have the information
- **Use industry knowledge** that applies to this specific company
- **Combine multiple sources** of knowledge (website info, LinkedIn data, public records, industry knowledge)

**Balance:** Accuracy is important, but completeness is equally important. If you have reasonable knowledge about a field, extract it.

---

## **2. BASIC COMPANY INFORMATION (MANDATORY FIELDS)**

Extract ALL available basic information:

**Company Name & Identity:**
- Full official company name (use "${companyName}" if exact match, otherwise use what you know)
- Industry classification (be specific, not generic - use "${industry}" as reference)
- Comprehensive business description (3-5 sentences minimum if available)
- Value proposition (what makes them unique, key benefits they offer)

**Company History:**
- Founding year (if known, YYYY format)
- Company size category (e.g., "11-50 employees", "51-200 employees", "1000+ employees")
- Full location (City, State/Province, Country format)

**Mission & Vision:**
- Mission statement (if known from website, about page, or public information)
- Vision statement (if known from website, about page, or public information)

**Extraction Priority:** Use your knowledge base about "${companyName}" to find all basic information. If you know the company's details, extract them comprehensively.

---

## **3. CONTACT INFORMATION (COMPREHENSIVE EXTRACTION)**

**You MUST extract contact information if you have knowledge of it:**

**Primary Contact:**
- Primary email (contact@, info@, hello@, or main company email if known)
- Primary phone number (with country code if known)
- Full physical address (street address, city, state/province, country, ZIP/postal code if known)

**Extraction Priority:** Use your knowledge base about "${companyName}" to find contact information. If you know the company's contact details, extract them.

---

## **4. SOCIAL MEDIA PROFILES (ACTIVE EXTRACTION REQUIRED)**

**You MUST actively extract social media URLs if you have knowledge of them:**

**LinkedIn:**
- LinkedIn company page URL (if known)
- Extract FULL URL (e.g., "https://linkedin.com/company/companyname")

**Twitter/X:**
- Search your knowledge for Twitter/X profile
- Extract FULL URL (e.g., "https://twitter.com/companyname" or "https://x.com/companyname")
- Common patterns: twitter.com/company, x.com/company, @companyname

**Facebook:**
- Search your knowledge for Facebook page
- Extract FULL URL (e.g., "https://facebook.com/companyname")
- Common patterns: facebook.com/company, fb.com/company

**Instagram:**
- Search your knowledge for Instagram profile
- Extract FULL URL (e.g., "https://instagram.com/companyname")
- Common patterns: instagram.com/company, @companyname

**YouTube:**
- Search your knowledge for YouTube channel
- Extract FULL URL (e.g., "https://youtube.com/@companyname" or "https://youtube.com/c/companyname")

**CRITICAL:** If you have knowledge that "${companyName}" has social media profiles, you MUST extract them. Don't leave these fields empty if the profiles exist in your knowledge base.

---

## **5. SERVICES/PRODUCTS (COMPREHENSIVE EXTRACTION)**

**Extract ALL services "${companyName}" offers:**

**Extraction Requirements:**
- Extract services specific to this company
- Include services you know they provide
- Each service should have:
  - **name**: Service/product name (clear, specific)
  - **description**: Detailed 2-3 sentence description of what it does, key features, benefits
  - **tags**: Optional relevant keywords/categories
  - **pricing**: Optional pricing information if publicly available

**Extraction Strategy:**
- Use your knowledge about "${companyName}"'s offerings
- Check if you know their service portfolio
- Include industry-specific services if you know this company offers them
- Aim for 5-10+ services if available

**Don't leave empty if you know what services they offer.**

---

## **6. LEADERSHIP TEAM (COMPREHENSIVE EXTRACTION)**

**Extract ALL leadership members, executives, founders, key decision makers:**

**Extraction Requirements:**
- Extract leadership specific to this company
- Include executives you know from your knowledge base
- For each person, extract:
  - **name**: Full name (as shown on website/LinkedIn)
  - **role**: Job title/role (exact title - CEO, CTO, CFO, Founder, VP, Director, etc.)
  - **bio**: 2-3 sentence bio about their background, experience
  - **linkedinUrl**: LinkedIn profile URL if known
  - **email**: Email if publicly available
  - **experience**: Key career highlights if available
  - **education**: Education if mentioned
  - **skills**: Relevant skills/expertise if mentioned

**Extraction Strategy:**
- Use your knowledge about "${companyName}"'s leadership team
- Include founders, CEOs, CTOs, CFOs, VPs, Directors, Heads of departments
- Aim for 3-10+ leadership members if available
- Focus on decision makers and key executives

**Don't leave empty if you know their leadership team.**

---

## **7. BLOG ARTICLES (COMPREHENSIVE EXTRACTION)**

**If you have knowledge of blog content from "${companyName}":**

**Extraction Requirements:**
- Extract ALL blog posts you know about (aim for 10-15+ if available)
- For each blog post, extract:
  - **title**: Full blog post title
  - **url**: FULL absolute URL (construct using ${website} + blog path)
  - **date**: Publication date (any format if known)
  - **summary**: 1-2 sentence summary of article content
  - **author**: Author name if mentioned

**URL Construction Rules:**
- If website is "${website}" and blog path is "/blog/article", URL should be "${website}/blog/article"
- Always create FULL absolute URLs starting with "https://" or "http://"
- Never use relative URLs like "/blog/article"

**If you know "${companyName}" has a blog or publishes content, extract multiple posts (10-15+ if available).**

---

## **8. TECHNOLOGY STACK (COMPREHENSIVE EXTRACTION)**

**Extract ALL technologies "${companyName}" uses:**

**Technology Stack:**
- Extract technologies specific to this company
- Include ALL technologies you know they use:
  - Programming languages (JavaScript, Python, Java, Go, etc.)
  - Frameworks (React, Vue, Angular, Node.js, Django, Rails, etc.)
  - Databases (PostgreSQL, MySQL, MongoDB, Redis, etc.)
  - Cloud platforms (AWS, Azure, Google Cloud, etc.)
  - DevOps tools (Docker, Kubernetes, Jenkins, etc.)
  - Analytics tools (Google Analytics, Mixpanel, etc.)
  - CRM systems, marketing tools, etc.

**Technology Partners:**
- Companies they partner with for technology
- Technology vendors they work with

**Integrations:**
- Third-party platforms/services they integrate with
- APIs, tools, services they connect to

**Extraction Strategy:**
- Use your knowledge about "${companyName}"'s tech stack
- Include technologies mentioned in case studies, job postings, or public information
- Aim for 10-15+ technologies if available
- Don't leave empty if you know their tech stack

---

## **9. OUTPUT FORMAT — STRICT JSON**

Return **EXACTLY** the following JSON structure with NO additional text, NO markdown, NO explanations:

\`\`\`json
{
  "companyName": "",
  "website": "",
  "industry": "",
  "description": "",
  "valueProposition": "",
  "founded": "",
  "location": "",
  "size": "",
  "mission": "",
  "vision": "",
  "email": "",
  "phone": "",
  "address": "",
  "linkedinUrl": "",
  "twitterUrl": "",
  "facebookUrl": "",
  "instagramUrl": "",
  "youtubeUrl": "",
  "services": [
    {
      "name": "",
      "description": "",
      "tags": [],
      "pricing": ""
    }
  ],
  "leadership": [
    {
      "name": "",
      "role": "",
      "bio": "",
      "linkedinUrl": "",
      "email": "",
      "experience": "",
      "education": "",
      "skills": []
    }
  ],
  "blogs": [
    {
      "title": "",
      "url": "",
      "date": "",
      "summary": "",
      "author": ""
    }
  ],
  "technology": {
    "stack": [],
    "partners": [],
    "integrations": []
  }
}
\`\`\`

### Formatting Rules:
- Use empty strings \`""\` ONLY when you genuinely don't have the information
- Use empty arrays \`[]\` ONLY when you genuinely don't have the information
- All URLs MUST be full absolute URLs (starting with "https://" or "http://")
- Never use relative URLs
- Never use markdown formatting
- Return ONLY valid JSON

---

# 🎯 **FINAL INSTRUCTIONS**

**COMPLETENESS GOAL:** Achieve 80%+ field completion. Extract ALL available information from your knowledge base.

**EXTRACTION APPROACH:**
1. **Actively recall** information you know about "${companyName}"
2. **Extract comprehensively** - don't be overly cautious
3. **Use your knowledge base** - if you have information, extract it
4. **Balance accuracy with completeness** - both are important

**Company to extract:** ${companyName}
**Website:** ${website}
**Industry:** ${industry}

**Now extract ALL available information and return comprehensive JSON.`;

    logger.debug('Prompt constructed', context, {
      promptLength: prompt.length
    });
    
    // Step 5: Call OpenAI API
    logger.step('API_CALL', 'Calling OpenAI API', context);
    logger.apiCall('OpenAI', 'POST', 'https://api.openai.com/v1/chat/completions', context);
    
    const apiStartTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business intelligence analyst with comprehensive knowledge about companies. Your purpose is to extract ALL available information about companies from your knowledge base to create complete company profiles. You MUST be THOROUGH and COMPREHENSIVE - aim for 80%+ field completion. Use your knowledge base actively to recall information about companies. Balance accuracy with completeness - both are equally important. Extract information you know from your training data, industry knowledge, and public information. Your output MUST always be pure JSON, with no explanations, no surrounding text, and no markdown. Return strictly valid JSON with comprehensive data extraction.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: {
          type: 'json_object'
        },
        max_tokens: 4096
      })
    });
    
    const apiDuration = Date.now() - apiStartTime;
    logger.apiResponse('OpenAI', response.status, apiDuration, context, {
      model: 'gpt-4-turbo-preview'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI API error', context, {
        status: response.status,
        error: errorText
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    
    // Step 6: Parse response
    logger.step('PARSE_RESPONSE', 'Parsing API response', context);
    const openaiData = await response.json();
    logger.debug('Raw API response received', context, {
      choices: openaiData.choices?.length,
      usage: openaiData.usage
    });
    
    let responseText = openaiData.choices[0]?.message?.content || '';
    logger.debug('Extracted response text', context, {
      length: responseText.length
    });
    
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
    
    const normalizedData = {
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
      technology: normalizedTechnology
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
      const value = normalizedData[field as keyof typeof normalizedData];
      if (typeof value === 'string' && value.trim().length > 0) populatedBasicFields++;
    });
    
    let populatedContactFields = 0;
    contactFields.forEach(field => {
      const value = normalizedData[field as keyof typeof normalizedData];
      if (typeof value === 'string' && value.trim().length > 0) populatedContactFields++;
    });
    
    let populatedSocialFields = 0;
    socialFields.forEach(field => {
      const value = normalizedData[field as keyof typeof normalizedData];
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
      techStackCount: normalizedData.technology.stack.length
    });
    
    const totalDuration = Date.now() - startTime;
    logger.endFlow('OPENAI COMPANY PROFILE ENRICHMENT', context, {
      duration: `${totalDuration}ms`,
      completenessScore: `${completenessScore}%`,
      apiDuration: `${apiDuration}ms`
    });
    
    return new Response(JSON.stringify({
      success: true,
      model: 'openai',
      data: normalizedData,
      metadata: {
        completenessScore,
        populatedFields,
        totalFields,
        processingTime: totalDuration,
        apiTime: apiDuration,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    logger.error('Enrichment failed', context, {
      error: error.message,
      stack: error.stack,
      duration: `${totalDuration}ms`
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      model: 'openai'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

