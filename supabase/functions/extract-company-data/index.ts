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

    const crawledData = await crawlWebsite(url);
    const extractedInfo = await extractCompanyInfo(crawledData, perplexityKey, url);

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
        services: extractedInfo.services || [],
        blogs: extractedInfo.blogs || [],
        technology: {
          stack: extractedInfo.technology?.stack || [],
          partners: extractedInfo.technology?.partners || [],
          integrations: extractedInfo.technology?.integrations || []
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
    'case-studies',
    'portfolio',
    'careers',
    'jobs',
    'technology',
    'partners'
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

  const prompt = `You are an expert business intelligence analyst specializing in company research and data extraction. Your task is to extract comprehensive, accurate, and detailed company information from the provided website content AND use your web search capabilities to find additional up-to-date information.

IMPORTANT: You have access to real-time web search. Use it extensively to:
- Verify and enhance the information from the website
- Find missing details like contact information, founding year, company size
- Get the latest company news and updates
- Find leadership information (CEO, Founder, Owner) from LinkedIn, news, press releases
- Extract blog articles from their blog/news pages
- Identify technology stack, partners, and integrations from their website and web sources
- Cross-reference information for accuracy

ROOT DOMAIN: ${rootUrl}

DISCOVERED SOCIAL MEDIA PROFILES:
- LinkedIn Company: ${linkedinCompanyUrls.join(', ') || 'Not found'}
- LinkedIn Profiles (Leadership): ${linkedinProfileUrls.slice(0, 5).join(', ') || 'Not found'}
- Twitter/X: ${twitterUrls.join(', ') || 'Not found'}
- Facebook: ${facebookUrls.join(', ') || 'Not found'}
- Instagram: ${instagramUrls.join(', ') || 'Not found'}

CRITICAL INSTRUCTIONS:
1. Extract ONLY factual information explicitly stated in the content or found via web search
2. Search thoroughly through ALL provided pages for each piece of information
3. Use web search to fill gaps and verify information
4. For leadership, if LinkedIn URLs are found, use web search to get details about those people
5. Extract ALL services/products mentioned on services, products, or solutions pages
6. Extract ALL blog articles found on blog/news pages with titles, URLs, dates, and summaries
7. Identify technology stack from "technology", "partners", or "integrations" pages
8. Return ONLY valid JSON - no additional text or explanations

REQUIRED JSON STRUCTURE (extract ALL available information):

{
  "companyInfo": {
    "name": "Full official company name",
    "industry": "Specific industry/vertical (e.g., 'Enterprise SaaS', 'Healthcare Technology', 'FinTech')",
    "description": "Comprehensive 2-4 sentence company description",
    "location": "Full location: 'City, State/Province, Country'",
    "zipCode": "Postal/Zip code (e.g., '94102', 'SW1A 1AA'). Look in: contact page, footer address",
    "size": "Company size (e.g., '1-10 employees', '50-200 employees')",
    "founded": "Year founded in YYYY format (e.g., '2020')",
    "mission": "Company mission statement if found (what they aim to do)",
    "vision": "Company vision statement if found (where they want to be in the future)"
  },
  "contactInfo": {
    "email": "Primary general contact email (contact@, info@, hello@)",
    "primaryEmail": "Primary contact email or general email",
    "alternateEmail": "Secondary/alternate email if found (sales@, support@, different department)",
    "phone": "Primary phone number with country code",
    "primaryPhone": "Primary phone number",
    "alternatePhone": "Secondary/alternate phone if found (different departments, toll-free)",
    "address": "Full physical address (street, city, state, country, zip). Look in: contact page, footer, about page"
  },
  "leadership": {
    "ceo": {
      "name": "CEO full name",
      "title": "CEO" or actual title,
      "email": "CEO email if found",
      "linkedin": "CEO LinkedIn profile URL from discovered profiles",
      "bio": "Brief bio if available from website or LinkedIn"
    },
    "founder": {
      "name": "Founder full name",
      "title": "Founder" or "Co-Founder",
      "email": "Founder email if found",
      "linkedin": "Founder LinkedIn profile URL from discovered profiles",
      "bio": "Brief bio if available"
    },
    "owner": {
      "name": "Owner full name",
      "title": "Owner" or actual title,
      "email": "Owner email if found",
      "linkedin": "Owner LinkedIn profile URL from discovered profiles",
      "bio": "Brief bio if available"
    },
    "primaryContact": {
      "name": "Primary contact person name (from contact page, team page)",
      "title": "Their job title/role",
      "email": "Their direct email",
      "phone": "Their direct phone"
    }
  },
  "services": [
    {
      "name": "Service/Product name",
      "description": "What this service/product does, key features and benefits"
    }
  ],
  "blogs": [
    {
      "title": "Blog article title",
      "url": "Full URL to the blog post",
      "date": "Publication date if available (any format)",
      "summary": "Brief 1-2 sentence summary of the article",
      "author": "Author name if mentioned"
    }
  ],
  "technology": {
    "stack": ["Technology 1", "Technology 2", "Framework 1"],
    "partners": ["Partner Company 1", "Partner Company 2"],
    "integrations": ["Integration 1", "Integration 2", "Platform 1"]
  },
  "businessInfo": {
    "shortTermGoals": "Company's short-term goals/objectives if mentioned (next 6-12 months)",
    "longTermGoals": "Company's long-term vision/goals if mentioned (2-5 years)",
    "expectations": "What the company expects from partnerships/clients/services if mentioned"
  },
  "socialProfiles": {
    "linkedin": "${linkedinCompanyUrls[0] || ''}",
    "twitter": "${twitterUrls[0] || ''}",
    "facebook": "${facebookUrls[0] || ''}",
    "instagram": "${instagramUrls[0] || ''}"
  }
}

DETAILED EXTRACTION GUIDELINES:

**Services/Products:**
- Look in: services page, products page, solutions page, homepage features section
- Extract ALL services/products listed (minimum 3-5 if available, up to 10)
- For each service: extract name and comprehensive description (what it does, key features, benefits)
- Example: {"name": "Cloud Migration Service", "description": "End-to-end cloud migration services helping enterprises move legacy systems to AWS, Azure, or GCP with zero downtime, automated backups, and security compliance."}

**Blog Articles:**
- Look in: /blog, /news, /insights, /resources pages
- Extract recent articles (at least 5-10 if available)
- For each article: title, full URL, publication date, 1-2 sentence summary, author name
- If blog listing page found, extract article previews and metadata
- Example: {"title": "How AI is Transforming Healthcare", "url": "https://example.com/blog/ai-healthcare", "date": "March 15, 2024", "summary": "Exploring the impact of artificial intelligence on patient care and medical diagnostics.", "author": "Dr. Jane Smith"}

**Technology Stack:**
- Look in: technology page, about page, partners page, integration pages, footer
- Identify: programming languages, frameworks, platforms, tools they use or integrate with
- Examples: ["React", "Node.js", "AWS", "PostgreSQL", "Docker", "Kubernetes"]
- Also search their job postings for technology requirements

**Partners:**
- Look in: partners page, about page, integration pages
- Extract: partner company names, technology partners, strategic alliances
- Examples: ["Salesforce", "Microsoft", "Google Cloud", "Stripe"]

**Integrations:**
- Look in: integrations page, features page, API documentation
- Extract: third-party platforms/services they integrate with
- Examples: ["Slack", "Zapier", "HubSpot", "QuickBooks", "Shopify"]

**Leadership (CRITICAL - USE WEB SEARCH):**
- Use the discovered LinkedIn profile URLs: ${linkedinProfileUrls.slice(0, 5).join(', ')}
- Search the web for these LinkedIn profiles to get names, titles, and bios
- Also search: "[Company Name] CEO", "[Company Name] Founder" to find leadership
- Extract from: team page, about page, leadership section, press releases
- For each leader: full name, title, email (if found), LinkedIn URL, brief bio
- Prioritize: CEO > Founder > Owner > Primary Contact

**Contact Information (CRITICAL):**
- Email: Look for contact@, info@, hello@, support@, sales@ followed by domain
- Search in: contact page, footer, header navigation, about page
- Phone: Include country code (+1, +44, etc.), look in contact page and header
- Extract both primary and alternate contact details if multiple found

SEARCH STRATEGY:
1. Homepage - company overview, hero description, key services
2. About/About-us - company history, founding year, mission, vision, team size
3. Services/Products/Solutions - ALL services and products with descriptions
4. Team/Leadership - CEO, founders, key team members with LinkedIn profiles
5. Blog/News/Insights - Recent articles with titles, URLs, dates, summaries
6. Technology/Partners/Integrations - Tech stack, partner companies, integrations
7. Contact - email addresses, phone numbers, physical address with zip code
8. Footer - often contains location, social links, contact info
9. Use web search to fill gaps in leadership, technology, and company information

QUALITY REQUIREMENTS:
- Minimum 3-5 services/products (if available on website)
- Minimum 5-10 blog articles (if blog exists)
- Leadership must include at least CEO or Founder with LinkedIn URL if discoverable
- Technology stack should have 5+ items if technology page exists
- Contact info must have at least one email and one phone number
- All URLs must be complete and valid

WEBSITE CONTENT FROM MULTIPLE PAGES:
${combinedContent.substring(0, 75000)}

Now extract the comprehensive company information including services, blogs, technology, and leadership details. Use web search extensively to fill gaps. Return ONLY the JSON object:`;

  try {
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
            content: "You are an expert business intelligence analyst who excels at extracting comprehensive, accurate company information from website content and online sources. You have access to web search and use it extensively to find missing information, verify details, and enrich data. You are meticulous, thorough, and never fabricate data. You always return properly formatted JSON with complete, factual data. When you find LinkedIn profiles, you search for details about those people. You extract all services, blog articles, and technology information available on the website.",
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
      throw new Error(`Perplexity API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let extractedData;

    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[0]);
    } else {
      extractedData = JSON.parse(content);
    }

    return extractedData;
  } catch (error) {
    console.error("Error calling Perplexity:", error);
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
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
      /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
      /<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
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
