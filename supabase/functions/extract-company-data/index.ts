import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  url: string;
  openaiKey?: string;
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
    const { url, openaiKey }: RequestBody = await req.json();

    if (openaiKey) {
      Deno.env.set('OPENAI_API_KEY', openaiKey);
      console.log('Using OpenAI API key from request body');
    }

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "No URL provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const hasApiKey = !!Deno.env.get('OPENAI_API_KEY');
    console.log(`Starting extraction for: ${url}`);
    console.log('OpenAI API Key configured:', hasApiKey);

    if (!hasApiKey) {
      console.warn('⚠️ No OpenAI API key found. Will use basic Cheerio extraction only.');
      console.warn('For better results, set OPENAI_API_KEY as a Supabase secret or pass it in the request body.');
    }

    const authHeader = req.headers.get("Authorization");

    // Crawl website using Cheerio
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

    console.log(`Successfully crawled ${crawledData.length} pages`);

    // Extract company information from crawled data using hybrid approach
    const extractedInfo = await extractCompanyInfoFromPages(crawledData, url);

    const simplifiedData = {
      success: true,
      data: {
        name: extractedInfo.companyInfo?.name || '',
        industry: extractedInfo.companyInfo?.industry || '',
        description: extractedInfo.companyInfo?.description || '',
        founded: extractedInfo.companyInfo?.founded || '',
        companySize: extractedInfo.companyInfo?.size || '',
        location: {
          city: extractedInfo.companyInfo?.city || '',
          country: extractedInfo.companyInfo?.country || '',
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
          contactName: extractedInfo.contactInfo?.contactName || '',
          jobTitle: extractedInfo.contactInfo?.jobTitle || '',
          primaryEmail: extractedInfo.contactInfo?.primaryEmail || '',
          alternateEmail: extractedInfo.contactInfo?.alternateEmail || '',
          primaryPhone: extractedInfo.contactInfo?.primaryPhone || '',
          alternatePhone: extractedInfo.contactInfo?.alternatePhone || '',
          address: extractedInfo.contactInfo?.address || '',
        },
        contacts: extractedInfo.contacts || [],
        leadership: extractedInfo.leadership || {},
        socialProfiles: extractedInfo.socialProfiles || {},
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
        logo: extractedInfo.logo || '',
      }
    };

    console.log('Extraction complete:', {
      name: simplifiedData.data.name,
      emails: simplifiedData.data.contactInfo.primaryEmail,
      services: simplifiedData.data.services.length,
      blogs: simplifiedData.data.blogs.length,
      technology: simplifiedData.data.technology.stack.length,
      contacts: simplifiedData.data.contacts.length,
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

async function crawlWebsiteWithCheerio(startUrl: string, authHeader: string | null): Promise<CrawlResult[]> {
  console.log('Calling scrape-website function via crawl-website:', startUrl);

  try {
    const crawlerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/crawl-website`;

    const response = await fetch(crawlerUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
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

    const results: CrawlResult[] = data.data.pages.map((page: any) => ({
      url: page.url,
      title: page.title || '',
      content: page.content || '',
      text: page.text || page.content || '',
      html: page.html || '',
      links: page.links || [],
      socialLinks: page.socialLinks || [],
      emails: page.emails || [],
      metadata: page.metadata || {},
      structuredData: page.structuredData || {},
    }));

    return results;
  } catch (error) {
    console.error('Error in crawlWebsiteWithCheerio:', error);
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
      text,
      links: [],
      socialLinks: Array.from(socialLinks),
      emails: Array.from(emails),
    }];
  } catch (error) {
    console.error('Fallback crawl error:', error);
    return [];
  }
}

async function extractCompanyInfoFromPages(pages: CrawlResult[], rootUrl: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Extracting company information from crawled pages');
  console.log(`Total pages: ${pages.length}`);
  console.log(`Root URL: ${rootUrl}`);
  console.log(`${'='.repeat(60)}\n`);

  // Aggregate data from all pages
  const allEmails = new Set<string>();
  const allSocialLinks = new Set<string>();
  const allContent: string[] = [];

  pages.forEach(page => {
    page.emails?.forEach(email => allEmails.add(email));
    page.socialLinks.forEach(link => allSocialLinks.add(link));
    allContent.push(page.text || page.content);
  });

  const emails = Array.from(allEmails);
  const socialLinks = Array.from(allSocialLinks);

  console.log(`Found ${emails.length} unique emails:`, emails.slice(0, 5));
  console.log(`Found ${socialLinks.length} unique social links`);

  // Find specific pages
  const homePage = pages.find(p => p.url === rootUrl || p.url === rootUrl + '/') || pages[0];
  const aboutPage = pages.find(p =>
    p.url.includes('/about') ||
    p.title.toLowerCase().includes('about')
  );
  const contactPage = pages.find(p =>
    p.url.includes('/contact') ||
    p.title.toLowerCase().includes('contact')
  );
  const teamPage = pages.find(p =>
    p.url.includes('/team') ||
    p.url.includes('/leadership') ||
    p.title.toLowerCase().includes('team') ||
    p.title.toLowerCase().includes('leadership')
  );
  const servicesPage = pages.find(p =>
    p.url.includes('/service') ||
    p.url.includes('/product') ||
    p.url.includes('/solution')
  );
  const blogPages = pages.filter(p =>
    p.url.includes('/blog') ||
    p.url.includes('/news') ||
    p.url.includes('/article')
  );

  // Extract company name (from homepage title or metadata)
  const companyName = extractCompanyName(homePage);

  // Extract description (from homepage metadata or first paragraph)
  const description = extractDescription(homePage);

  // Extract location info
  const locationInfo = extractLocation(contactPage, homePage);

  // Extract contact information
  const contactInfo = extractContactInfo(contactPage, emails, locationInfo.address);

  // Extract social profiles
  const socialProfiles = extractSocialProfiles(socialLinks);

  // Use LLM to extract services with structured data from Cheerio
  const services = await extractServicesWithLLM(servicesPage, homePage);

  // Use LLM to extract team/contacts with structured data
  const { contacts, leadership } = await extractTeamInfoWithLLM(teamPage, aboutPage);

  // Use LLM to extract blogs with structured data
  const blogs = await extractBlogsWithLLM(blogPages, rootUrl);

  // Use LLM to extract technology with structured data
  const technology = await extractTechnologyWithLLM(pages);

  // Use LLM to extract testimonials with structured data
  const testimonials = await extractTestimonialsWithLLM(pages);

  // Find logo
  const logo = findLogoUrl(pages);

  return {
    companyInfo: {
      name: companyName,
      industry: '',
      description: description,
      city: locationInfo.city,
      country: locationInfo.country,
      zipCode: locationInfo.zipCode,
      size: '',
      founded: '',
    },
    contactInfo: {
      contactName: contactInfo.contactName,
      jobTitle: contactInfo.jobTitle,
      primaryEmail: contactInfo.primaryEmail,
      alternateEmail: contactInfo.alternateEmail,
      primaryPhone: contactInfo.primaryPhone,
      alternatePhone: contactInfo.alternatePhone,
      address: contactInfo.address,
    },
    businessInfo: {
      mission: '',
      vision: '',
      shortTermGoals: '',
      longTermGoals: '',
      expectations: '',
    },
    socialProfiles,
    contacts,
    leadership,
    services,
    blogs,
    technology,
    testimonials,
    challenges: [],
    competitors: [],
    recentNews: [],
    marketIntelligence: {
      recentDevelopments: '',
      fundingStatus: '',
      growthIndicators: [],
      marketPosition: '',
      publicPerception: ''
    },
    logo,
  };
}

function extractCompanyName(homePage: CrawlResult): string {
  if (!homePage) return '';

  // Try metadata first
  if (homePage.metadata?.ogTitle) {
    return cleanCompanyName(homePage.metadata.ogTitle);
  }

  // Try page title
  if (homePage.title) {
    return cleanCompanyName(homePage.title);
  }

  return '';
}

function cleanCompanyName(name: string): string {
  // Remove common suffixes
  return name
    .replace(/\s*[-|–—]\s*.+$/, '') // Remove everything after dash
    .replace(/\s*\|\s*.+$/, '') // Remove everything after pipe
    .replace(/\s+(Home|Homepage|Official Site)$/i, '')
    .trim();
}

function extractDescription(homePage: CrawlResult): string {
  if (!homePage) return '';

  // Try OG description
  if (homePage.metadata?.ogDescription) {
    return homePage.metadata.ogDescription;
  }

  // Try meta description
  if (homePage.metadata?.description) {
    return homePage.metadata.description;
  }

  // Try first paragraph from structured data
  if (homePage.structuredData?.paragraphs && homePage.structuredData.paragraphs.length > 0) {
    return homePage.structuredData.paragraphs[0];
  }

  return '';
}

function extractLocation(contactPage: CrawlResult | undefined, homePage: CrawlResult) {
  const text = (contactPage?.text || homePage?.text || '').toLowerCase();

  // Extract address patterns
  const zipPattern = /\b\d{5}(?:-\d{4})?\b/; // US ZIP
  const ukPostcodePattern = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i; // UK Postcode

  let zipCode = '';
  const zipMatch = text.match(zipPattern);
  const ukMatch = text.match(ukPostcodePattern);

  if (zipMatch) {
    zipCode = zipMatch[0];
  } else if (ukMatch) {
    zipCode = ukMatch[0];
  }

  // Try to extract city and country from address patterns
  const addressPattern = /(?:located in|based in|headquarters in)\s+([^,\n]+),\s*([^,\n]+)/i;
  const match = text.match(addressPattern);

  let city = '';
  let country = '';

  if (match) {
    city = match[1].trim();
    country = match[2].trim();
  }

  return { city, country, zipCode, address: '' };
}

function extractContactInfo(contactPage: CrawlResult | undefined, emails: string[], defaultAddress: string) {
  const primaryEmail = emails[0] || '';
  const alternateEmail = emails[1] || '';

  // Extract phone numbers from contact page
  const text = contactPage?.text || '';
  const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phonePattern) || [];

  const primaryPhone = phones[0] || '';
  const alternatePhone = phones[1] || '';

  // Extract address
  let address = defaultAddress;
  if (contactPage) {
    const addressPattern = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/i;
    const addressMatch = contactPage.text.match(addressPattern);
    if (addressMatch) {
      address = addressMatch[0];
    }
  }

  return {
    contactName: '',
    jobTitle: '',
    primaryEmail,
    alternateEmail,
    primaryPhone,
    alternatePhone,
    address,
  };
}

function extractSocialProfiles(socialLinks: string[]) {
  return {
    linkedin: socialLinks.find(link => link.includes('linkedin.com/company/')) || '',
    twitter: socialLinks.find(link => link.includes('twitter.com') || link.includes('x.com')) || '',
    facebook: socialLinks.find(link => link.includes('facebook.com')) || '',
    instagram: socialLinks.find(link => link.includes('instagram.com')) || '',
  };
}

function extractServices(servicesPage: CrawlResult | undefined, homePage: CrawlResult) {
  const services: Array<{ name: string; description: string }> = [];

  const page = servicesPage || homePage;
  if (!page || !page.structuredData?.headings) return services;

  // Extract from headings (H2, H3)
  const headings = page.structuredData.headings.filter(h => h.level >= 2 && h.level <= 3);

  headings.forEach((heading, index) => {
    // Skip if looks like navigation or footer
    if (heading.text.toLowerCase().match(/^(home|about|contact|menu|navigation|footer|copyright)/)) {
      return;
    }

    // Look for service-like headings
    if (heading.text.length > 3 && heading.text.length < 100) {
      // Try to find description from paragraphs following this heading
      const description = page.structuredData?.paragraphs?.[index] || '';

      services.push({
        name: heading.text,
        description: description.substring(0, 200),
      });
    }
  });

  return services.slice(0, 10); // Limit to 10 services
}

function extractTeamInfo(teamPage: CrawlResult | undefined, aboutPage: CrawlResult | undefined) {
  const contacts: any[] = [];
  const leadership: any = {
    ceo: null,
    founder: null,
    owner: null,
  };

  const page = teamPage || aboutPage;
  if (!page) return { contacts, leadership };

  // Look for names followed by titles in the text
  const text = page.text || '';

  // Pattern: Name, Title (or Name - Title)
  const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+)[,\s-]+([A-Z][a-zA-Z\s]+(?:CEO|CTO|CFO|COO|President|Director|Manager|Founder|VP|Vice President))/g;

  let match;
  while ((match = namePattern.exec(text)) !== null) {
    const name = match[1];
    const title = match[2].trim();

    const contact = {
      name,
      title,
      email: '',
      linkedin: '',
      department: '',
      isDecisionMaker: title.toLowerCase().includes('ceo') ||
                       title.toLowerCase().includes('cto') ||
                       title.toLowerCase().includes('founder') ||
                       title.toLowerCase().includes('president') ||
                       title.toLowerCase().includes('director'),
      influenceLevel: title.toLowerCase().includes('ceo') ||
                      title.toLowerCase().includes('cto') ||
                      title.toLowerCase().includes('founder') ? 'high' : 'medium',
    };

    contacts.push(contact);

    // Add to leadership if applicable
    if (title.toLowerCase().includes('ceo')) {
      leadership.ceo = { name, title };
    } else if (title.toLowerCase().includes('founder')) {
      leadership.founder = { name, title };
    }
  }

  return { contacts: contacts.slice(0, 20), leadership };
}

function extractBlogs(blogPages: CrawlResult[]) {
  const blogs: Array<{ title: string; url: string; date: string; summary: string }> = [];

  blogPages.forEach(page => {
    if (!page.structuredData?.headings) return;

    // Extract article titles from headings
    page.structuredData.headings.forEach((heading, index) => {
      if (heading.level <= 3 && heading.text.length > 10) {
        // Try to find date
        const datePattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/i;
        const dateMatch = page.text.match(datePattern);

        blogs.push({
          title: heading.text,
          url: page.url,
          date: dateMatch ? dateMatch[0] : '',
          summary: page.structuredData?.paragraphs?.[index]?.substring(0, 150) || '',
        });
      }
    });
  });

  return blogs.slice(0, 10);
}

function extractTechnology(pages: CrawlResult[]) {
  const techKeywords = [
    'react', 'vue', 'angular', 'node.js', 'python', 'java', 'javascript', 'typescript',
    'aws', 'azure', 'google cloud', 'docker', 'kubernetes', 'postgresql', 'mongodb',
    'redis', 'elasticsearch', 'graphql', 'rest api', 'microservices'
  ];

  const stack = new Set<string>();
  const allText = pages.map(p => p.text.toLowerCase()).join(' ');

  techKeywords.forEach(tech => {
    if (allText.includes(tech)) {
      stack.add(tech.charAt(0).toUpperCase() + tech.slice(1));
    }
  });

  return {
    stack: Array.from(stack).slice(0, 10),
    partners: [],
    integrations: [],
  };
}

function extractTestimonials(pages: CrawlResult[]) {
  const testimonials: any[] = [];

  pages.forEach(page => {
    const text = page.text || '';

    // Look for quoted text (simple pattern)
    const quotePattern = /"([^"]{50,300})"/g;
    let match;

    while ((match = quotePattern.exec(text)) !== null) {
      const feedback = match[1];

      // Check if it looks like a testimonial (positive words)
      if (feedback.match(/\b(great|excellent|amazing|fantastic|wonderful|outstanding|highly recommend)\b/i)) {
        testimonials.push({
          clientName: '',
          clientTitle: '',
          feedback,
          satisfactionIndicators: 'Positive feedback',
          date: '',
          source: 'website',
        });
      }
    }
  });

  return testimonials.slice(0, 10);
}

async function extractServicesWithLLM(servicesPage: CrawlResult | undefined, homePage: CrawlResult) {
  const page = servicesPage || homePage;
  if (!page) return [];

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    console.warn('OpenAI API key not configured in Supabase secrets, using basic extraction');
    return extractServices(servicesPage, homePage);
  }

  try {
    const structuredData = {
      pageTitle: page.title,
      headings: page.structuredData?.headings || [],
      paragraphs: page.structuredData?.paragraphs?.slice(0, 30) || [],
      lists: page.structuredData?.lists || [],
      url: page.url,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a service extraction specialist. Extract all services from the structured webpage data provided. Return only valid JSON with a "services" array containing objects with "name" and "description" fields. Be comprehensive but accurate.'
          },
          {
            role: 'user',
            content: `Extract all services from this structured webpage data:\n\n${JSON.stringify(structuredData, null, 2)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || '{}');
    return result.services || [];
  } catch (error) {
    console.error('LLM extraction failed, using fallback:', error);
    return extractServices(servicesPage, homePage);
  }
}

async function extractTeamInfoWithLLM(teamPage: CrawlResult | undefined, aboutPage: CrawlResult | undefined) {
  const page = teamPage || aboutPage;
  if (!page) return { contacts: [], leadership: {} };

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    console.warn('OpenAI API key not configured in Supabase secrets, using basic extraction');
    return extractTeamInfo(teamPage, aboutPage);
  }

  try {
    const structuredData = {
      pageTitle: page.title,
      headings: page.structuredData?.headings || [],
      paragraphs: page.structuredData?.paragraphs?.slice(0, 30) || [],
      lists: page.structuredData?.lists || [],
      text: page.text.substring(0, 10000),
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a team information extractor. Extract leadership and team member info from structured data. Return JSON with "contacts" array (name, title, isDecisionMaker, influenceLevel) and "leadership" object (ceo, founder, owner). Only extract real people explicitly mentioned.'
          },
          {
            role: 'user',
            content: `Extract team and leadership from this data:\n\n${JSON.stringify(structuredData, null, 2)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || '{}');
    return {
      contacts: result.contacts || [],
      leadership: result.leadership || {}
    };
  } catch (error) {
    console.error('LLM extraction failed, using fallback:', error);
    return extractTeamInfo(teamPage, aboutPage);
  }
}

async function extractBlogsWithLLM(blogPages: CrawlResult[], rootUrl: string) {
  if (blogPages.length === 0) return [];

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    console.warn('OpenAI API key not configured in Supabase secrets, using basic extraction');
    return extractBlogs(blogPages);
  }

  try {
    const structuredPages = blogPages.slice(0, 5).map(page => ({
      url: page.url,
      title: page.title,
      headings: page.structuredData?.headings?.slice(0, 10) || [],
      paragraphs: page.structuredData?.paragraphs?.slice(0, 5) || [],
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a blog article extractor. Extract blog articles from structured data. Return JSON with "blogs" array containing title, url (use exact URL from data), date, summary. Only extract real articles present in the data.'
          },
          {
            role: 'user',
            content: `Extract blog articles from these pages:\n\n${JSON.stringify(structuredPages, null, 2)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || '{}');
    return result.blogs || [];
  } catch (error) {
    console.error('LLM extraction failed, using fallback:', error);
    return extractBlogs(blogPages);
  }
}

async function extractTechnologyWithLLM(pages: CrawlResult[]) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    console.warn('OpenAI API key not configured in Supabase secrets, using basic extraction');
    return extractTechnology(pages);
  }

  try {
    const combinedText = pages
      .map(p => `${p.title} ${p.text}`)
      .join(' ')
      .substring(0, 20000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract all technologies, partners, and integrations mentioned in the text. Return JSON with "stack" (array of technologies), "partners" (array), "integrations" (array). Only include explicitly mentioned items.'
          },
          {
            role: 'user',
            content: `Extract technologies from this text:\n\n${combinedText}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || '{}');
    return {
      stack: result.stack || [],
      partners: result.partners || [],
      integrations: result.integrations || []
    };
  } catch (error) {
    console.error('LLM extraction failed, using fallback:', error);
    return extractTechnology(pages);
  }
}

async function extractTestimonialsWithLLM(pages: CrawlResult[]) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    console.warn('OpenAI API key not configured in Supabase secrets, using basic extraction');
    return extractTestimonials(pages);
  }

  try {
    const structuredPages = pages.slice(0, 5).map(page => ({
      title: page.title,
      paragraphs: page.structuredData?.paragraphs?.slice(0, 20) || [],
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract testimonials and client feedback from structured data. Return JSON with "testimonials" array containing clientName, feedback, satisfactionIndicators. Only extract real testimonials found in the data.'
          },
          {
            role: 'user',
            content: `Extract testimonials from this data:\n\n${JSON.stringify(structuredPages, null, 2)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || '{}');
    return result.testimonials || [];
  } catch (error) {
    console.error('LLM extraction failed, using fallback:', error);
    return extractTestimonials(pages);
  }
}

function findLogoUrl(pages: CrawlResult[]): string {
  for (const page of pages) {
    if (page.metadata?.ogImage) {
      return page.metadata.ogImage;
    }

    if (page.html) {
      const logoPatterns = [
        /<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']/i,
        /<link[^>]+rel=[\"']icon[\"'][^>]+href=[\"']([^\"']+)[\"']/i,
        /<img[^>]+class=[\"'][^\"']*logo[^\"']*[\"'][^>]+src=[\"']([^\"']+)[\"']/i,
      ];

      for (const pattern of logoPatterns) {
        const match = page.html.match(pattern);
        if (match && match[1]) {
          let url = match[1];
          if (url.startsWith('//')) {
            url = 'https:' + url;
          } else if (url.startsWith('/')) {
            const baseUrl = new URL(page.url);
            url = baseUrl.origin + url;
          }
          return url;
        }
      }
    }
  }

  return '';
}
