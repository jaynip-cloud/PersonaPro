import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  url: string;
  perplexityKey?: string;
}

interface CrawlResult {
  url: string;
  title: string;
  content: string;
  links: string[];
  socialLinks: string[];
}

// ============================================
// PERPLEXITY API RESPONSE LOGGING FUNCTIONS
// ============================================

function logPerplexityResponse(
  context: string,
  response: Response,
  data: any,
  content?: string,
  extractedData?: any
) {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${timestamp}] PERPLEXITY API RESPONSE - ${context}`);
  console.log(`${'='.repeat(60)}`);
  
  // Log response metadata
  console.log("Response Status:", response.status);
  console.log("Response OK:", response.ok);
  
  // Log full API response
  console.log("\n--- Full API Response ---");
  console.log(JSON.stringify(data, null, 2));
  
  // Log message content if available
  if (content) {
    console.log("\n--- Message Content ---");
    console.log("Content Length:", content.length);
    console.log("Content Preview (first 1000 chars):");
    console.log(content.substring(0, 1000));
    if (content.length > 1000) {
      console.log("... (truncated, full length:", content.length, ")");
    }
  }
  
  // Log parsed/extracted data if available
  if (extractedData) {
    console.log("\n--- Parsed/Extracted Data ---");
    console.log(JSON.stringify(extractedData, null, 2));
    
    // Log contact info specifically for debugging
    if (extractedData.contactInfo) {
      console.log("\n--- Contact Information Extracted ---");
      console.log("Email:", extractedData.contactInfo.email || extractedData.contactInfo.primaryEmail || "NOT FOUND");
      console.log("Phone:", extractedData.contactInfo.phone || extractedData.contactInfo.primaryPhone || "NOT FOUND");
      console.log("Address:", extractedData.contactInfo.address || "NOT FOUND");
      console.log("Alternate Email:", extractedData.contactInfo.alternateEmail || "NOT FOUND");
      console.log("Alternate Phone:", extractedData.contactInfo.alternatePhone || "NOT FOUND");
    }
  }
  
  console.log(`${'='.repeat(60)}\n`);
}

function logPerplexityError(context: string, error: any, response?: Response) {
  const timestamp = new Date().toISOString();
  console.error(`\n${'='.repeat(60)}`);
  console.error(`[${timestamp}] PERPLEXITY API ERROR - ${context}`);
  console.error(`${'='.repeat(60)}`);
  
  if (response) {
    console.error("Response Status:", response.status);
    console.error("Response Status Text:", response.statusText);
  }
  
  console.error("Error:", error);
  console.error("Error Message:", error?.message || "Unknown error");
  if (error?.stack) {
    console.error("Error Stack:", error.stack);
  }
  console.error(`${'='.repeat(60)}\n`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url, perplexityKey: requestKey }: RequestBody = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "No URL provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const perplexityKey = requestKey || Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Perplexity API key not provided. Please provide it in the request or configure it as an environment variable." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isLinkedInUrl = url.includes('linkedin.com/company/') || url.includes('linkedin.com/in/');

    let crawledData: CrawlResult[] = [];
    let extractedInfo;

    if (isLinkedInUrl) {
      extractedInfo = await extractFromLinkedInUrl(url, perplexityKey);
    } else {
      crawledData = await crawlWebsite(url);
      extractedInfo = await extractCompanyInfo(crawledData, perplexityKey, url);
    }

    const simplifiedData = {
      success: true,
      data: {
        name: extractedInfo.companyInfo?.name || '',
        industry: extractedInfo.companyInfo?.industry || '',
        description: extractedInfo.companyInfo?.description || '',
        founded: extractedInfo.companyInfo?.founded || '',
        companySize: extractedInfo.companyInfo?.size || '',
        location: {
          city: extractLocationCity(extractedInfo.companyInfo?.location || ''),
          country: extractLocationCountry(extractedInfo.companyInfo?.location || ''),
          zipCode: extractedInfo.companyInfo?.zipCode || '',
        },
        businessInfo: {
          mission: extractedInfo.companyInfo?.mission || extractedInfo.businessInfo?.mission || '',
          vision: extractedInfo.companyInfo?.vision || extractedInfo.businessInfo?.vision || '',
          shortTermGoals: extractedInfo.businessInfo?.shortTermGoals || '',
          longTermGoals: extractedInfo.businessInfo?.longTermGoals || '',
          expectations: extractedInfo.businessInfo?.expectations || '',
        },
        contactInfo: {
          contactName: extractedInfo.leadership?.primaryContact?.name || extractedInfo.leadership?.ceo?.name || extractedInfo.leadership?.founder?.name || '',
          jobTitle: extractedInfo.leadership?.primaryContact?.title || extractedInfo.leadership?.ceo?.title || extractedInfo.leadership?.founder?.title || '',
          primaryEmail: extractedInfo.contactInfo?.primaryEmail || extractedInfo.contactInfo?.email || '',
          alternateEmail: extractedInfo.contactInfo?.alternateEmail || '',
          primaryPhone: extractedInfo.contactInfo?.primaryPhone || extractedInfo.contactInfo?.phone || '',
          alternatePhone: extractedInfo.contactInfo?.alternatePhone || '',
          address: extractedInfo.contactInfo?.address || '',
        },
        contacts: extractedInfo.contacts || [],
        leadership: {
          ceo: extractedInfo.leadership?.ceo || null,
          founder: extractedInfo.leadership?.founder || null,
          owner: extractedInfo.leadership?.owner || null,
        },
        socialProfiles: {
          linkedin: extractedInfo.socialProfiles?.linkedin || '',
          twitter: extractedInfo.socialProfiles?.twitter || '',
          facebook: extractedInfo.socialProfiles?.facebook || '',
          instagram: extractedInfo.socialProfiles?.instagram || '',
        },
        testimonials: extractedInfo.testimonials || [],
        services: extractedInfo.services || [],
        blogs: extractedInfo.blogs || [],
        technology: {
          stack: extractedInfo.technology?.stack || [],
          partners: extractedInfo.technology?.partners || [],
          integrations: extractedInfo.technology?.integrations || []
        },
        challenges: extractedInfo.challenges || [],
        competitors: extractedInfo.competitors || [],
        logo: findLogoUrl(crawledData),
      }
    };

    return new Response(
      JSON.stringify(simplifiedData),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function crawlWebsite(startUrl: string): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const visited = new Set<string>();
  const targetPages = [
    '',
    'about',
    'about-us',
    'contact',
    'team',
    'leadership',
    'services',
    'products',
    'solutions',
    'blog',
    'news',
    'press',
    'press-releases',
    'case-studies',
    'portfolio',
    'careers',
    'jobs',
    'technology',
    'partners',
    'investors',
    'investor-relations',
    'strategy',
    'roadmap',
    'mission',
    'vision',
    'goals',
    'testimonials',
    'reviews',
    'clients',
    'customers',
    'success-stories'
  ];

  const baseUrl = new URL(startUrl);
  const baseDomain = baseUrl.hostname;

  const urlsToFetch: string[] = [startUrl];
  for (const page of targetPages) {
    const testUrl = new URL(startUrl);
    testUrl.pathname = `/${page}`;
    urlsToFetch.push(testUrl.href);
  }

  const fetchPromises = urlsToFetch.slice(0, 15).map(async (url) => {
    if (visited.has(url)) return null;
    visited.add(url);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CompanyBot/1.0)",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      return parseHtml(html, url);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      return null;
    }
  });

  const fetchedResults = await Promise.all(fetchPromises);

  for (const result of fetchedResults) {
    if (result) {
      results.push(result);
    }
  }

  return results;
}

function parseHtml(html: string, url: string): CrawlResult {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const socialPatterns = [
    /https?:\/\/(www\.)?(linkedin\.com\/company\/[^\s"'<>]+)/gi,
    /https?:\/\/(www\.)?(linkedin\.com\/in\/[^\s"'<>]+)/gi,
    /https?:\/\/(www\.)?(twitter\.com\/[^\s"'<>]+)/gi,
    /https?:\/\/(www\.)?(x\.com\/[^\s"'<>]+)/gi,
    /https?:\/\/(www\.)?(facebook\.com\/[^\s"'<>]+)/gi,
    /https?:\/\/(www\.)?(instagram\.com\/[^\s"'<>]+)/gi,
    /https?:\/\/(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)?[^\s"'<>]+)/gi,
  ];

  const socialLinks = new Set<string>();
  for (const pattern of socialPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      socialLinks.add(match[0]);
    }
  }

  const linkPattern = /<a[^>]+href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1];
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      links.push(href);
    }
  }

  const content = extractTextFromHtml(html);

  return {
    url,
    title,
    content,
    links,
    socialLinks: Array.from(socialLinks),
  };
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<style[^>]*>.*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.substring(0, 20000);
}

async function extractCompanyInfo(crawlResults: CrawlResult[], perplexityKey: string, rootUrl: string) {
  const allSocialLinks = new Set<string>();
  crawlResults.forEach(result => {
    result.socialLinks.forEach(link => allSocialLinks.add(link));
  });

  const combinedContent = crawlResults
    .map(r => `PAGE: ${r.title || r.url}\nURL: ${r.url}\nCONTENT: ${r.content.substring(0, 12000)}\n\n`)
    .join('\n---\n\n');

  const linkedinProfileUrls = Array.from(allSocialLinks).filter(link => link.includes('linkedin.com/in/'));
  const linkedinCompanyUrls = Array.from(allSocialLinks).filter(link => link.includes('linkedin.com/company/'));
  const twitterUrls = Array.from(allSocialLinks).filter(link => link.includes('twitter.com') || link.includes('x.com'));
  const facebookUrls = Array.from(allSocialLinks).filter(link => link.includes('facebook.com'));
  const instagramUrls = Array.from(allSocialLinks).filter(link => link.includes('instagram.com'));

  const prompt = `You are an expert business intelligence analyst specializing in company research and data extraction. Your task is to extract ONLY accurate, verified company information following a strict priority order.

