import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logger, LogContext } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};
Deno.serve(async (req)=>{
  const startTime = Date.now();
  let context = {
    functionName: 'enrich-client-openai'
  };
  logger.startFlow('OPENAI CLIENT ENRICHMENT', context);
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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
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
    const body = await req.json();
    const { clientName, websiteUrl, linkedinUrl } = body;
    if (!clientName || !websiteUrl || !linkedinUrl) {
      logger.error('Missing required fields', context, {
        body
      });
      return new Response(JSON.stringify({
        error: 'clientName, websiteUrl, and linkedinUrl are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    context.clientName = clientName;
    logger.info('Request validated', context, {
      clientName,
      websiteUrl,
      linkedinUrl
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
    // Step 4: Construct prompt
    logger.step('PROMPT', 'Constructing AI prompt', context);
    const prompt = `# ✅ **COMPREHENSIVE COMPANY INTELLIGENCE EXTRACTION — GPT-5.1**

You are an expert business intelligence analyst with access to a comprehensive knowledge base about companies.

**YOUR MISSION:** Extract ALL available information about "${clientName}" from your knowledge base. Be THOROUGH and COMPREHENSIVE. Your goal is to achieve 80%+ field completion, not just 20%.

**Company Details:**
- Company Name: ${clientName}
- Website: ${websiteUrl}
- LinkedIn: ${linkedinUrl}

---

# 🔍 **EXTRACTION STRATEGY**

## **1. USE YOUR KNOWLEDGE BASE ACTIVELY**

You have knowledge about "${clientName}" in your training data. You MUST:
- **Actively recall** information you know about this company
- **Extract comprehensively** - don't leave fields empty if you have the information
- **Use industry knowledge** that applies to this specific company
- **Combine multiple sources** of knowledge (website info, LinkedIn data, public records, industry knowledge)

**Balance:** Accuracy is important, but completeness is equally important. If you have reasonable knowledge about a field, extract it.

---

## **2. COMPANY BASIC INFORMATION (MANDATORY FIELDS)**

Extract ALL available basic information:

**Company Name & Identity:**
- Full company name (use "${clientName}" if exact match, otherwise use what you know)
- Industry classification (be specific, not generic)
- Detailed business description (2-3 sentences minimum if available)

**Company History:**
- Founding year (if known)
- Company size category (e.g., "11-50 employees", "51-200 employees")
- Exact or approximate employee count
- Annual revenue (if known from public sources)

**Location Information:**
- City (extract from address if known)
- Country (extract from address if known)
- ZIP/Postal code (extract from full address if available)
- If you know the company's location, extract ALL location fields

---

## **3. CONTACT INFORMATION (COMPREHENSIVE EXTRACTION)**

**You MUST extract contact information if you have knowledge of it:**

**Primary Contact:**
- Contact person name (founder, CEO, or key executive - use what you know)
- Their job title/role (CEO, Founder, Managing Director, etc.)
- Primary email (contact@, info@, hello@, or main company email if known)
- Primary phone number (with country code if known)

**Physical Address:**
- If you know the company's address, extract city, country, and ZIP code
- Don't leave these empty if you have address knowledge

**Extraction Priority:** Use your knowledge base about "${clientName}" to find contact information. If you know the company's contact details, extract them.

---

## **4. SOCIAL MEDIA PROFILES (ACTIVE EXTRACTION REQUIRED)**

**You MUST actively extract social media URLs if you have knowledge of them:**

**Twitter/X:**
- Search your knowledge for Twitter/X profile
- Extract FULL URL (e.g., "https://twitter.com/companyname" or "https://x.com/companyname")
- Common patterns: twitter.com/company, x.com/company, @companyname
- If you know the company has Twitter, extract it

**Facebook:**
- Search your knowledge for Facebook page
- Extract FULL URL (e.g., "https://facebook.com/companyname")
- Common patterns: facebook.com/company, fb.com/company
- If you know the company has Facebook, extract it

**Instagram:**
- Search your knowledge for Instagram profile
- Extract FULL URL (e.g., "https://instagram.com/companyname")
- Common patterns: instagram.com/company, @companyname
- If you know the company has Instagram, extract it

**CRITICAL:** If you have knowledge that "${clientName}" has social media profiles, you MUST extract them. Don't leave these fields empty if the profiles exist in your knowledge base.

---

## **5. BLOG POSTS (COMPREHENSIVE EXTRACTION)**

**If you have knowledge of blog content from "${clientName}":**

**Extraction Requirements:**
- Extract ALL blog posts you know about (aim for 10-15+ if available)
- For each blog post, extract:
  - **title**: Full blog post title
  - **url**: FULL absolute URL (construct using ${websiteUrl} + blog path)
  - **date**: Publication date in YYYY-MM-DD format (if known)

**URL Construction Rules:**
- If website is "${websiteUrl}" and blog path is "/blog/article", URL should be "${websiteUrl}blog/article"
- If website is "${websiteUrl}" and blog path is "/blog/article", URL should be "${websiteUrl}/blog/article" (with slash)
- Always create FULL absolute URLs starting with "https://" or "http://"
- Never use relative URLs like "/blog/article"

**If you know "${clientName}" has a blog or publishes content, extract multiple posts (10-15+ if available).**

---

## **6. SERVICES (COMPREHENSIVE EXTRACTION)**

**Extract ALL services "${clientName}" offers:**

**Extraction Requirements:**
- Extract services specific to this company
- Include services you know they provide
- Each service should have:
  - **name**: Service name
  - **description**: Brief description of what the service includes

**Extraction Strategy:**
- Use your knowledge about "${clientName}"'s offerings
- Check if you know their service portfolio
- Include industry-specific services if you know this company offers them
- Aim for 5-10+ services if available

**Don't leave empty if you know what services they offer.**

---

## **7. TECHNOLOGIES (COMPREHENSIVE EXTRACTION)**

**Extract ALL technologies "${clientName}" uses:**

**Extraction Requirements:**
- Extract technologies specific to this company
- Include ALL technologies you know they use:
  - Programming languages (JavaScript, Python, Java, etc.)
  - Frameworks (React, Node.js, Django, etc.)
  - Databases (PostgreSQL, MongoDB, etc.)
  - Cloud platforms (AWS, Azure, GCP, etc.)
  - Tools and services (Docker, Kubernetes, etc.)
  - CRM systems, marketing tools, etc.

**Each technology should have:**
- **name**: Technology name
- **category**: Category (e.g., "Programming Language", "Framework", "Database", "Cloud Platform", "Tool")

**Extraction Strategy:**
- Use your knowledge about "${clientName}"'s tech stack
- Include technologies mentioned in case studies, job postings, or public information
- Aim for 10-15+ technologies if available
- Don't leave empty if you know their tech stack

---

## **8. COMPETITORS (ACTIVE EXTRACTION)**

**Extract competitors if you have knowledge of them:**

**Extraction Requirements:**
- Companies in the same industry that compete with "${clientName}"
- Competitors you know about from your knowledge base
- Each competitor should have:
  - **name**: Competitor company name
  - **comparison**: Brief comparison note (how they compare to "${clientName}")

**Extraction Strategy:**
- Use your knowledge of the industry and market
- Include 3-5+ major competitors if available
- If you know competitors in this space, extract them

**Don't leave empty if you know competitors exist.**

---

## **9. PAIN POINTS & GOALS (COMPREHENSIVE EXTRACTION)**

**Extract business information if you have knowledge:**

**Pain Points:**
- Business challenges the company addresses
- Problems they solve for customers
- Market pain points they target
- Extract 3-5+ pain points if available

**Goals:**
- **shortTermGoals**: Short-term goals (3-6 months) if known
- **longTermGoals**: Long-term vision/goals (1-5 years) if known
- Mission/vision statements if available

**Extraction Strategy:**
- Use your knowledge about "${clientName}"'s business model
- Extract from company descriptions, mission statements, or public information
- If you have knowledge, extract it

---

## **10. OUTPUT FORMAT — STRICT JSON**

Return **EXACTLY** the following JSON structure with NO additional text, NO markdown, NO explanations:

\`\`\`json
{
  "company": "",
  "website": "",
  "industry": "",
  "description": "",
  "founded": "",
  "companySize": "",
  "employeeCount": "",
  "annualRevenue": "",
  "city": "",
  "country": "",
  "zipCode": "",
  "linkedinUrl": "",
  "twitterUrl": "",
  "facebookUrl": "",
  "instagramUrl": "",
  "contactName": "",
  "primaryEmail": "",
  "primaryPhone": "",
  "jobTitle": "",
  "services": [],
  "technologies": [],
  "painPoints": [],
  "competitors": [],
  "blogs": [],
  "shortTermGoals": "",
  "longTermGoals": ""
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
1. **Actively recall** information you know about "${clientName}"
2. **Extract comprehensively** - don't be overly cautious
3. **Use your knowledge base** - if you have information, extract it
4. **Balance accuracy with completeness** - both are important

**Company to extract:** ${clientName}
**Website:** ${websiteUrl}
**LinkedIn:** ${linkedinUrl}

**Now extract ALL available information and return comprehensive JSON.**`;
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
        model: 'gpt-5.1',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business intelligence analyst with comprehensive knowledge about companies. Your purpose is to extract ALL available information about companies from your knowledge base. You MUST be THOROUGH and COMPREHENSIVE - aim for 80%+ field completion. Use your knowledge base actively to recall information about companies. Balance accuracy with completeness - both are equally important. Extract information you know from your training data, industry knowledge, and public information. Your output MUST always be pure JSON, with no explanations, no surrounding text, and no markdown. Return strictly valid JSON with comprehensive data extraction.'
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
        max_completion_tokens: 12000
      })
    });
    const apiDuration = Date.now() - apiStartTime;
    logger.apiResponse('OpenAI', response.status, apiDuration, context, {
      model: 'gpt-5.1'
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
    let parsedData;
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
    const normalizeBlogUrl = (url, baseUrl)=>{
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
    const normalizedBlogs = Array.isArray(parsedData.blogs) ? parsedData.blogs.map((blog)=>({
        title: blog.title || '',
        url: normalizeBlogUrl(blog.url || '', baseWebsiteUrl),
        date: blog.date || ''
      })) : [];
    const normalizedData = {
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
      longTermGoals: parsedData.longTermGoals || ''
    };
    // Step 9: Calculate completeness
    logger.step('CALCULATE', 'Calculating completeness score', context);
    const fields = Object.keys(normalizedData);
    const populatedFields = fields.filter((key)=>{
      const value = normalizedData[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== null && value !== undefined;
    });
    const completenessScore = Math.round(populatedFields.length / fields.length * 100);
    logger.info('Data normalization complete', context, {
      completenessScore: `${completenessScore}%`,
      populatedFields: populatedFields.length,
      totalFields: fields.length,
      servicesCount: normalizedData.services.length,
      technologiesCount: normalizedData.technologies.length,
      blogsCount: normalizedData.blogs.length
    });
    const totalDuration = Date.now() - startTime;
    logger.endFlow('OPENAI CLIENT ENRICHMENT', context, {
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
        populatedFields: populatedFields.length,
        totalFields: fields.length,
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
  } catch (error) {
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
