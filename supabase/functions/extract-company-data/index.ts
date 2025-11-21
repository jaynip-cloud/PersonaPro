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
  text: string;
  html?: string;
  links: string[];
  socialLinks: string[];
  emails?: string[];
  metadata?: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    description?: string;
    keywords?: string;
  };
  structuredData?: {
    headings?: Array<{ level: number; text: string }>;
    paragraphs?: string[];
    lists?: string[][];
    tables?: any[];
  };
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
        JSON.stringify({ success: false, error: "Perplexity API key not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Starting hybrid extraction for: ${url}`);

    const authHeader = req.headers.get("Authorization");

    // Step 1: Crawl website using Cheerio to get structured data
    console.log('Step 1: Crawling website with Cheerio...');
    const crawledData = await crawlWebsiteWithCheerio(url, authHeader);

    if (!crawledData || crawledData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to crawl website. Please check the URL and try again."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Cheerio crawled ${crawledData.length} pages successfully`);

    // Step 2: Use Perplexity to intelligently extract from structured data
    console.log('Step 2: Using Perplexity to analyze structured data...');
    const extractedInfo = await extractWithPerplexity(crawledData, url, perplexityKey);

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
          mission: extractedInfo.businessInfo?.mission || '',
          vision: extractedInfo.businessInfo?.vision || '',
          shortTermGoals: extractedInfo.businessInfo?.shortTermGoals || '',
          longTermGoals: extractedInfo.businessInfo?.longTermGoals || '',
          expectations: extractedInfo.businessInfo?.expectations || '',
        },
        contactInfo: {
          contactName: extractedInfo.leadership?.primaryContact?.name || extractedInfo.leadership?.ceo?.name || '',
          jobTitle: extractedInfo.leadership?.primaryContact?.title || extractedInfo.leadership?.ceo?.title || '',
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

    console.log('Extraction complete:', {
      name: simplifiedData.data.name,
      emails: simplifiedData.data.contactInfo.primaryEmail,
      services: simplifiedData.data.services.length,
      contacts: simplifiedData.data.contacts.length,
      blogs: simplifiedData.data.blogs.length,
    });

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

    return data.data.pages;
  } catch (error) {
    console.error('Error in crawlWebsiteWithCheerio:', error);
    throw error;
  }
}

async function extractWithPerplexity(pages: CrawlResult[], rootUrl: string, perplexityKey: string) {
  console.log('Building structured data for Perplexity analysis...');

  // Aggregate all emails and social links
  const allEmails = new Set<string>();
  const allSocialLinks = new Set<string>();

  pages.forEach(page => {
    page.emails?.forEach(email => allEmails.add(email));
    page.socialLinks.forEach(link => allSocialLinks.add(link));
  });

  const emails = Array.from(allEmails);
  const socialLinks = Array.from(allSocialLinks);

  // Find specific pages
  const homePage = pages.find(p => p.url === rootUrl || p.url === rootUrl + '/') || pages[0];
  const aboutPage = pages.find(p => p.url.includes('/about'));
  const contactPage = pages.find(p => p.url.includes('/contact'));
  const teamPage = pages.find(p => p.url.includes('/team') || p.url.includes('/leadership'));
  const servicesPage = pages.find(p => p.url.includes('/service') || p.url.includes('/product'));
  const blogPages = pages.filter(p => p.url.includes('/blog') || p.url.includes('/news'));

  // Build clean structured data for each page type
  const structuredInput = buildStructuredInput({
    homePage,
    aboutPage,
    contactPage,
    teamPage,
    servicesPage,
    blogPages,
    emails,
    socialLinks,
    rootUrl
  });

  console.log('Structured input size:', structuredInput.length, 'characters');
  console.log('Sending to Perplexity for analysis...');

  // Send clean structured data to Perplexity
  const prompt = `You are an expert business data analyst. Extract company information from the following STRUCTURED DATA extracted from a website using Cheerio.

WEBSITE: ${rootUrl}

IMPORTANT: This is CLEAN, STRUCTURED data - not raw HTML. Use it to accurately extract company information.

${structuredInput}

Extract and return ONLY valid JSON in this exact structure:

{
  "companyInfo": {
    "name": "Company name from homepage title/metadata",
    "industry": "Industry/sector",
    "description": "Company description (2-4 sentences)",
    "location": "City, State/Province, Country",
    "zipCode": "Postal/ZIP code",
    "size": "Company size (e.g., '1-50 employees')",
    "founded": "Year founded (YYYY)"
  },
  "contactInfo": {
    "email": "Primary email",
    "primaryEmail": "Primary email",
    "alternateEmail": "Alternate email",
    "phone": "Primary phone",
    "primaryPhone": "Primary phone",
    "alternatePhone": "Alternate phone",
    "address": "Full physical address"
  },
  "leadership": {
    "ceo": {
      "name": "CEO name",
      "title": "CEO title",
      "email": "CEO email if available",
      "linkedin": "CEO LinkedIn URL"
    },
    "founder": {
      "name": "Founder name",
      "title": "Founder title"
    }
  },
  "contacts": [
    {
      "name": "Person name",
      "title": "Job title",
      "email": "Email",
      "department": "Department",
      "isDecisionMaker": true/false,
      "influenceLevel": "high/medium/low"
    }
  ],
  "services": [
    {
      "name": "Service name",
      "description": "Service description"
    }
  ],
  "blogs": [
    {
      "title": "Blog title",
      "url": "Blog URL",
      "date": "Publication date",
      "summary": "Brief summary"
    }
  ],
  "technology": {
    "stack": ["Tech 1", "Tech 2"],
    "partners": ["Partner 1"],
    "integrations": ["Integration 1"]
  },
  "businessInfo": {
    "mission": "Mission statement",
    "vision": "Vision statement",
    "shortTermGoals": "Short-term goals",
    "longTermGoals": "Long-term goals",
    "expectations": "Partnership/client expectations"
  },
  "testimonials": [
    {
      "clientName": "Client name",
      "feedback": "Testimonial text",
      "satisfactionIndicators": "Positive indicators"
    }
  ],
  "challenges": ["Challenge 1"],
  "competitors": [{"name": "Competitor", "description": "Comparison"}],
  "recentNews": [],
  "marketIntelligence": {
    "recentDevelopments": "",
    "fundingStatus": "",
    "growthIndicators": [],
    "marketPosition": "",
    "publicPerception": ""
  },
  "socialProfiles": {
    "linkedin": "${socialLinks.find(l => l.includes('linkedin.com/company/')) || ''}",
    "twitter": "${socialLinks.find(l => l.includes('twitter.com') || l.includes('x.com')) || ''}",
    "facebook": "${socialLinks.find(l => l.includes('facebook.com')) || ''}",
    "instagram": "${socialLinks.find(l => l.includes('instagram.com')) || ''}"
  }
}

EXTRACTION RULES:
1. Use the structured headings, paragraphs, and metadata provided
2. Extract team members from TEAM PAGE headings and content
3. Extract services from SERVICES PAGE headings and paragraphs
4. Extract blog articles from BLOG PAGES headings
5. Use the provided EMAILS and validate them
6. For missing data, leave fields empty ("" or [] or null)
7. Return ONLY the JSON object - no explanation text`;

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
            content: "You are a precise data extraction specialist. You analyze STRUCTURED data from websites and extract company information into JSON format. You follow the exact structure provided and never add explanatory text."
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
    const content = data.choices[0]?.message?.content || '';

    console.log('Perplexity response received, parsing JSON...');

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extractedData = JSON.parse(jsonMatch[0]);
      console.log('Successfully extracted company data');
      return extractedData;
    } else {
      console.error('No JSON found in response');
      throw new Error('Failed to parse Perplexity response');
    }
  } catch (error) {
    console.error('Perplexity extraction error:', error);
    throw error;
  }
}

