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
  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  const maxDepth = 3;
  const maxPages = 50;
  const baseUrl = new URL(startUrl);
  const baseDomain = baseUrl.hostname;

  while (queue.length > 0 && results.length < maxPages) {
    const { url, depth } = queue.shift()!;

    if (visited.has(url) || depth > maxDepth) {
      continue;
    }

    visited.add(url);
    console.log(`Crawling: ${url} (depth: ${depth})`);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CompanyBot/1.0)",
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      const crawlResult = parseHtml(html, url);
      results.push(crawlResult);

      if (depth < maxDepth) {
        for (const link of crawlResult.links) {
          try {
            const linkUrl = new URL(link, url);
            if (linkUrl.hostname === baseDomain || linkUrl.hostname.endsWith(`.${baseDomain}`)) {
              if (!visited.has(linkUrl.href)) {
                queue.push({ url: linkUrl.href, depth: depth + 1 });
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
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
    /https?:\/\/(www\.)?(youtube\.com\/(c\/|channel\/|user\/)?[^\s"'<>]+)/gi,
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

  return text.substring(0, 15000);
}

async function extractCompanyInfo(crawlResults: CrawlResult[], openaiKey: string, rootUrl: string) {
  const allSocialLinks = new Set<string>();
  crawlResults.forEach(result => {
    result.socialLinks.forEach(link => allSocialLinks.add(link));
  });

  const combinedContent = crawlResults
    .map(r => `PAGE: ${r.title || r.url}\nURL: ${r.url}\nCONTENT: ${r.content.substring(0, 5000)}\n\n`)
    .join('\n---\n\n');

  const prompt = `Analyze the following crawled content from a company website. Extract comprehensive information to build a complete company knowledge profile.

Root Domain: ${rootUrl}
Social Media Profiles Found: ${Array.from(allSocialLinks).join(', ')}

Extraction targets (priority order):
1. Company name
2. Official website canonical URL
3. Headquarters/location
4. Founding year
5. Short company description
6. Industry vertical(s)
7. Top services/products
8. Leadership (names & titles)
9. Contact info (email, phone)
10. Social profile URLs
11. Blog articles (title, url, date, summary)
12. Press/news
13. Case studies
14. Careers/hiring signals
15. Partner/technology stack hints
16. Pricing/packaging hints
17. Public legal/privacy notes

Provide a comprehensive JSON response with ALL available information:

{
  "companyInfo": {
    "name": "Exact company name",
    "canonicalUrl": "Official website URL",
    "industry": "Primary industry vertical(s)",
    "description": "Comprehensive company description",
    "valueProposition": "Value proposition",
    "founded": "Year founded",
    "location": "Headquarters location",
    "size": "Company size/employee count",
    "mission": "Mission statement",
    "vision": "Vision statement"
  },
  "contactInfo": {
    "email": "Contact email",
    "phone": "Contact phone",
    "address": "Physical address"
  },
  "socialProfiles": {
    "linkedin": "LinkedIn URL",
    "twitter": "Twitter/X URL",
    "facebook": "Facebook URL",
    "instagram": "Instagram URL",
    "youtube": "YouTube URL"
  },
  "leadership": [
    {
      "name": "Leader name",
      "role": "Title/Position",
      "bio": "Brief bio if available"
    }
  ],
  "services": [
    {
      "name": "Service/Product name",
      "description": "Detailed description",
      "tags": ["relevant", "tags"],
      "pricing": "Pricing info if available"
    }
  ],
  "caseStudies": [
    {
      "title": "Case study title",
      "client": "Client name",
      "industry": "Client industry",
      "challenge": "Problem solved",
      "solution": "Solution provided",
      "results": ["Measurable result 1", "Result 2"],
      "url": "Case study URL"
    }
  ],
  "blogs": [
    {
      "title": "Article title",
      "url": "Article URL",
      "date": "Publication date",
      "summary": "Article summary",
      "author": "Author if available"
    }
  ],
  "pressNews": [
    {
      "title": "News title",
      "date": "Publication date",
      "summary": "News summary",
      "source": "Source/Publication",
      "url": "News URL"
    }
  ],
  "careers": {
    "hiring": true/false,
    "openPositions": ["Position 1", "Position 2"],
    "culture": "Company culture notes"
  },
  "technology": {
    "stack": ["Tech 1", "Tech 2"],
    "partners": ["Partner 1", "Partner 2"],
    "integrations": ["Integration 1", "Integration 2"]
  },
  "legal": {
    "privacyPolicyUrl": "Privacy policy URL",
    "termsOfServiceUrl": "Terms URL",
    "complianceCertifications": ["Cert 1", "Cert 2"]
  }
}

Crawled Content:
${combinedContent.substring(0, 80000)}

Provide ONLY valid JSON, no additional text. Extract ALL available information. If information is not found, use empty strings, empty arrays, or null.`;

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
            content: "You are an expert data extraction assistant. Extract comprehensive company information from crawled website content and return it as detailed, structured JSON. Be thorough and extract every piece of relevant information available.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
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