CRITICAL: ACCURACY IS PARAMOUNT - NEVER GUESS OR INFER DATA THAT IS NOT EXPLICITLY STATED OR FOUND.

⚠️ MANDATORY FIELDS - THESE MUST BE EXTRACTED (use web search extensively if needed):
1. companyOverview/description - REQUIRED (minimum 2-3 sentences about what the company does)
2. shortTermGoals - REQUIRED (search press releases, blog, investor pages, CEO interviews)
3. longTermGoals - REQUIRED (search about page, vision/mission, strategic direction, investor deck)
4. expectations - REQUIRED (infer from testimonials, service pages, partnership requirements)
5. budgetRange - OPTIONAL but highly valuable (look for pricing pages, case studies)

DATA SOURCE PRIORITY (USE IN THIS EXACT ORDER):
1. **PRIMARY SOURCE - LinkedIn Company Page**: ${linkedinCompanyUrls[0] || 'Not found - search for it'}
   - Search and extract from the company's official LinkedIn page FIRST
   - Get: company name, industry, size, founded year, headquarters location, description
   - Get all employees listed with their titles and roles
   - This is the MOST RELIABLE source - prioritize this data over everything else

2. **SECONDARY SOURCE - Website Content**: ${rootUrl}
   - Use the provided crawled website content
   - Extract: contact info, services, testimonials, blog posts, team members
   - Cross-reference with LinkedIn data - if there's a conflict, LinkedIn wins

3. **TERTIARY SOURCE - Web Search** (ONLY for missing data):
   - Use web search ONLY to fill gaps that LinkedIn and website don't have
   - Search for: recent press releases, news articles, verified company information
   - NEVER use web search for basic info if it's on LinkedIn or website

