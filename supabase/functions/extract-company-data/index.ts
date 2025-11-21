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
  emails?: string[];
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

    const authHeader = req.headers.get("Authorization");
    const isLinkedInUrl = url.includes('linkedin.com/company/') || url.includes('linkedin.com/in/');

    let crawledData: CrawlResult[] = [];
    let extractedInfo;

    if (isLinkedInUrl) {
      extractedInfo = await extractFromLinkedInUrl(url, perplexityKey);
    } else {
      crawledData = await crawlWebsiteWithCheerio(url, authHeader);
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
        recentNews: extractedInfo.recentNews || [],
        marketIntelligence: {
          recentDevelopments: extractedInfo.marketIntelligence?.recentDevelopments || '',
          fundingStatus: extractedInfo.marketIntelligence?.fundingStatus || '',
          growthIndicators: extractedInfo.marketIntelligence?.growthIndicators || [],
          marketPosition: extractedInfo.marketIntelligence?.marketPosition || '',
          publicPerception: extractedInfo.marketIntelligence?.publicPerception || ''
        },
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

async function crawlWebsiteWithCheerio(startUrl: string, authHeader: string): Promise<CrawlResult[]> {
  console.log('Calling crawl-website function with Cheerio:', startUrl);

  try {
    const crawlerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/crawl-website`;

    const response = await fetch(crawlerUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: startUrl,
        maxPages: 15,
        followLinks: false
      })
    });

    if (!response.ok) {
      console.error('Crawler function error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`Crawler function failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error('Crawler returned error:', data.error);
      throw new Error(`Crawler error: ${data.error}`);
    }

    console.log(`Crawler succeeded. Pages crawled: ${data.data.pages.length}`);
    console.log(`Total emails found: ${data.data.summary.totalEmails}`);
    console.log(`Total social links found: ${data.data.summary.totalSocialLinks}`);

    // Convert crawler response to CrawlResult format
    const results: CrawlResult[] = data.data.pages.map((page: any) => ({
      url: page.url,
      title: page.title || '',
      content: page.text || page.content || '',
      links: page.links || [],
      socialLinks: page.socialLinks || [],
      emails: page.emails || [],
    }));

    return results;
  } catch (error) {
    console.error('Error in crawlWebsiteWithCheerio:', error);
    // Fallback to basic fetch if crawler fails
    console.log('Falling back to basic fetch...');
    return await fallbackCrawl(startUrl);
  }
}

