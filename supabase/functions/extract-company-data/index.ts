import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  url: string;
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
    const { url }: RequestBody = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "No URL provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const crawledData = await crawlWebsite(url);
    const extractedInfo = await extractCompanyInfo(crawledData, openaiKey, url);

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
        },
        email: extractedInfo.contactInfo?.email || '',
        phone: extractedInfo.contactInfo?.phone || '',
        socialProfiles: {
          linkedin: extractedInfo.socialProfiles?.linkedin || '',
          twitter: extractedInfo.socialProfiles?.twitter || '',
          facebook: extractedInfo.socialProfiles?.facebook || '',
          instagram: extractedInfo.socialProfiles?.instagram || '',
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

async function extractCompanyInfo(crawlResults: CrawlResult[], openaiKey: string, rootUrl: string) {
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

  const prompt = `You are an expert business intelligence analyst specializing in company research and data extraction. Your task is to extract comprehensive, accurate, and detailed company information from the provided website content.

ROOT DOMAIN: ${rootUrl}

DISCOVERED SOCIAL MEDIA PROFILES:
- LinkedIn Company: ${linkedinCompanyUrls.join(', ') || 'Not found'}
- Twitter/X: ${twitterUrls.join(', ') || 'Not found'}
- Facebook: ${facebookUrls.join(', ') || 'Not found'}
- Instagram: ${instagramUrls.join(', ') || 'Not found'}

CRITICAL INSTRUCTIONS:
1. Extract ONLY factual information explicitly stated in the content - DO NOT make assumptions or infer data
2. Search thoroughly through ALL provided pages for each piece of information
3. Be precise and complete - capture full details, not summaries
4. For missing information, leave the field as an empty string "" - DO NOT fabricate data
5. Cross-reference information across multiple pages for accuracy
6. Return ONLY valid JSON - no additional text or explanations

REQUIRED JSON STRUCTURE (extract ALL available information):

{
  "companyInfo": {
    "name": "Full official company name (look in: page titles, headers, about page, footer)",
    "industry": "Specific industry/vertical (e.g., 'Enterprise SaaS', 'Healthcare Technology', 'FinTech', 'E-commerce'). Look in: about page, meta description, company description",
    "description": "Comprehensive 2-4 sentence company description covering: what they do, who they serve, key value proposition, and differentiators. Look in: homepage hero, about page, meta description",
    "location": "Full location format: 'City, State/Province, Country' (e.g., 'San Francisco, California, United States' or 'London, United Kingdom'). Look in: contact page, footer, about page, address sections",
    "size": "Company size in employees (e.g., '1-10 employees', '50-200 employees', '500+ employees', '1000+ employees'). Look in: about page, careers page, LinkedIn info if visible",
    "founded": "Year company was founded in YYYY format (e.g., '2020', '2015'). Look in: about page, company history, footer copyright year"
  },
  "contactInfo": {
    "email": "Primary contact email address (e.g., 'contact@company.com', 'info@company.com', 'hello@company.com'). Look for patterns: contact@, info@, hello@, support@, sales@ followed by domain. Check: contact page, footer, support section",
    "phone": "Primary phone number with country code if available (e.g., '+1 (555) 123-4567', '+44 20 1234 5678'). Look in: contact page, header, footer, support section"
  },
  "socialProfiles": {
    "linkedin": "${linkedinCompanyUrls[0] || ''}",
    "twitter": "${twitterUrls[0] || ''}",
    "facebook": "${facebookUrls[0] || ''}",
    "instagram": "${instagramUrls[0] || ''}"
  }
}

EXTRACTION GUIDELINES BY FIELD:

**Company Name:**
- Look for the official company name in: page title tags, main header, about page heading, footer
- Use the most formal/official version (e.g., "Acme Corporation" not just "Acme")
- Avoid taglines or slogans

**Industry:**
- Be specific and descriptive (avoid generic terms like "Technology" or "Services")
- Good examples: "B2B SaaS for Marketing Automation", "AI-Powered Healthcare Analytics", "Cloud Infrastructure Management"
- Look in: meta descriptions, about page first paragraph, service descriptions

**Description:**
- Write 2-4 complete sentences capturing:
  1. What the company does (core business)
  2. Who they serve (target customers/market)
  3. Key value proposition (how they help)
  4. What makes them unique (if mentioned)
- Synthesize from: homepage hero section, about page, meta description
- Be comprehensive but concise

**Location:**
- Format: "City, State/Province, Country"
- If only city and country: "City, Country"
- Use full names: "United States" not "US", "United Kingdom" not "UK"
- Look in: contact page (often has full address), footer, about page

**Company Size:**
- Use ranges: "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
- Add "employees" (e.g., "51-200 employees")
- Look for phrases like: "team of X", "X+ employees", on careers or about pages

**Founded Year:**
- Four-digit year only (e.g., "2015")
- Look in: about page ("founded in...", "established in...", "since..."), footer copyright, company timeline

**Email:**
- Must be a valid email format: name@domain.com
- Common patterns to search for:
  - contact@, info@, hello@, support@, sales@, inquiries@ followed by company domain
  - Email links (mailto: links in contact sections)
  - Email addresses in contact forms or contact page text
- Check: contact page, footer, header, support section, about page
- If multiple emails found, prioritize: contact@ or info@ over department-specific emails

**Phone:**
- Include country code if visible: +1, +44, etc.
- Preserve formatting as shown: parentheses, dashes, spaces
- Look in: contact page, header (often in top bar), footer, support section
- Accept toll-free numbers, local numbers, international numbers

**Social Profiles:**
- Use the discovered URLs provided above
- Verify these are company pages, not individual employee profiles
- If URL is discovered, include it; otherwise leave empty

SEARCH STRATEGY:
1. Start with homepage - look for company name, tagline, hero description
2. Check about/about-us page - usually has: company description, founding year, team size, mission
3. Review contact page - typically has: email, phone, physical address
4. Scan footer across all pages - often contains: location, copyright year, social links, contact info
5. Check careers/jobs page - may mention company size, culture, benefits
6. Look at meta tags in page source - description and title tags often have good company info

QUALITY CHECKS:
- Company name should not include taglines or generic words like "Official Site"
- Industry should be specific and descriptive (3-6 words ideal)
- Description should be 2-4 sentences, professional, and comprehensive
- Location should be properly formatted with commas
- Email must match pattern: text@domain.ext
- Phone should include area code or country code when possible
- All social URLs should be company pages (not personal profiles)

WEBSITE CONTENT FROM MULTIPLE PAGES:
${combinedContent.substring(0, 80000)}

Now extract the company information and return ONLY the JSON object with all available data:`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert business intelligence analyst who excels at extracting comprehensive, accurate company information from website content. You are meticulous, thorough, and never fabricate data. You search through all provided content carefully to find every piece of requested information. You always return properly formatted JSON with complete, factual data. When information is not found, you leave fields empty rather than guessing.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
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
    console.error("Error calling OpenAI:", error);
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