STRICT ACCURACY RULES:
❌ DO NOT extract data if you're not 100% certain it's correct
❌ DO NOT infer or guess information (e.g., don't guess contact emails)
❌ DO NOT mix data from different companies
❌ DO NOT use outdated information - verify dates
❌ DO NOT extract contact info unless it's explicitly shown on contact/team pages
✅ DO verify company names match across all sources
✅ DO prioritize LinkedIn data for company basics (name, size, industry, location)
✅ DO extract ONLY factual data you can verify
✅ DO leave fields empty if data is not found rather than guessing

ROOT DOMAIN: ${rootUrl}

DISCOVERED SOCIAL MEDIA PROFILES:
- LinkedIn Company: ${linkedinCompanyUrls.join(', ') || 'Not found'}
- LinkedIn Profiles (Leadership): ${linkedinProfileUrls.slice(0, 5).join(', ') || 'Not found'}
- Twitter/X: ${twitterUrls.join(', ') || 'Not found'}
- Facebook: ${facebookUrls.join(', ') || 'Not found'}
- Instagram: ${instagramUrls.join(', ') || 'Not found'}

CRITICAL EXTRACTION INSTRUCTIONS:
1. **START WITH LINKEDIN**: Search for and extract company data from LinkedIn company page FIRST
   - Company name, industry, company size, founded year, location from LinkedIn
   - Employee list with titles from LinkedIn \"People\" section

2. **THEN USE WEBSITE**: Extract from provided website content
   - Contact information (emails, phones) from contact page only
   - Services/products from services page only
   - Testimonials from testimonials/reviews pages only
   - Team members from team/about pages only

3. **FINALLY WEB SEARCH**: Use for missing data only
   - Recent news for goals/strategy
   - Press releases for company updates
   - Verify ambiguous information

4. **ACCURACY CHECKS**:
   - Verify company name matches across LinkedIn, website, and web search
   - If contact info (email/phone) format looks wrong, leave it empty
   - If employee title doesn't match company industry, skip them
   - If testimonial doesn't clearly name the client, skip it

5. **DATA VALIDATION**:
   - Company name must be exact match across sources
   - Email format: must contain @ and valid domain
   - Phone format: must contain numbers (with optional + and -)
   - Founded year: must be 4 digits between 1800-2025
   - Company size: use LinkedIn format (e.g., \"11-50 employees\")

6. Return ONLY valid JSON - no additional text or explanations
7. Leave fields empty (\"\") rather than guessing or inferring data

REQUIRED JSON STRUCTURE (extract ALL available information):

{
  \"companyInfo\": {
    \"name\": \"Full official company name\",
    \"industry\": \"Specific industry/vertical (e.g., 'Enterprise SaaS', 'Healthcare Technology', 'FinTech')\",
    \"description\": \"Comprehensive 2-4 sentence company description\",
    \"location\": \"Full location: 'City, State/Province, Country'\",
    \"zipCode\": \"Postal/Zip code (e.g., '94102', 'SW1A 1AA'). Look in: contact page, footer address\",
    \"size\": \"Company size (e.g., '1-10 employees', '50-200 employees')\",
    \"founded\": \"Year founded in YYYY format (e.g., '2020')\",
    \"mission\": \"Company mission statement if found (what they aim to do)\",
    \"vision\": \"Company vision statement if found (where they want to be in the future)\"
  },
  \"contactInfo\": {
    \"email\": \"Primary general contact email - MUST be explicitly displayed on website (e.g., from contact page, footer). DO NOT guess or construct. Leave empty if not found.\",
    \"primaryEmail\": \"Primary contact email - MUST be explicitly shown on website. This is the main contact email displayed most prominently (usually on contact page). DO NOT use generic patterns unless actually displayed.\",
    \"alternateEmail\": \"Secondary/alternate email ONLY if multiple distinct emails are explicitly shown (e.g., sales@, support@, different department). DO NOT create if only one email is found. Leave empty if not found.\",
    \"phone\": \"Primary phone number with country code - MUST be explicitly displayed on website (e.g., from contact page, footer). DO NOT guess based on location. Leave empty if not found.\",
    \"primaryPhone\": \"Primary phone number - MUST be explicitly shown on website. This is the main contact phone displayed most prominently (usually on contact page). Include country code if shown.\",
    \"alternatePhone\": \"Secondary/alternate phone ONLY if multiple distinct phone numbers are explicitly shown (e.g., different departments, toll-free). DO NOT create if only one phone is found. Leave empty if not found.\",
    \"address\": \"Full physical address (street, city, state, country, zip) - MUST be explicitly displayed on website. Look in: contact page, footer, about page. Include postal/zip code if shown. DO NOT guess addresses. Leave empty if not found.\"
  },
  \"leadership\": {
    \"ceo\": {
      \"name\": \"CEO full name\",
      \"title\": \"CEO\" or actual title,
      \"email\": \"CEO email if found\",
      \"linkedin\": \"CEO LinkedIn profile URL from discovered profiles\",
      \"bio\": \"Brief bio if available from website or LinkedIn\"
    },
    \"founder\": {
      \"name\": \"Founder full name\",
      \"title\": \"Founder\" or \"Co-Founder\",
      \"email\": \"Founder email if found\",
      \"linkedin\": \"Founder LinkedIn profile URL from discovered profiles\",
      \"bio\": \"Brief bio if available\"
    },
    \"owner\": {
      \"name\": \"Owner full name\",
      \"title\": \"Owner\" or actual title,
      \"email\": \"Owner email if found\",
      \"linkedin\": \"Owner LinkedIn profile URL from discovered profiles\",
      \"bio\": \"Brief bio if available\"
    },
    \"primaryContact\": {
      \"name\": \"Primary contact person name (from contact page, team page)\",
      \"title\": \"Their job title/role\",
      \"email\": \"Their direct email\",
      \"phone\": \"Their direct phone\"
    }
  },
  \"contacts\": [
    {
      \"name\": \"Full name of person (from team, about, leadership, contact pages)\",
      \"title\": \"Job title/role (e.g., 'VP of Sales', 'Head of Marketing', 'Customer Success Manager')\",
      \"email\": \"Direct email if available (firstname@company.com, or department email)\",
      \"phone\": \"Direct phone number if available\",
      \"linkedin\": \"LinkedIn profile URL if found\",
      \"department\": \"Department/division (e.g., 'Sales', 'Engineering', 'Marketing')\",
      \"isDecisionMaker\": true or false (true if C-level, VP, Director, Manager, Decision Maker, Head of, or leadership role),
      \"influenceLevel\": \"high\", \"medium\", or \"low\" based on role seniority
    }
  ],
  \"services\": [
    {
      \"name\": \"Service/Product name\",
      \"description\": \"What this service/product does, key features and benefits\"
    }
  ],
  \"blogs\": [
    {
      \"title\": \"Blog article title\",
      \"url\": \"Full URL to the blog post\",
      \"date\": \"Publication date if available (any format)\",
      \"summary\": \"Brief 1-2 sentence summary of the article\",
      \"author\": \"Author name if mentioned\"
    }
  ],
  \"technology\": {
    \"stack\": [\"Technology 1\", \"Technology 2\", \"Framework 1\"],
    \"partners\": [\"Partner Company 1\", \"Partner Company 2\"],
    \"integrations\": [\"Integration 1\", \"Integration 2\", \"Platform 1\"]
  },
  \"challenges\": [
    \"Business challenge or pain point 1\",
    \"Business challenge or pain point 2\"
  ],
  \"competitors\": [
    {
      \"name\": \"Competitor Company Name\",
      \"description\": \"Brief comparison or what makes them a competitor\"
    }
  ],
  \"businessInfo\": {
    \"shortTermGoals\": \"Company's short-term goals, objectives, immediate priorities, current focus areas, quarterly/annual targets (next 6-12 months). Examples: 'Expand into 3 new markets', 'Increase revenue by 25%', 'Launch new product line', 'Scale team to 100 employees'\",
    \"longTermGoals\": \"Company's long-term vision, strategic goals, future aspirations, 5-year plan, mission-driven objectives (2-5 years). Examples: 'Become market leader', 'IPO by 2027', 'Expand globally to 50 countries', 'Achieve $100M ARR'\",
    \"expectations\": \"What the company expects from partnerships, client relationships, vendor services, collaboration outcomes. Examples: 'Expect 24/7 support', 'Need scalable solutions', 'Require data security compliance', 'Want strategic partnership growth'\"
  },
  \"testimonials\": [
    {
      \"clientName\": \"Name of client/customer who gave testimonial (company or person name)\",
      \"clientTitle\": \"Their title/role if mentioned (e.g., 'CEO at Company X', 'Marketing Director')\",
      \"clientCompany\": \"Company they work for if different from clientName\",
      \"feedback\": \"The full testimonial text - what they said about the service/product\",
      \"satisfactionIndicators\": \"Extract satisfaction cues: 'exceeded expectations', 'highly satisfied', 'would recommend', 'great support', 'transformed our business', 'amazing results' etc.\",
      \"rating\": \"Star rating if shown (e.g., '5/5', '4.5 stars')\",
      \"date\": \"Date of testimonial if available\",
      \"source\": \"Where found: 'website testimonials page', 'case study', 'review site', etc.\"
    }
  ],
  \"socialProfiles\": {
    \"linkedin\": \"${linkedinCompanyUrls[0] || ''}\",
    \"twitter\": \"${twitterUrls[0] || ''}\",
    \"facebook\": \"${facebookUrls[0] || ''}\",
    \"instagram\": \"${instagramUrls[0] || ''}\"
  }
}