async function fallbackCrawl(startUrl: string): Promise<CrawlResult[]> {
  console.log('Using fallback crawler for:', startUrl);

  try {
    const response = await fetch(startUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();

    // Basic extraction
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract text
    let text = html
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<style[^>]*>.*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 20000);

    // Extract emails
    const emailPattern = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const emails = new Set<string>();
    let emailMatch;
    while ((emailMatch = emailPattern.exec(html)) !== null) {
      const email = emailMatch[1].toLowerCase();
      if (!email.includes('.png') && !email.includes('.jpg') &&
          !email.includes('example.com') && !email.includes('domain.com')) {
        emails.add(email);
      }
    }

    // Extract social links
    const socialPatterns = [
      /https?:\/\/(www\.)?(linkedin\.com\/company\/[^\s"'<>]+)/gi,
      /https?:\/\/(www\.)?(linkedin\.com\/in\/[^\s"'<>]+)/gi,
      /https?:\/\/(www\.)?(twitter\.com\/[^\s"'<>]+)/gi,
      /https?:\/\/(www\.)?(x\.com\/[^\s"'<>]+)/gi,
    ];

    const socialLinks = new Set<string>();
    for (const pattern of socialPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        socialLinks.add(match[0]);
      }
    }

    return [{
      url: startUrl,
      title,
      content: text,
      links: [],
      socialLinks: Array.from(socialLinks),
      emails: Array.from(emails),
    }];
  } catch (error) {
    console.error('Fallback crawl error:', error);
    return [];
  }
}

async function extractCompanyInfo(crawlResults: CrawlResult[], perplexityKey: string, rootUrl: string) {
  const allSocialLinks = new Set<string>();
  const allEmails = new Set<string>();
  crawlResults.forEach(result => {
    result.socialLinks.forEach(link => allSocialLinks.add(link));
    result.emails?.forEach(email => allEmails.add(email));
  });

  const combinedContent = crawlResults
    .map(r => `PAGE: ${r.title || r.url}\nURL: ${r.url}\nEMAILS FOUND: ${r.emails?.join(', ') || 'None'}\nCONTENT: ${r.content.substring(0, 12000)}\n\n`)
    .join('\n---\n\n');

  console.log(`Found ${allEmails.size} unique email addresses across all pages:`, Array.from(allEmails));

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
5. **LEADERSHIP** - ABSOLUTELY REQUIRED (minimum CEO/Founder - search LinkedIn People, About page, team page)
6. **TECHNOLOGY STACK** - REQUIRED if tech company (search job postings, about page, partners page, footer)
7. **BLOGS/ARTICLES** - REQUIRED if blog exists (extract from /blog, /news, /insights pages)
8. budgetRange - OPTIONAL but highly valuable (look for pricing pages, case studies)

🔴 CRITICAL EXTRACTION PRIORITY:
- If the company has a team/about/leadership page → MUST extract leadership
- If the company has a blog/news section → MUST extract at least 5-10 blog posts
- If the company is tech-related → MUST extract technology stack (languages, frameworks, platforms)

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

DISCOVERED EMAIL ADDRESSES (from website crawl):
${Array.from(allEmails).slice(0, 10).join(', ') || 'None found - search website and LinkedIn for contact emails'}

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
  \"recentNews\": [
    {
      \"title\": \"News article or press release title\",
      \"date\": \"Publication date (any format)\",
      \"source\": \"Source publication (e.g., 'TechCrunch', 'Company Blog', 'Press Release')\",
      \"url\": \"Full URL to the article\",
      \"summary\": \"2-3 sentence summary of the news\",
      \"category\": \"Category: 'funding', 'product_launch', 'partnership', 'expansion', 'award', 'leadership_change', 'general'\",
      \"impact\": \"Brief note on how this impacts the company's business or strategy\"
    }
  ],
  \"marketIntelligence\": {
    \"recentDevelopments\": \"Summary of recent company developments in last 6-12 months from news search\",
    \"fundingStatus\": \"Funding information if available (e.g., 'Series B $20M', 'Bootstrapped', 'Public Company')\",
    \"growthIndicators\": [\"Signs of growth: hiring announcements, office expansion, new markets, product launches\"],
    \"marketPosition\": \"Brief assessment of market position based on news and company information\",
    \"publicPerception\": \"Public perception and reputation based on news articles and media coverage\"
  },
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

**Blog Articles (MANDATORY IF BLOG EXISTS):**
🚨 IF THE COMPANY HAS A BLOG/NEWS SECTION - THIS IS REQUIRED 🚨

STEP 1 - Check for Blog/News Section:
- Look in website crawl results for pages with these URLs:
  * /blog, /news, /insights, /resources, /articles
  * /press, /updates, /posts, /content
- Check page titles for: "Blog", "News", "Insights", "Resources", "Articles"

STEP 2 - Extract from Website Content:
- If blog page found in crawl results:
  * Extract article titles from blog listing page
  * Extract article URLs (full URLs starting with http/https)
  * Extract publication dates (any format: "March 15, 2024", "2024-03-15", "3 days ago")
  * Extract preview text or summaries
  * Extract author names if shown
- Look for article metadata: <h2>, <h3> tags often contain article titles
- Look for date patterns in content: dates near article titles

STEP 3 - Web Search for Blog (IF NOT FOUND):
- Search: "[Company Name] blog"
- Search: "[Company Name] articles"
- Search: "[Company Name] news"
- Search: "site:[company domain] blog"
- Access the blog page and extract recent articles

STEP 4 - Required Information Per Article:
- ✅ Title (REQUIRED) - The article headline
- ✅ URL (REQUIRED) - Complete URL (e.g., "https://company.com/blog/article-title")
- ✅ Date (REQUIRED if available) - Publication date
- ✅ Summary (REQUIRED) - 1-2 sentence summary of what the article is about
- ✅ Author (OPTIONAL) - Author name if mentioned

STEP 5 - Minimum Requirements:
- ✅ If blog exists: Extract at least 5-10 recent articles
- ✅ Each article must have: title, URL, summary
- ✅ Prioritize most recent articles (last 6-12 months)
- ❌ DO NOT leave empty if blog section exists on website
- ✅ Extract from crawled content - check "PAGE:" sections for /blog or /news URLs

STEP 6 - Example Format:
{
  "title": "How AI is Transforming Healthcare",
  "url": "https://example.com/blog/ai-healthcare",
  "date": "March 15, 2024",
  "summary": "Exploring the impact of artificial intelligence on patient care and medical diagnostics. Discusses real-world applications and future trends.",
  "author": "Dr. Jane Smith"
}

**Technology Stack (MANDATORY FOR TECH COMPANIES):**
🚨 IF THIS IS A TECHNOLOGY COMPANY - THIS SECTION IS REQUIRED 🚨

STEP 1 - Check if Tech Company:
- Look at industry, description, services
- If company builds software, provides SaaS, IT services, or tech solutions → THIS IS MANDATORY

STEP 2 - Extract from Website:
- Technology page (e.g., "/technology", "/stack", "/how-it-works")
- About page (mentions of technologies used)
- Partners page (technology partners like AWS, Microsoft, Google Cloud)
- Integration pages (platforms they integrate with)
- Footer (often shows "Powered by..." or partner logos)
- Case studies (technologies used in implementations)

STEP 3 - Web Search for Technology:
- Search: "[Company Name] technology stack"
- Search: "[Company Name] tech stack"
- Search: "[Company Name] powered by"
- Search: "[Company Name] built with"
- Look for: GitHub repositories, tech blog posts, engineering blog

STEP 4 - Job Postings Search:
- Search: "[Company Name] jobs" or "[Company Name] careers"
- Look at job requirements to identify technologies:
  * Programming languages (JavaScript, Python, Java, Go, etc.)
  * Frameworks (React, Vue, Angular, Django, Rails, etc.)
  * Databases (PostgreSQL, MongoDB, MySQL, Redis, etc.)
  * Cloud platforms (AWS, Azure, Google Cloud, Heroku, etc.)
  * DevOps tools (Docker, Kubernetes, Jenkins, etc.)

STEP 5 - Common Technology Categories:
- **Frontend**: React, Vue, Angular, Next.js, HTML/CSS, TypeScript
- **Backend**: Node.js, Python, Ruby, Java, .NET, PHP, Go
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch
- **Cloud**: AWS, Azure, Google Cloud, DigitalOcean, Heroku
- **DevOps**: Docker, Kubernetes, Jenkins, CircleCI, GitHub Actions
- **Analytics**: Google Analytics, Mixpanel, Segment, Amplitude
- **Monitoring**: Datadog, New Relic, Sentry, LogRocket

STEP 6 - Minimum Requirements:
- ✅ Tech companies MUST have at least 3-5 technologies listed
- ✅ Include: programming languages, frameworks, cloud platforms
- ❌ DO NOT leave empty for obvious tech companies
- ✅ If can't find directly, infer from: job postings, industry standards, partner integrations

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

**Leadership (CRITICAL - MANDATORY EXTRACTION WITH WEB SEARCH):**
🚨 THIS IS ABSOLUTELY REQUIRED - DO NOT SKIP THIS SECTION 🚨

STEP 1 - LinkedIn People Search (PRIMARY SOURCE):
- LinkedIn Company URL: ${linkedinCompanyUrls[0] || 'SEARCH FOR IT'}
- Go to the "People" section of the LinkedIn company page
- Extract ALL executives and decision makers you find there:
  * CEO, CTO, CFO, COO, President
  * Founders and Co-Founders
  * VPs and Vice Presidents
  * Directors and Heads of departments
- For EACH person extract: Full name, exact title, LinkedIn profile URL, brief headline

STEP 2 - Discovered LinkedIn Profiles:
- Found LinkedIn profile URLs: ${linkedinProfileUrls.slice(0, 10).join(', ') || 'None - search for them'}
- If LinkedIn profile URLs found above, search each one to get:
  * Full name
  * Current job title at this company
  * LinkedIn profile URL
  * Brief bio/headline
  * Email if visible

STEP 3 - Website Team/About/Leadership Pages:
- Look in the provided website content for:
  * Team page (look for "team", "about", "leadership", "our team" in URLs/titles)
  * About page leadership section
  * Leadership/Management page
- Extract EVERY person mentioned with a title
- Include their name, title, email (if shown), phone (if shown)

STEP 4 - Web Search (MANDATORY IF NOT FOUND):
- If leadership not found in LinkedIn or website, perform these searches:
  * "[Company Name] CEO"
  * "[Company Name] founder"
  * "[Company Name] leadership team"
  * "[Company Name] executives"
  * "[Company Name] management team"
- Search news articles and press releases mentioning leadership
- Extract: CEO name, Founder name(s), key executives

STEP 5 - Minimum Requirements:
- ✅ MUST have at least CEO OR Founder (minimum 1 leader)
- ✅ PREFER to have 3-10 leadership/team members
- ✅ Each leader MUST have: name, title
- ✅ Each leader SHOULD have: LinkedIn URL if findable
- ✅ Each leader OPTIONALLY have: email, phone, bio

VALIDATION:
- ❌ DO NOT return empty leadership section
- ❌ DO NOT skip if you can't find on website - USE WEB SEARCH
- ✅ Search "[Company Name] team" to find team members
- ✅ Use LinkedIn company "People" section as primary source

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
DISCOVERED EMAILS TO VALIDATE: ${Array.from(allEmails).join(', ')}

1. **Validate Discovered Emails** - First, verify the emails found above:
   - Check if they match the company's domain (${new URL(rootUrl).hostname})
   - Determine which are primary (general contact) vs alternate (department-specific)
   - Prioritize: contact@, info@, hello@, support@, sales@

2. **Contact Page** - Look for:
   - Explicitly displayed email addresses (e.g., "Email: info@company.com")
   - Contact forms with pre-filled or visible email addresses
   - "Contact us" sections with email listed
   - Email links (mailto: links) - extract the actual email address

3. **LinkedIn Company Page** - Search for:
   - Email addresses shown on LinkedIn company page
   - Contact information in LinkedIn About section

4. **Footer** - Look for:
   - Email addresses in footer contact section
   - Footer links that show email addresses

5. **Header/Navigation** - Look for:
   - Contact links that reveal email addresses
   - Navigation menus with contact information

6. **About Page** - Look for:
   - Contact sections on about page
   - Team member emails if explicitly listed

7. **Team/Leadership Pages** - Look for:
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

**ADDRESS EXTRACTION (FULL PHYSICAL ADDRESS WITH ZIP CODE):**
CRITICAL: Extract complete physical address in this format:
"Street Address, City, State/Province, Country, Postal/Zip Code"

1. **Contact Page** - Look for:
   - Physical address sections
   - "Visit us" or "Location" sections
   - Maps with address labels
   - Complete address with street, city, state, country, zip

2. **Footer** - Look for:
   - Address in footer (often shows full address with zip code)
   - Footer location information

3. **About Page** - Look for:
   - Headquarters location with full address
   - Office locations with complete addresses

4. **LinkedIn Company Page** - Search for:
   - Headquarters address in LinkedIn About section
   - Address may include full street address and postal code

5. **Web Search** - If no complete address found:
   - Search: "[Company Name] headquarters address"
   - Search: "[Company Name] office location postal code"
   - Verify address matches the company's stated location

**ADDRESS VALIDATION:**
✅ MUST include street name/number (e.g., "123 Main Street" not just "San Francisco")
✅ MUST include city
✅ SHOULD include state/province if applicable (especially for US addresses)
✅ MUST include country
✅ SHOULD include postal/zip code (REQUIRED for complete address)
✅ Format example: "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
✅ Format example: "20 Cooper's Row, London EC3N 2BQ, United Kingdom"
❌ DO NOT use incomplete addresses like "San Francisco, CA" without street address
❌ DO NOT guess street addresses
❌ DO NOT use PO Box unless it's the only address shown

**ZIP/POSTAL CODE EXTRACTION:**
- Look specifically for: zip code, postal code, postcode
- Common patterns: US (12345 or 12345-6789), UK (SW1A 1AA), CA (A1A 1A1)
- Extract from: contact page, footer, Google Maps embed, address labels

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

**NEWS & ARTICLES WEB SEARCH (CRITICAL - GATHER RECENT INFORMATION):**
Use web search to find recent news, press releases, and articles about the company:

1. **Search Queries to Run:**
   - "[Company Name] news"
   - "[Company Name] press release"
   - "[Company Name] recent announcements"
   - "[Company Name] funding round"
   - "[Company Name] product launch"
   - "[Company Name] acquisition merger"
   - "[Company Name] expansion growth"
   - "[Company Name] CEO interview"
   - "[Company Name] awards recognition"

2. **Information to Extract from News:**
   - Recent product launches or updates (last 6-12 months)
   - Funding announcements (Series A, B, C, IPO plans)
   - Partnerships or strategic alliances announced
   - Company expansion (new markets, offices, hiring)
   - Awards, recognition, or industry rankings
   - Leadership changes or appointments
   - Customer wins or major contracts
   - Challenges or setbacks mentioned in media

3. **Use News to Understand:**
   - Current business priorities and focus areas
   - Market position and competitive landscape
   - Growth trajectory and momentum
   - Industry trends affecting the company
   - Public perception and reputation
   - Strategic direction and future plans

**Business Goals & Expectations (IMPORTANT):**
- **Short-term Goals** - Look in: about page, investor relations, press releases, blog posts, annual reports, recent news articles
  - Search for: "goals for 2024", "this year we aim to", "current priorities", "our focus", "Q1/Q2/Q3/Q4 objectives"
  - Search news for: recent announcements, product roadmap mentions, expansion plans
  - Extract specific, measurable goals like revenue targets, expansion plans, product launches, hiring goals
  - Examples: "Launch mobile app in Q2 2024", "Grow customer base by 40%", "Expand to European market"

- **Long-term Goals** - Look in: about page, mission/vision section, investor deck, CEO interviews, strategy pages, news articles
  - Search for: "vision for", "by 2025/2026/2027", "our long-term strategy", "5-year plan", "roadmap"
  - Search news for: CEO vision statements, strategic initiatives, market position goals
  - Extract strategic direction, market position goals, transformation objectives
  - Examples: "Become the leading SaaS platform in healthcare", "Achieve unicorn status", "Revolutionize the industry"

- **Client/Partnership Expectations** - Look in: partnerships page, client testimonials, case studies, service agreements
  - Search for: "we expect", "looking for partners who", "ideal client", "what we value", "our requirements"
  - Extract what they need from vendors/partners/clients (response time, quality standards, communication style)
  - Also infer from testimonials: what clients valued (support quality, communication, expertise, results)
  - Examples: "24/7 support availability", "Transparent communication", "Scalability and flexibility", "Data security compliance"

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

QUALITY REQUIREMENTS (MANDATORY MINIMUMS):

🚨 ABSOLUTELY REQUIRED - NO EXCEPTIONS:
1. **LEADERSHIP**:
   - ✅ MUST have at least 1 leader (CEO, Founder, or President)
   - ✅ PREFER 3-10 leadership/team members
   - ✅ Search LinkedIn People section, team page, about page, web search
   - ❌ NEVER return empty leadership - use web search to find CEO/Founder

2. **BLOGS** (if blog exists):
   - ✅ MUST extract 5-10 recent articles if blog/news section exists
   - ✅ Each article needs: title, URL, date (if available), summary
   - ✅ Check crawled pages for /blog, /news, /insights URLs
   - ❌ DO NOT skip if blog exists on website

3. **TECHNOLOGY STACK** (if tech company):
   - ✅ MUST have 3-5+ technologies if company is tech-related
   - ✅ Include: languages, frameworks, cloud platforms, tools
   - ✅ Search job postings, partners page, about page, footer
   - ❌ DO NOT leave empty for SaaS/software/IT companies

4. **CONTACTS**:
   - ✅ Minimum 3-10 contacts with names and titles
   - ✅ Extract ALL people found on team/about/leadership pages
   - ✅ For each: determine isDecisionMaker and influenceLevel accurately

5. **SERVICES/PRODUCTS**:
   - ✅ Minimum 3-5 services/products (if available on website)
   - ✅ Each service needs name and comprehensive description

6. **TESTIMONIALS** (if exists):
   - ✅ Minimum 5-15 testimonials (if testimonials/reviews/case studies page exists)
   - ✅ Extract ALL testimonials from testimonials page

7. **CONTACT INFO**:
   - ✅ Must have at least one email address (use discovered emails)
   - ✅ Must have full physical address with street, city, country, postal code
   - ✅ Should have at least one phone number

8. **GENERAL**:
   - ✅ All URLs must be complete and valid (start with http:// or https://)
   - ✅ Company description must be 2-4 sentences minimum
   - ✅ Short-term and long-term goals required (search news/press releases)

VALIDATION CHECKLIST BEFORE RETURNING:
□ Leadership section has at least 1 leader with name + title
□ If blog exists → extracted 5-10 blog posts
□ If tech company → extracted 3-5+ technologies
□ Contacts has 3-10 people with titles
□ Services has 3-5+ offerings
□ At least one email address included
□ Full address with street + postal code (if found)
□ Company description is 2+ sentences

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
            content: "You are an expert business intelligence analyst who AGGRESSIVELY extracts comprehensive company data while maintaining accuracy. You follow a strict data source priority: 1) LinkedIn company page (most reliable), 2) Official website content, 3) Web search for missing data. Your PRIMARY MISSION: Extract leadership, blogs, and technology stack - these are MANDATORY. For contact information: you ONLY extract emails, phone numbers, and addresses that are EXPLICITLY displayed. You validate emails match the company domain. CRITICAL EXTRACTION RULES: 1) LEADERSHIP IS MANDATORY - Always extract at least CEO/Founder using LinkedIn People section, team pages, or web search '[Company Name] CEO'. NEVER return empty leadership. 2) BLOGS ARE MANDATORY if blog exists - Extract 5-10 articles from /blog or /news pages found in crawl results. 3) TECHNOLOGY IS MANDATORY for tech companies - Extract from job postings, partners page, footer, or web search '[Company Name] tech stack'. 4) USE WEB SEARCH EXTENSIVELY - If data not on website/LinkedIn, search for it. You are aggressive about finding information through web search but accurate about what you report. You always return properly formatted JSON with comprehensive data.",
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
  \"recentNews\": [
    {
      \"title\": \"News article or press release title from web search\",
      \"date\": \"Publication date\",
      \"source\": \"Source publication\",
      \"url\": \"Full URL to the article\",
      \"summary\": \"2-3 sentence summary\",
      \"category\": \"Category type\",
      \"impact\": \"Impact on company's business\"
    }
  ],
  \"marketIntelligence\": {
    \"recentDevelopments\": \"Summary of recent developments from web search about this company\",
    \"fundingStatus\": \"Funding information if available from news\",
    \"growthIndicators\": [\"Growth signs from news and LinkedIn activity\"],
    \"marketPosition\": \"Market position assessment\",
    \"publicPerception\": \"Public perception from news coverage\"
  },
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
6. **PERFORM WEB SEARCH** for recent news and articles about this company using queries:
   - "[Company Name] news"
   - "[Company Name] press release"
   - "[Company Name] recent announcements"
   - Extract at least 5-10 recent news articles with titles, dates, sources, URLs, summaries
7. **EXTRACT MARKET INTELLIGENCE** from news search results

Now extract the comprehensive company information from this LinkedIn page AND perform web search for recent news. Return ONLY the JSON object.`;

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
            content: "You are an expert LinkedIn data extraction specialist who AGGRESSIVELY extracts comprehensive company and people data. You have direct access to LinkedIn company pages. Your PRIMARY MISSION: Extract ALL employees from LinkedIn People section - this is MANDATORY (minimum 10-20 people, focusing on executives, VPs, directors, managers). CRITICAL RULES: 1) PEOPLE/LEADERSHIP IS MANDATORY - Navigate to 'People' tab and extract every executive, VP, director, manager with their exact title and LinkedIn URL. NEVER return empty contacts array. 2) USE WEB SEARCH - Search '[Company Name] CEO', '[Company Name] leadership team', '[Company Name] news' to supplement LinkedIn data. 3) EXTRACT RECENT NEWS - Search for news about this company and include 5-10 recent articles. For contact info: ONLY extract emails/phones/addresses EXPLICITLY shown on LinkedIn. You follow LinkedIn's exact formatting. You AGGRESSIVELY search for leadership and team data but remain accurate. You always return properly formatted JSON with comprehensive employee lists and recent news.",
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
