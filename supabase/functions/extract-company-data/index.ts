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

async function enrichLinkedInProfiles(leadership: any[], openaiKey: string): Promise<any[]> {
  const enrichedLeadership = [];

  for (const leader of leadership) {
    if (!leader.linkedinUrl) {
      enrichedLeadership.push(leader);
      continue;
    }

    try {
      const response = await fetch(leader.linkedinUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CompanyBot/1.0)",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        enrichedLeadership.push(leader);
        continue;
      }

      const html = await response.text();
      const profileContent = extractTextFromHtml(html).substring(0, 15000);

      const enrichmentPrompt = `Extract detailed professional information from this LinkedIn profile page content for ${leader.name}.

Profile Content:
${profileContent}

Extract and return ONLY valid JSON with these fields:
{
  "name": "${leader.name}",
  "role": "${leader.role}",
  "bio": "Comprehensive biography including: current role, previous positions, education, skills, achievements, certifications, and any notable accomplishments. Be detailed and thorough.",
  "linkedinUrl": "${leader.linkedinUrl}",
  "experience": "Detailed work experience summary",
  "education": "Educational background",
  "skills": ["skill1", "skill2", "skill3"]
}`;

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
              content: "You are an expert at extracting professional information from LinkedIn profiles. Return detailed, comprehensive information in valid JSON format only.",
            },
            {
              role: "user",
              content: enrichmentPrompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 1500,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const enrichedData = JSON.parse(jsonMatch[0]);
          enrichedLeadership.push(enrichedData);
          continue;
        }
      }
    } catch (error) {
      console.error(`Error enriching LinkedIn profile for ${leader.name}:`, error);
    }

    enrichedLeadership.push(leader);
  }

  return enrichedLeadership;
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
  const youtubeUrls = Array.from(allSocialLinks).filter(link => link.includes('youtube.com'));

  const prompt = `You are a professional data extraction specialist. Extract ONLY factual information found in the content. DO NOT make assumptions or fabricate data.

ROOT DOMAIN: ${rootUrl}

DISCOVERED SOCIAL LINKS:
- LinkedIn Company: ${linkedinCompanyUrls.join(', ') || 'Not found'}
- LinkedIn Profiles: ${linkedinProfileUrls.join(', ') || 'Not found'}
- Twitter/X: ${twitterUrls.join(', ') || 'Not found'}
- Facebook: ${facebookUrls.join(', ') || 'Not found'}
- Instagram: ${instagramUrls.join(', ') || 'Not found'}
- YouTube: ${youtubeUrls.join(', ') || 'Not found'}

EXTRACTION RULES - FOLLOW EXACTLY:
1. Extract ONLY information explicitly stated in the content
2. If information is not found, leave field as empty string "" or empty array []
3. DO NOT infer, assume, or fabricate any data
4. Be literal and precise - copy exact text when available
5. For email/phone: Look for actual contact information, not example formats
6. For services: Extract only explicitly mentioned services with their real descriptions
7. For leadership: Extract only people explicitly listed as team members with their actual info
8. For blogs: Extract only actual blog posts with real URLs and dates
9. For social URLs: Use the discovered URLs listed above - do not make up URLs

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
    "email": "ONLY extract if you find an actual email address in the content (e.g., contact@company.com, info@company.com). Leave empty if not found.",
    "phone": "ONLY extract if you find an actual phone number in the content (e.g., +1-555-123-4567, (555) 123-4567). Leave empty if not found.",
    "address": "ONLY extract if you find an actual physical address in the content. Leave empty if not found."
  },
  "socialProfiles": {
    "linkedin": "Use ONLY the LinkedIn company URL from discovered links above. If multiple, use the first one. Leave empty if none found.",
    "twitter": "Use ONLY the Twitter/X URL from discovered links above. If multiple, use the first one. Leave empty if none found.",
    "facebook": "Use ONLY the Facebook URL from discovered links above. If multiple, use the first one. Leave empty if none found.",
    "instagram": "Use ONLY the Instagram URL from discovered links above. If multiple, use the first one. Leave empty if none found.",
    "youtube": "Use ONLY the YouTube URL from discovered links above. If multiple, use the first one. Leave empty if none found."
  },
  "services": [
    {
      "name": "ONLY extract actual service/product names mentioned in the content",
      "description": "Extract the ACTUAL description from the content - do not write your own",
      "tags": [],
      "pricing": "ONLY include if actual pricing is mentioned"
    }
  ],
  "leadership": [
    {
      "name": "ONLY extract names of people explicitly listed as leadership/team members",
      "role": "Extract their ACTUAL job title from the content",
      "bio": "Extract their ACTUAL bio/description from the content - do not make up information",
      "linkedinUrl": "Match this person's name to LinkedIn profile URLs from discovered links above. Leave empty if no match found."
    }
  ],
  "blogs": [
    {
      "title": "ONLY extract actual blog post titles you find",
      "url": "Extract the ACTUAL full URL to the blog post",
      "date": "Extract ACTUAL publication date if visible (YYYY-MM-DD format)",
      "summary": "Extract or summarize the ACTUAL content preview/excerpt shown",
      "author": "Extract ACTUAL author name if shown"
    }
  ],
  "technology": {
    "stack": ["ONLY list technologies/tools explicitly mentioned in the content - common examples: React, Python, AWS, PostgreSQL, Docker"],
    "partners": ["ONLY list actual partner companies mentioned - examples: Microsoft, Google Cloud, AWS, Salesforce"],
    "integrations": ["ONLY list actual integrations/APIs mentioned - examples: Stripe, Slack, Zoom, GitHub"]
  }
}

SPECIFIC EXTRACTION INSTRUCTIONS BY SECTION:

CONTACT INFO:
- Search for email patterns: info@, contact@, hello@, support@, sales@ followed by domain
- Search for phone patterns: numbers with parentheses, dashes, or +country code
- Search for address patterns: street numbers, city, state/province, ZIP/postal code
- Check: Contact page, footer sections, About page
- If not found: Leave empty - DO NOT fabricate

SOCIAL PROFILES:
- Use ONLY the discovered URLs listed above
- Match by domain (linkedin.com, twitter.com, facebook.com, etc.)
- If multiple URLs for same platform, use the first one
- If not found: Leave empty - DO NOT create URLs

SERVICES/PRODUCTS:
- Look in: Services page, Products page, What We Do page, Solutions page, homepage features
- Extract the ACTUAL service names and descriptions as written
- If a service is mentioned but no description: add name only, leave description empty
- If no services found: Return empty array []

LEADERSHIP TEAM:
- Look in: Team page, About page, Leadership page, Founders page, Our Team section
- Extract ONLY people explicitly shown with names and titles
- For bios: Copy the exact text shown, don't summarize unless necessary
- For LinkedIn: Match names to the LinkedIn profile URLs discovered
- If no team members found: Return empty array []

BLOG POSTS:
- Look in: Blog page, News page, Insights page, Articles page
- Extract ONLY posts that have visible titles and URLs
- Dates: Extract if shown (common formats: "Jan 15, 2024", "2024-01-15", "January 15, 2024")
- Summaries: Use the actual preview text or excerpt shown
- If no blog posts found: Return empty array []

TECHNOLOGY & PARTNERS:
- Stack: Look for mentions of programming languages, frameworks, databases, cloud providers
- Partners: Look for "Partners", "Powered by", "Works with" sections
- Integrations: Look for "Integrations", "Connects with", "APIs" sections
- Only include if explicitly mentioned
- If not found: Return empty arrays []

CRAWLED WEBSITE CONTENT:
${combinedContent.substring(0, 100000)}

CRITICAL: Return ONLY valid JSON. Extract ONLY factual information found in the content above. DO NOT fabricate, assume, or infer any data. If information is not present, use empty strings "" or arrays [].`;

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
            content: "You are a precise data extraction specialist. Extract ONLY factual information explicitly present in the provided content. NEVER fabricate, assume, or infer data. If information is not found, use empty strings or arrays. Be literal and accurate. Your job is to find and copy real information, not to fill in missing data with assumptions. Return only valid JSON with actual extracted data.",
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
    let extractedData;

    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[0]);
    } else {
      extractedData = JSON.parse(content);
    }

    if (extractedData.leadership && extractedData.leadership.length > 0) {
      console.log("Enriching leadership profiles from LinkedIn...");
      extractedData.leadership = await enrichLinkedInProfiles(extractedData.leadership, openaiKey);
    }

    return extractedData;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw error;
  }
}
