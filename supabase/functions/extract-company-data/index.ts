import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  url: string;
  openaiKey: string;
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
    const { url, openaiKey }: RequestBody = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "No URL provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const crawledData = await crawlWebsite(url);
    const extractedInfo = await extractCompanyInfo(crawledData, openaiKey, url);

    return new Response(
      JSON.stringify(extractedInfo),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
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

  const fetchPromises = urlsToFetch.slice(0, 10).map(async (url) => {
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
    .map(r => `PAGE: ${r.title || r.url}\nURL: ${r.url}\nCONTENT: ${r.content.substring(0, 8000)}\n\n`)
    .join('\n---\n\n');

  const prompt = `You are analyzing a company website to extract COMPREHENSIVE business intelligence data across ALL 8 categories.

Root Domain: ${rootUrl}
Social Media URLs Discovered: ${Array.from(allSocialLinks).join(', ')}

CRITICAL INSTRUCTIONS:
- Extract EVERY piece of information available for ALL categories below
- Be thorough - scan the entire content for each data point
- For services: extract ALL services/products mentioned with full descriptions
- For leadership: find ALL team members with complete bios from About, Team, or Leadership pages
- For blogs: extract ALL blog posts/articles with complete metadata
- For technology: identify ALL technologies, tools, partners, and integrations mentioned
- Use the discovered social media URLs above for the socialProfiles section
- If specific information is not found, use empty strings/arrays, but make a thorough attempt to find it first

REQUIRED JSON STRUCTURE (fill ALL fields with available data):

{
  "companyInfo": {
    "name": "Full legal or trading company name",
    "industry": "Specific industry/sector (e.g., Enterprise SaaS, HealthTech, FinTech)",
    "description": "Comprehensive 2-3 sentence description of what the company does and who they serve",
    "valueProposition": "Clear statement of unique value delivered to customers",
    "founded": "Year company was founded (YYYY format)",
    "location": "Full location: City, State/Province, Country",
    "size": "Company size in employees (e.g., 50-100 employees, 500+ employees)",
    "mission": "Complete mission statement - the company's purpose and what they aim to achieve",
    "vision": "Complete vision statement - the company's aspirational future state"
  },
  "contactInfo": {
    "email": "Primary contact email address (look for info@, hello@, contact@ addresses)",
    "phone": "Full phone number with country code if available",
    "address": "Complete physical mailing address including street, city, state, ZIP, country"
  },
  "socialProfiles": {
    "linkedin": "Full LinkedIn company page URL (use from discovered URLs or extract from content)",
    "twitter": "Full Twitter/X profile URL (use from discovered URLs or extract from content)",
    "facebook": "Full Facebook page URL (use from discovered URLs or extract from content)",
    "instagram": "Full Instagram profile URL (use from discovered URLs or extract from content)",
    "youtube": "Full YouTube channel URL (use from discovered URLs or extract from content)"
  },
  "services": [
    {
      "name": "Service/Product name",
      "description": "Detailed description of what this service/product does and its benefits",
      "tags": ["relevant", "category", "tags"],
      "pricing": "Pricing info if mentioned (e.g., 'Starting at $99/mo', 'Enterprise pricing', 'Free trial available')"
    }
  ],
  "leadership": [
    {
      "name": "Full name of leader",
      "role": "Complete job title (CEO, CTO, VP Engineering, etc.)",
      "bio": "Full biography including background, experience, education, achievements - extract everything available"
    }
  ],
  "blogs": [
    {
      "title": "Complete article title",
      "url": "Full URL to the article",
      "date": "Publication date in YYYY-MM-DD format if available",
      "summary": "Comprehensive 2-3 sentence summary of the article content",
      "author": "Article author name"
    }
  ],
  "technology": {
    "stack": ["List", "ALL", "technologies", "tools", "frameworks", "mentioned", "React", "Node.js", "AWS", "etc"],
    "partners": ["List", "ALL", "technology", "partners", "AWS", "Microsoft", "Google", "etc"],
    "integrations": ["List", "ALL", "integrations", "Salesforce", "Slack", "Stripe", "etc"]
  }
}

EXTRACTION GUIDELINES:
1. COMPANY INFO: Look in homepage, about page, meta descriptions
2. CONTACT: Check contact page, footer, about page
3. SOCIAL: Use the discovered URLs above, also check footer and header links
4. SERVICES: Look in services, products, solutions, what-we-do pages - extract ALL offerings
5. LEADERSHIP: Check about, team, leadership, founders, executives pages - get ALL team members
6. BLOGS: Check blog, news, articles, insights pages - extract recent posts
7. TECHNOLOGY: Identify tools in job postings, technical pages, case studies, about pages

Crawled Website Content:
${combinedContent.substring(0, 100000)}

Return ONLY the complete JSON object with ALL extracted data. Be thorough and comprehensive!`;

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
            content: "You are an expert business intelligence analyst specializing in comprehensive company data extraction. Your task is to extract COMPLETE and DETAILED information across ALL 8 categories: company info, contact details, social profiles, services/products, leadership team, blog articles, and technology stack/partners/integrations. Extract EVERY available detail - names, roles, bios, descriptions, URLs, dates. Be exhaustive and thorough. Return properly structured JSON with all fields populated where data exists.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw error;
  }
}