function buildStructuredInput(data: {
  homePage: CrawlResult | undefined;
  aboutPage: CrawlResult | undefined;
  contactPage: CrawlResult | undefined;
  teamPage: CrawlResult | undefined;
  servicesPage: CrawlResult | undefined;
  blogPages: CrawlResult[];
  emails: string[];
  socialLinks: string[];
  rootUrl: string;
}): string {
  const parts: string[] = [];

  parts.push(`ROOT URL: ${data.rootUrl}\n`);

  // Homepage
  if (data.homePage) {
    parts.push(`\n=== HOMEPAGE ===`);
    parts.push(`URL: ${data.homePage.url}`);
    parts.push(`Title: ${data.homePage.title}`);

    if (data.homePage.metadata) {
      parts.push(`\nMetadata:`);
      if (data.homePage.metadata.ogTitle) parts.push(`  OG Title: ${data.homePage.metadata.ogTitle}`);
      if (data.homePage.metadata.ogDescription) parts.push(`  OG Description: ${data.homePage.metadata.ogDescription}`);
      if (data.homePage.metadata.description) parts.push(`  Description: ${data.homePage.metadata.description}`);
    }

    if (data.homePage.structuredData?.headings) {
      parts.push(`\nHeadings:`);
      data.homePage.structuredData.headings.slice(0, 10).forEach(h => {
        parts.push(`  H${h.level}: ${h.text}`);
      });
    }

    if (data.homePage.structuredData?.paragraphs) {
      parts.push(`\nKey Paragraphs:`);
      data.homePage.structuredData.paragraphs.slice(0, 3).forEach((p, i) => {
        if (p.length > 50) parts.push(`  [${i + 1}] ${p.substring(0, 200)}...`);
      });
    }
  }

  // About Page
  if (data.aboutPage) {
    parts.push(`\n\n=== ABOUT PAGE ===`);
    parts.push(`URL: ${data.aboutPage.url}`);

    if (data.aboutPage.structuredData?.headings) {
      parts.push(`\nHeadings:`);
      data.aboutPage.structuredData.headings.slice(0, 15).forEach(h => {
        parts.push(`  H${h.level}: ${h.text}`);
      });
    }

    if (data.aboutPage.structuredData?.paragraphs) {
      parts.push(`\nContent:`);
      data.aboutPage.structuredData.paragraphs.slice(0, 5).forEach((p, i) => {
        if (p.length > 50) parts.push(`  [${i + 1}] ${p.substring(0, 300)}...`);
      });
    }
  }

  // Contact Page
  if (data.contactPage) {
    parts.push(`\n\n=== CONTACT PAGE ===`);
    parts.push(`URL: ${data.contactPage.url}`);

    if (data.contactPage.structuredData?.headings) {
      parts.push(`\nHeadings:`);
      data.contactPage.structuredData.headings.forEach(h => {
        parts.push(`  H${h.level}: ${h.text}`);
      });
    }

    if (data.contactPage.structuredData?.paragraphs) {
      parts.push(`\nContent:`);
      data.contactPage.structuredData.paragraphs.forEach((p, i) => {
        if (p.length > 20) parts.push(`  [${i + 1}] ${p}`);
      });
    }
  }

  // Team Page
  if (data.teamPage) {
    parts.push(`\n\n=== TEAM PAGE ===`);
    parts.push(`URL: ${data.teamPage.url}`);

    if (data.teamPage.structuredData?.headings) {
      parts.push(`\nTeam Member Headings:`);
      data.teamPage.structuredData.headings.forEach(h => {
        parts.push(`  H${h.level}: ${h.text}`);
      });
    }

    if (data.teamPage.structuredData?.paragraphs) {
      parts.push(`\nTeam Member Descriptions:`);
      data.teamPage.structuredData.paragraphs.forEach((p, i) => {
        if (p.length > 20) parts.push(`  [${i + 1}] ${p}`);
      });
    }
  }

  // Services Page
  if (data.servicesPage) {
    parts.push(`\n\n=== SERVICES PAGE ===`);
    parts.push(`URL: ${data.servicesPage.url}`);

    if (data.servicesPage.structuredData?.headings) {
      parts.push(`\nService Headings:`);
      data.servicesPage.structuredData.headings.forEach(h => {
        parts.push(`  H${h.level}: ${h.text}`);
      });
    }

    if (data.servicesPage.structuredData?.paragraphs) {
      parts.push(`\nService Descriptions:`);
      data.servicesPage.structuredData.paragraphs.forEach((p, i) => {
        if (p.length > 50) parts.push(`  [${i + 1}] ${p.substring(0, 300)}...`);
      });
    }
  }

  // Blog Pages
  if (data.blogPages.length > 0) {
    parts.push(`\n\n=== BLOG PAGES (${data.blogPages.length}) ===`);
    data.blogPages.slice(0, 10).forEach((blog, idx) => {
      parts.push(`\nBlog Article ${idx + 1}:`);
      parts.push(`  URL: ${blog.url}`);
      parts.push(`  Title: ${blog.title}`);

      if (blog.structuredData?.headings) {
        const mainHeading = blog.structuredData.headings[0];
        if (mainHeading) parts.push(`  Heading: ${mainHeading.text}`);
      }

      if (blog.structuredData?.paragraphs && blog.structuredData.paragraphs[0]) {
        parts.push(`  Summary: ${blog.structuredData.paragraphs[0].substring(0, 150)}...`);
      }
    });
  }

  // Emails
  if (data.emails.length > 0) {
    parts.push(`\n\n=== EMAILS FOUND ===`);
    data.emails.forEach(email => parts.push(`  - ${email}`));
  }

  // Social Links
  if (data.socialLinks.length > 0) {
    parts.push(`\n\n=== SOCIAL PROFILES ===`);
    data.socialLinks.forEach(link => parts.push(`  - ${link}`));
  }

  return parts.join('\n');
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

function findLogoUrl(pages: CrawlResult[]): string {
  for (const page of pages) {
    if (page.metadata?.ogImage) {
      return page.metadata.ogImage;
    }
  }
  return '';
}