DETAILED EXTRACTION GUIDELINES:

**STEP 1: START WITH LINKEDIN (HIGHEST PRIORITY)**
- LinkedIn Company URL: ${linkedinCompanyUrls[0] || 'SEARCH FOR IT'}
- If LinkedIn URL found above, access it and extract:
  - Official company name (exactly as shown on LinkedIn)
  - Industry/sector (from LinkedIn company page)
  - Company size (e.g., \"51-200 employees\" - use exact LinkedIn format)
  - Founded year (from LinkedIn \"About\" section)
  - Headquarters location (City, State/Province, Country)
  - Company description (from LinkedIn \"About\")
- Navigate to \"People\" section on LinkedIn to find:
  - All employees with their current titles
  - Focus on decision makers (C-level, VPs, Directors, Managers)
- LinkedIn data ALWAYS takes precedence over website data for these fields
- If no LinkedIn found, search: \"[Company Name from website] LinkedIn company\"

**STEP 2: EXTRACT FROM WEBSITE (SECONDARY SOURCE)**

**Services/Products:**
- Look in: services page, products page, solutions page, homepage features section
- Extract ALL services/products listed (minimum 3-5 if available, up to 10)
- For each service: extract name and comprehensive description (what it does, key features, benefits)
- Example: {\"name\": \"Cloud Migration Service\", \"description\": \"End-to-end cloud migration services helping enterprises move legacy systems to AWS, Azure, or GCP with zero downtime, automated backups, and security compliance.\"}

**Blog Articles:**
- Look in: /blog, /news, /insights, /resources pages
- Extract recent articles (at least 5-10 if available)
- For each article: title, full URL, publication date, 1-2 sentence summary, author name
- If blog listing page found, extract article previews and metadata
- Example: {\"title\": \"How AI is Transforming Healthcare\", \"url\": \"https://example.com/blog/ai-healthcare\", \"date\": \"March 15, 2024\", \"summary\": \"Exploring the impact of artificial intelligence on patient care and medical diagnostics.\", \"author\": \"Dr. Jane Smith\"}

**Technology Stack:**
- Look in: technology page, about page, partners page, integration pages, footer
- Identify: programming languages, frameworks, platforms, tools they use or integrate with
- Examples: [\"React\", \"Node.js\", \"AWS\", \"PostgreSQL\", \"Docker\", \"Kubernetes\"]
- Also search their job postings for technology requirements

**Partners:**
- Look in: partners page, about page, integration pages
- Extract: partner company names, technology partners, strategic alliances
- Examples: [\"Salesforce\", \"Microsoft\", \"Google Cloud\", \"Stripe\"]

**Integrations:**
- Look in: integrations page, features page, API documentation
- Extract: third-party platforms/services they integrate with
- Examples: [\"Slack\", \"Zapier\", \"HubSpot\", \"QuickBooks\", \"Shopify\"]

**Business Challenges & Pain Points:**
- Look in: about page, case studies, blog posts, problem statements, solution pages
- Extract: business challenges they mention solving, pain points they address, problems they help clients overcome
- Search for keywords: "challenge", "problem", "pain point", "difficulty", "struggle", "overcome", "solve"
- Examples: ["Manual data entry consuming too much time", "Difficulty scaling operations", "Lack of real-time visibility into metrics", "High customer churn rates"]
- If they describe what problems they solve for clients, those are pain points their clients face

**Competitors:**
- Look in: comparison pages, about page, alternative solutions, "vs" pages
- Search the web for: "[Company Name] competitors", "[Company Name] alternatives"
- Extract: competitor names and brief comparison notes
- Examples: [{"name": "Competitor ABC", "description": "Similar product but focuses more on enterprise"}, {"name": "Alternative XYZ", "description": "Offers basic features at lower price point"}]
- If not explicitly mentioned, use web search to find industry competitors

**Leadership (CRITICAL - USE WEB SEARCH):**
- Use the discovered LinkedIn profile URLs: ${linkedinProfileUrls.slice(0, 5).join(', ')}
- Search the web for these LinkedIn profiles to get names, titles, and bios
- Also search: \"[Company Name] CEO\", \"[Company Name] Founder\" to find leadership
- Extract from: team page, about page, leadership section, press releases
- For each leader: full name, title, email (if found), LinkedIn URL, brief bio
- Prioritize: CEO > Founder > Owner > Primary Contact

**Contacts (CRITICAL - EXTRACT ALL PEOPLE):**
- Look in: team page, about page, leadership page, contact page, staff directory
- Extract EVERY person mentioned with any of these details: name, title, email, phone, LinkedIn
- Include: executives, managers, team leads, sales reps, account managers, support staff, any named employees
- For each contact determine:
  - **isDecisionMaker**: true if title contains: CEO, CTO, CFO, COO, VP, Vice President, Director, Head of, Chief, President, Owner, Founder, Manager, Lead
  - **influenceLevel**:
    - \"high\" for C-level (CEO, CTO, etc.), VP, President, Owner, Founder
    - \"medium\" for Director, Head of, Manager, Lead, Senior roles
    - \"low\" for Coordinator, Associate, Specialist, Junior roles
- Extract at least 3-10 contacts if available on the website
- Use web search to find LinkedIn profiles and additional contact details

**Contact Information (CRITICAL - ACCURACY IS PARAMOUNT):**

⚠️ STRICT RULES FOR CONTACT EXTRACTION:
1. **ONLY extract contact information that is EXPLICITLY displayed** on the website
2. **NEVER guess, infer, or construct** email addresses or phone numbers
3. **NEVER use generic patterns** like "contact@domain.com" unless it's actually shown
4. **VALIDATE all contact information** before including it

**EMAIL EXTRACTION (Priority Order):**
1. **Contact Page** - Look for:
   - Explicitly displayed email addresses (e.g., "Email: info@company.com")
   - Contact forms with pre-filled or visible email addresses
   - "Contact us" sections with email listed
   - Email links (mailto: links) - extract the actual email address
   
2. **Footer** - Look for:
   - Email addresses in footer contact section
   - Footer links that show email addresses
   
3. **Header/Navigation** - Look for:
   - Contact links that reveal email addresses
   - Navigation menus with contact information
   
4. **About Page** - Look for:
   - Contact sections on about page
   - Team member emails if explicitly listed
   
5. **Team/Leadership Pages** - Look for:
   - Individual team member emails if explicitly shown
   - Leadership contact information if displayed

**EMAIL VALIDATION RULES:**
✅ MUST contain @ symbol
✅ MUST have valid domain (e.g., .com, .org, .co.uk)
✅ MUST match the company's website domain (e.g., if website is example.com, email should be @example.com)
✅ MUST be explicitly shown on the page (not inferred from patterns)
❌ DO NOT use generic patterns like "contact@", "info@", "hello@" unless actually displayed
❌ DO NOT construct emails from names (e.g., don't create "john@company.com" from "John Smith")
❌ DO NOT use placeholder emails or example emails
❌ DO NOT extract emails from JavaScript code or hidden elements

**PHONE NUMBER EXTRACTION (Priority Order):**
1. **Contact Page** - Look for:
   - Explicitly displayed phone numbers
   - "Call us" sections with phone numbers
   - Phone links (tel: links) - extract the actual number
   - Contact forms with phone number fields showing example or default values
   
2. **Footer** - Look for:
   - Phone numbers in footer contact section
   - Footer links that show phone numbers
   
3. **Header/Navigation** - Look for:
   - Phone numbers in header contact section
   - "Call" buttons with phone numbers
   
4. **About Page** - Look for:
   - Contact sections on about page
   
5. **Team/Leadership Pages** - Look for:
   - Individual team member phone numbers if explicitly shown

**PHONE NUMBER VALIDATION RULES:**
✅ MUST contain digits (0-9)
✅ MAY include country code (+1, +44, etc.) if shown
✅ MAY include formatting (spaces, dashes, parentheses) as shown
✅ MUST be explicitly displayed on the page
✅ SHOULD match the company's location (e.g., US companies typically have +1)
❌ DO NOT guess phone numbers based on location
❌ DO NOT construct phone numbers from patterns
❌ DO NOT use placeholder or example phone numbers
❌ DO NOT extract phone numbers from JavaScript code or hidden elements
❌ DO NOT include phone numbers that are clearly for different companies

**ADDRESS EXTRACTION:**
1. **Contact Page** - Look for:
   - Physical address sections
   - "Visit us" or "Location" sections
   - Maps with address labels
   
2. **Footer** - Look for:
   - Address in footer
   - Footer location information
   
3. **About Page** - Look for:
   - Headquarters location
   - Office locations

**ADDRESS VALIDATION:**
✅ MUST include street address, city, and country at minimum
✅ SHOULD include state/province if applicable
✅ SHOULD include postal/zip code if shown
✅ MUST match the company's stated location
❌ DO NOT guess addresses based on city name
❌ DO NOT use incomplete or partial addresses

**PRIMARY vs ALTERNATE CONTACT:**
- **Primary Email/Phone**: The main contact method shown most prominently (usually on contact page)
- **Alternate Email/Phone**: Additional contact methods shown (e.g., sales@, support@, different departments)
- **ONLY mark as alternate if multiple distinct contact methods are explicitly shown**
- **DO NOT create alternate contacts if only one is found**

**CROSS-REFERENCE VALIDATION:**
- Verify company name matches across all sources
- Verify location matches across website and LinkedIn
- If contact info conflicts between sources, prioritize:
  1. Contact page (most reliable for contact info)
  2. LinkedIn company page
  3. Footer
  4. Other pages

**IF CONTACT INFORMATION IS NOT FOUND:**
- Leave email fields empty ("") rather than guessing
- Leave phone fields empty ("") rather than guessing
- Leave address fields empty ("") rather than guessing
- It's better to have no contact info than incorrect contact info

**Testimonials & Client Feedback (CRITICAL - EXTRACT ALL):**
- Look in: testimonials page, reviews page, case studies, success stories, clients page, homepage testimonial section
- Extract EVERY testimonial found on the website (aim for 5-20 if available)
- For each testimonial extract:
  - **clientName**: The person or company who gave the testimonial
  - **clientTitle**: Their job title (e.g., \"CEO at Acme Corp\", \"Marketing Director\")
  - **clientCompany**: The company they represent (if different from clientName)
  - **feedback**: The complete testimonial text - what they said (full quotes, keep original wording)
  - **satisfactionIndicators**: Extract positive phrases like:
    - \"exceeded expectations\", \"highly recommend\", \"best decision we made\"
    - \"outstanding support\", \"transformed our business\", \"incredible results\"
    - \"5-star service\", \"couldn't be happier\", \"game-changer\"
    - \"responsive team\", \"delivered on time\", \"within budget\"
  - **rating**: If star rating shown (5/5, 4.5 stars, etc.)
  - **date**: When the testimonial was given if shown
  - **source**: \"website\", \"case study\", \"Google reviews\", \"Trustpilot\", etc.
- Use testimonials to infer client expectations met: quality, responsiveness, expertise, support, results
- If case studies found, extract: problem solved, solution provided, results achieved, client satisfaction

**Business Goals & Expectations (IMPORTANT):**
- **Short-term Goals** - Look in: about page, investor relations, press releases, blog posts, annual reports
  - Search for: \"goals for 2024\", \"this year we aim to\", \"current priorities\", \"our focus\", \"Q1/Q2/Q3/Q4 objectives\"
  - Extract specific, measurable goals like revenue targets, expansion plans, product launches, hiring goals
  - Examples: \"Launch mobile app in Q2 2024\", \"Grow customer base by 40%\", \"Expand to European market\"

- **Long-term Goals** - Look in: about page, mission/vision section, investor deck, CEO interviews, strategy pages
  - Search for: \"vision for\", \"by 2025/2026/2027\", \"our long-term strategy\", \"5-year plan\", \"roadmap\"
  - Extract strategic direction, market position goals, transformation objectives
  - Examples: \"Become the leading SaaS platform in healthcare\", \"Achieve unicorn status\", \"Revolutionize the industry\"

- **Client/Partnership Expectations** - Look in: partnerships page, client testimonials, case studies, service agreements
  - Search for: \"we expect\", \"looking for partners who\", \"ideal client\", \"what we value\", \"our requirements\"
  - Extract what they need from vendors/partners/clients (response time, quality standards, communication style)
  - Also infer from testimonials: what clients valued (support quality, communication, expertise, results)
  - Examples: \"24/7 support availability\", \"Transparent communication\", \"Scalability and flexibility\", \"Data security compliance\"

- **Use web search extensively** to find recent press releases, CEO interviews, blog posts about company goals
- If explicit goals not found, infer from company description, recent news, product roadmap, hiring patterns

SEARCH STRATEGY:
1. Homepage - company overview, hero description, key services, current initiatives, featured testimonials
2. About/About-us - company history, founding year, mission, vision, team size, strategic goals
3. Team/Leadership - **EXTRACT ALL PEOPLE**: names, titles, emails, phones, LinkedIn URLs, departments
4. Contact - email addresses, phone numbers, physical address with zip code, contact persons
5. Services/Products/Solutions - ALL services and products with descriptions
6. **Testimonials/Reviews/Success Stories** - ALL client testimonials, feedback, ratings, satisfaction indicators
7. **Case Studies** - client problems, solutions, results, testimonials embedded in case studies
8. Blog/News/Insights - Recent articles with titles, URLs, dates, summaries, company updates, goal announcements
9. Technology/Partners/Integrations - Tech stack, partner companies, integrations
10. Footer - often contains location, social links, contact info
11. Investor Relations/Press - company goals, growth targets, strategic direction
12. Careers/Jobs - hiring goals, team expansion plans (indicates growth ambitions)
13. Use web search extensively to find: press releases, CEO interviews, recent news about company goals and strategy
14. Search for: \"[Company Name] goals\", \"[Company Name] strategy\", \"[Company Name] roadmap\", \"[Company Name] future plans\"
15. Search for: \"[Company Name] team\", \"[Company Name] testimonials\", \"[Company Name] reviews\"

QUALITY REQUIREMENTS:
- **Minimum 3-10 contacts** with names and titles (extract ALL people found on team/about/leadership pages)
- Minimum 3-5 services/products (if available on website)
- **Minimum 5-15 testimonials** (if testimonials/reviews/case studies page exists)
- Minimum 5-10 blog articles (if blog exists)
- Leadership must include at least CEO or Founder with LinkedIn URL if discoverable
- Technology stack should have 5+ items if technology page exists
- Contact info must have at least one email and one phone number
- All URLs must be complete and valid
- For each contact: determine isDecisionMaker and influenceLevel accurately based on title

WEBSITE CONTENT FROM MULTIPLE PAGES:
${combinedContent.substring(0, 75000)}

Now extract the comprehensive company information including services, blogs, technology, and leadership details. Use web search extensively to fill gaps. Return ONLY the JSON object:`;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log("CALLING PERPLEXITY API - extractCompanyInfo");
    console.log(`URL: ${rootUrl}`);
    console.log(`Prompt Length: ${prompt.length} characters`);
    console.log(`Model: sonar`);
    console.log(`Temperature: 0.1`);
    console.log(`Max Tokens: 4000`);
    console.log(`${'='.repeat(60)}\n`);

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${perplexityKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are an expert business intelligence analyst who prioritizes ACCURACY over completeness. You NEVER guess, infer, or fabricate data. You follow a strict data source priority: 1) LinkedIn company page (most reliable), 2) Official website content, 3) Verified web search only for missing data. You validate all data: company names must match across sources, dates must be accurate. For contact information specifically: you ONLY extract emails, phone numbers, and addresses that are EXPLICITLY displayed on the website. You NEVER construct or guess contact information based on patterns. You NEVER use generic patterns like 'contact@domain.com' unless it's actually shown. You validate that emails match the company's domain and that phone numbers match the company's location. Email formats must be valid and explicitly displayed. Phone numbers must be real and explicitly shown. If you cannot verify contact information with 100% confidence, you leave that field empty. You understand that incorrect contact data is worse than missing contact data. You always return properly formatted JSON. When extracting contacts, you only include people explicitly listed on team/leadership pages with verifiable titles. When extracting testimonials, you only include those with clear attribution. You cross-reference all information and prioritize LinkedIn data for company basics (name, industry, size, location, founded year). You are meticulous, thorough, and refuse to extract unverified information.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logPerplexityError("extractCompanyInfo - API Error", new Error(`Perplexity API error: ${error}`), response);
      throw new Error(`Perplexity API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Log the response
    logPerplexityResponse("extractCompanyInfo", response, data, content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let extractedData;

    if (jsonMatch) {
      try {
        extractedData = JSON.parse(jsonMatch[0]);
        logPerplexityResponse("extractCompanyInfo - Parsed", response, data, content, extractedData);
      } catch (parseError) {
        console.error("JSON Parse Error (with match):", parseError);
        console.error("Matched JSON Preview:", jsonMatch[0].substring(0, 500));
        logPerplexityError("extractCompanyInfo - JSON Parse Error", parseError);
        throw parseError;
      }
    } else {
      try {
        extractedData = JSON.parse(content);
        logPerplexityResponse("extractCompanyInfo - Parsed (no match)", response, data, content, extractedData);
      } catch (parseError) {
        console.error("JSON Parse Error (no match):", parseError);
        console.error("Full Content Preview:", content.substring(0, 500));
        logPerplexityError("extractCompanyInfo - JSON Parse Error (no match)", parseError);
        throw parseError;
      }
    }

    return extractedData;
  } catch (error) {
    logPerplexityError("extractCompanyInfo - Exception", error);
    throw error;
  }
}

async function extractFromLinkedInUrl(linkedinUrl: string, perplexityKey: string) {
  const prompt = `You are an expert business intelligence analyst specializing in LinkedIn company data extraction. Your task is to extract COMPREHENSIVE and ACCURATE company information from the LinkedIn company page.

CRITICAL: You have DIRECT ACCESS to this LinkedIn page. Extract ALL available information with 100% accuracy.

LinkedIn Company Page: ${linkedinUrl}

EXTRACTION REQUIREMENTS:

1. **Company Basics** (REQUIRED - extract from LinkedIn \"About\" section):
   - Official company name (exact match from LinkedIn)
   - Industry/sector (from LinkedIn)
   - Company size (exact format: \"X-Y employees\")
   - Founded year (from LinkedIn About)
   - Headquarters location (City, State/Province, Country)
   - Company description (full description from LinkedIn About)
   - Website URL (from LinkedIn)
   - Specialties/focus areas (from LinkedIn)

2. **Company Information** (extract from About section):
   - Mission statement
   - Vision statement
   - Company type (Public, Private, Partnership, etc.)
   - Recent updates and posts about goals, strategy

3. **Leadership & People** (CRITICAL - extract from \"People\" section):
   - Navigate to the \"People\" tab on LinkedIn
   - Extract ALL employees, focusing on:
     * C-level executives (CEO, CTO, CFO, COO, etc.)
     * VPs and Vice Presidents
     * Directors and Heads of departments
     * Managers and Team Leads
   - For each person extract:
     * Full name
     * Current job title at this company
     * LinkedIn profile URL
     * Department/division if mentioned
     * Brief headline/bio if visible
   - Minimum 10-20 people if available
   - Mark decision makers (C-level, VP, Director, Manager roles)

4. **Contact Information (CRITICAL - ACCURACY REQUIRED)**:
   - Phone number from LinkedIn - ONLY if explicitly shown on LinkedIn company page
   - Company email/contact info - ONLY if explicitly displayed on LinkedIn
   - Physical address - ONLY if explicitly shown (full address with zip code)
   - ⚠️ DO NOT guess, infer, or construct contact information
   - ⚠️ DO NOT use generic patterns unless actually displayed
   - ⚠️ If contact info is not visible on LinkedIn, leave fields empty

5. **Social Profiles**:
   - The LinkedIn URL itself: ${linkedinUrl}
   - Any other social links shown on LinkedIn (Twitter, Facebook, etc.)

6. **Recent Activity** (from LinkedIn posts/updates):
   - Recent company posts about:
     * Product launches
     * Growth milestones
     * Strategic initiatives
     * Hiring announcements
     * Company goals and objectives
   - Extract short-term goals (next 6-12 months)
   - Extract long-term vision (2-5 years)

7. **Services/Products**:
   - Infer from company description, specialties, and recent posts
   - Extract what the company offers

8. **Company Culture & Expectations**:
   - From employee testimonials, company posts, about section
   - What the company values in partnerships/collaborations

ACCURACY RULES:
✅ Extract ONLY what you can see on the LinkedIn page
✅ Use exact text from LinkedIn (especially for name, industry, size)
✅ For employee data, extract all visible employees with their exact titles
✅ If a field is not visible on LinkedIn, leave it empty
✅ Verify the LinkedIn page is for a company, not a person

Return ONLY valid JSON in this exact structure:

{
  \"companyInfo\": {
    \"name\": \"Official company name from LinkedIn\",
    \"industry\": \"Industry from LinkedIn\",
    \"description\": \"Full company description from LinkedIn About\",
    \"location\": \"City, State/Province, Country\",
    \"zipCode\": \"Postal code if shown\",
    \"size\": \"Employee count in LinkedIn format (e.g., '51-200 employees')\",
    \"founded\": \"Year founded (YYYY)\",
    \"companyType\": \"Public/Private/Partnership/etc.\",
    \"specialties\": \"Specialties from LinkedIn\",
    \"mission\": \"Mission statement if shown\",
    \"vision\": \"Vision statement if shown\"
  },
  \"contactInfo\": {
    \"email\": \"Contact email ONLY if explicitly shown on LinkedIn company page. DO NOT guess or construct. Leave empty if not visible.\",
    \"primaryEmail\": \"Primary email ONLY if explicitly displayed on LinkedIn. This is the main contact email shown on LinkedIn. Leave empty if not found.\",
    \"alternateEmail\": \"Alternate email ONLY if multiple distinct emails are explicitly shown on LinkedIn. DO NOT create if only one is found. Leave empty if not found.\",
    \"phone\": \"Phone number with country code ONLY if explicitly shown on LinkedIn company page. DO NOT guess. Leave empty if not visible.\",
    \"primaryPhone\": \"Primary phone ONLY if explicitly displayed on LinkedIn. Include country code if shown. Leave empty if not found.\",
    \"alternatePhone\": \"Alternate phone ONLY if multiple distinct phone numbers are explicitly shown on LinkedIn. DO NOT create if only one is found. Leave empty if not found.\",
    \"address\": \"Full physical address ONLY if explicitly shown on LinkedIn (full address with zip code). DO NOT guess. Leave empty if not visible.\",
    \"website\": \"Company website from LinkedIn (if shown)\"
  },
  \"leadership\": {
    \"ceo\": {
      \"name\": \"CEO name from LinkedIn People\",
      \"title\": \"Exact title from LinkedIn\",
      \"linkedin\": \"LinkedIn profile URL\",
      \"bio\": \"Headline/bio if visible\"
    },
    \"founder\": {
      \"name\": \"Founder name from LinkedIn People\",
      \"title\": \"Exact title\",
      \"linkedin\": \"LinkedIn profile URL\",
      \"bio\": \"Headline/bio if visible\"
    },
    \"owner\": null,
    \"primaryContact\": {
      \"name\": \"Primary contact if identified\",
      \"title\": \"Their title\",
      \"email\": \"Email if available\",
      \"phone\": \"Phone if available\"
    }
  },
  \"contacts\": [
    {
      \"name\": \"Full name from LinkedIn People section\",
      \"title\": \"Exact job title from LinkedIn\",
      \"linkedin\": \"Their LinkedIn profile URL\",
      \"department\": \"Department/division if visible\",
      \"isDecisionMaker\": true or false (C-level, VP, Director, Manager = true),
      \"influenceLevel\": \"high\" (C-level, VP), \"medium\" (Director, Manager), or \"low\"
    }
  ],
  \"services\": [
    {
      \"name\": \"Service/product name\",
      \"description\": \"What it does (infer from company info)\"
    }
  ],
  \"blogs\": [],
  \"technology\": {
    \"stack\": [],
    \"partners\": [],
    \"integrations\": []
  },
  \"challenges\": [
    \"Business challenge or pain point mentioned in posts or description\"
  ],
  \"competitors\": [
    {
      \"name\": \"Competitor name if mentioned\",
      \"description\": \"Brief comparison\"
    }
  ],
  \"businessInfo\": {
    \"shortTermGoals\": \"Goals for next 6-12 months (from recent posts, announcements)\",
    \"longTermGoals\": \"Long-term vision 2-5 years (from About, vision, strategic posts)\",
    \"expectations\": \"What company expects from partnerships (infer from culture, values)\"
  },
  \"testimonials\": [],
  \"socialProfiles\": {
    \"linkedin\": \"${linkedinUrl}\",
    \"twitter\": \"Twitter URL if shown on LinkedIn\",
    \"facebook\": \"Facebook URL if shown\",
    \"instagram\": \"Instagram URL if shown\"
  }
}

CRITICAL FOCUS AREAS:
1. Extract AT LEAST 10-20 employees from the People section with exact titles
2. Get accurate company size, industry, and founded year from About
3. Extract recent posts to understand short-term and long-term goals
4. Ensure all names and titles are exact matches from LinkedIn
5. Mark decision makers correctly based on title seniority

Now extract the comprehensive company information from this LinkedIn page. Return ONLY the JSON object.`;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log("CALLING PERPLEXITY API - extractFromLinkedInUrl");
    console.log(`LinkedIn URL: ${linkedinUrl}`);
    console.log(`Prompt Length: ${prompt.length} characters`);
    console.log(`Model: sonar`);
    console.log(`Temperature: 0.1`);
    console.log(`Max Tokens: 4000`);
    console.log(`${'='.repeat(60)}\n`);

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${perplexityKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are an expert LinkedIn data extraction specialist. You have direct access to LinkedIn company pages and can extract all visible information with 100% accuracy. You extract company information, employee lists with their titles, recent company posts, and all available contact details. For contact information specifically: you ONLY extract emails, phone numbers, and addresses that are EXPLICITLY displayed on the LinkedIn company page. You NEVER guess, infer, or construct contact information. You NEVER use generic patterns unless actually shown. If contact information is not visible on LinkedIn, you leave those fields empty. You understand that incorrect contact data is worse than missing contact data. You follow LinkedIn's exact formatting for company size, industry, and other fields. You always return properly formatted JSON. You prioritize extracting comprehensive employee/people data from the LinkedIn People section, focusing on decision makers and leadership.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logPerplexityError("extractFromLinkedInUrl - API Error", new Error(`Perplexity API error: ${error}`), response);
      throw new Error(`Perplexity API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Log the response
    logPerplexityResponse("extractFromLinkedInUrl", response, data, content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let extractedData;

    if (jsonMatch) {
      try {
        extractedData = JSON.parse(jsonMatch[0]);
        logPerplexityResponse("extractFromLinkedInUrl - Parsed", response, data, content, extractedData);
      } catch (parseError) {
        console.error("JSON Parse Error (with match):", parseError);
        console.error("Matched JSON Preview:", jsonMatch[0].substring(0, 500));
        logPerplexityError("extractFromLinkedInUrl - JSON Parse Error", parseError);
        throw parseError;
      }
    } else {
      try {
        extractedData = JSON.parse(content);
        logPerplexityResponse("extractFromLinkedInUrl - Parsed (no match)", response, data, content, extractedData);
      } catch (parseError) {
        console.error("JSON Parse Error (no match):", parseError);
        console.error("Full Content Preview:", content.substring(0, 500));
        logPerplexityError("extractFromLinkedInUrl - JSON Parse Error (no match)", parseError);
        throw parseError;
      }
    }

    return extractedData;
  } catch (error) {
    logPerplexityError("extractFromLinkedInUrl - Exception", error);
    throw error;
  }
}

function extractLocationCity(location: string): string {
  if (!location) return '';
  const parts = location.split(',').map(p => p.trim());
  return parts[0] || '';
}

function extractLocationCountry(location: string): string {
  if (!location) return '';
  const parts = location.split(',').map(p => p.trim());
  return parts[parts.length - 1] || '';
}

function findLogoUrl(crawlResults: CrawlResult[]): string {
  for (const result of crawlResults) {
    const logoPatterns = [
      /<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']/i,
      /<link[^>]+rel=[\"']icon[\"'][^>]+href=[\"']([^\"']+)[\"']/i,
      /<link[^>]+rel=[\"']apple-touch-icon[\"'][^>]+href=[\"']([^\"']+)[\"']/i,
      /<img[^>]+class=[\"'][^\"']*logo[^\"']*[\"'][^>]+src=[\"']([^\"']+)[\"']/i,
      /<img[^>]+alt=[\"'][^\"']*logo[^\"']*[\"'][^>]+src=[\"']([^\"']+)[\"']/i,
    ];

    for (const pattern of logoPatterns) {
      const match = result.content.match(pattern);
      if (match && match[1]) {
        let url = match[1];
        if (url.startsWith('//')) {
          url = 'https:' + url;
        } else if (url.startsWith('/')) {
          const baseUrl = new URL(result.url);
          url = baseUrl.origin + url;
        }
        return url;
      }
    }
  }
  return '';
}
