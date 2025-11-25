import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { load } from "npm:cheerio@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  website_url: string;
}

interface ParsedPage {
  url: string;
  title: string;
  content: string;
  links: string[];
  socialLinks: string[];
  emails: string[];
}

interface CompanyProfile {
  company_name?: string;
  industry?: string;
  company_size?: string;
  founded_year?: string;
  country?: string;
  city?: string;
  zip?: string;
  website_url: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  primary_email?: string;
  alternate_email?: string;
  primary_phone?: string;
  address?: string;
  description?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { website_url }: RequestBody = await req.json();

    if (!website_url) {
      return new Response(
        JSON.stringify({ success: false, error: "website_url is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(website_url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error("URL must use http or https protocol");
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid URL: ${error.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Crawl website using Cheerio-based parser
    const parsedPages = await crawlWebsiteWithCheerio(website_url);

    // Build company profile from parsed pages
    const companyProfile = buildCompanyProfile(parsedPages, website_url);

    return new Response(
      JSON.stringify({
        success: true,
        companyProfile,
        rawSources: {
          website: parsedPages,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in autofill-from-website:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function crawlWebsiteWithCheerio(startUrl: string): Promise<ParsedPage[]> {
  const results: ParsedPage[] = [];
  const visited = new Set<string>();
  
  // Key pages to fetch
  const targetPages = [
    '',           // homepage
    'about',
    'about-us',
    'contact',
    'services',
    'blog',
    'news',
  ];

  const baseUrl = new URL(startUrl);
  const urlsToFetch: string[] = [startUrl];
  
  for (const page of targetPages) {
    const testUrl = new URL(startUrl);
    testUrl.pathname = `/${page}`;
    urlsToFetch.push(testUrl.href);
  }

  const fetchPromises = urlsToFetch.slice(0, 8).map(async (url) => {
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
      return parsePageWithCheerio(html, url);
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

function parsePageWithCheerio(html: string, url: string): ParsedPage {
  const $ = load(html);
  
  // Extract title - try multiple sources
  const title = $('title').first().text().trim() || 
                $('meta[property="og:title"]').attr('content') || 
                $('h1').first().text().trim() || 
                new URL(url).hostname;
  
  // Extract emails
  const emails = new Set<string>();
  
  // From mailto links
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const email = href.replace(/^mailto:/i, '').split('?')[0].split('&')[0].trim().toLowerCase();
      if (email && isValidEmail(email)) {
        emails.add(email);
      }
    }
  });
  
  // From text content
  const textContent = $('body').text();
  const emailPattern = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  let match;
  while ((match = emailPattern.exec(textContent)) !== null) {
    const email = match[1].toLowerCase();
    if (isValidEmail(email)) {
      emails.add(email);
    }
  }
  
  // Extract social links
  const socialLinks = new Set<string>();
  
  $('a[href*="linkedin.com/company/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) socialLinks.add(href);
  });
  
  $('a[href*="linkedin.com/in/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) socialLinks.add(href);
  });
  
  $('a[href*="twitter.com/"], a[href*="x.com/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) socialLinks.add(href);
  });
  
  $('a[href*="facebook.com/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) socialLinks.add(href);
  });
  
  $('a[href*="instagram.com/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) socialLinks.add(href);
  });
  
  $('a[href*="youtube.com/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) socialLinks.add(href);
  });
  
  // Extract all links
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      try {
        const absoluteUrl = new URL(href, url).href;
        links.push(absoluteUrl);
      } catch {
        links.push(href);
      }
    }
  });
  
  // Extract content - remove script/style/noscript/iframe
  $('script, style, noscript, iframe, svg, img').remove();
  
  const mainContent = $('main').first().text() || 
                      $('article').first().text() || 
                      $('[role="main"]').first().text() || 
                      $('body').text();
  
  const content = mainContent
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 20000);
  
  return {
    url,
    title,
    content,
    links,
    socialLinks: Array.from(socialLinks),
    emails: Array.from(emails),
  };
}

function isValidEmail(email: string): boolean {
  if (!email.includes('@')) return false;
  if (email.includes('.png') || email.includes('.jpg') || 
      email.includes('.jpeg') || email.includes('.gif') || 
      email.includes('.svg') || email.includes('.webp')) return false;
  if (email.includes('example.com') || email.includes('domain.com') || 
      email.includes('test.com') || email.includes('placeholder')) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function buildCompanyProfile(pages: ParsedPage[], websiteUrl: string): CompanyProfile {
  const profile: CompanyProfile = {
    website_url: websiteUrl,
  };

  if (pages.length === 0) {
    return profile;
  }

  // Aggregate data from all pages
  const allEmails = new Set<string>();
  const allSocialLinks = new Set<string>();
  const allContent: string[] = [];

  pages.forEach(page => {
    page.emails.forEach(email => allEmails.add(email));
    page.socialLinks.forEach(link => allSocialLinks.add(link));
    if (page.content) allContent.push(page.content);
  });

  // Extract company name from homepage title or first h1
  const homepage = pages.find(p => p.url === websiteUrl || p.url === websiteUrl + '/');
  if (homepage) {
    // Try to extract company name from title (remove common suffixes)
    const title = homepage.title;
    if (title) {
      const cleanTitle = title
        .replace(/\s*-\s*.*$/, '') // Remove " - Tagline"
        .replace(/\s*\|\s*.*$/, '') // Remove " | Tagline"
        .trim();
      if (cleanTitle && cleanTitle.length < 100) {
        profile.company_name = cleanTitle;
      }
    }
  }

  // Extract social profiles
  const linkedinCompany = Array.from(allSocialLinks).find(link => 
    link.includes('linkedin.com/company/')
  );
  if (linkedinCompany) {
    profile.linkedin_url = linkedinCompany;
  }

  const twitter = Array.from(allSocialLinks).find(link => 
    link.includes('twitter.com/') || link.includes('x.com/')
  );
  if (twitter) {
    profile.twitter_url = twitter;
  }

  const facebook = Array.from(allSocialLinks).find(link => 
    link.includes('facebook.com/')
  );
  if (facebook) {
    profile.facebook_url = facebook;
  }

  const instagram = Array.from(allSocialLinks).find(link => 
    link.includes('instagram.com/')
  );
  if (instagram) {
    profile.instagram_url = instagram;
  }

  const youtube = Array.from(allSocialLinks).find(link => 
    link.includes('youtube.com/')
  );
  if (youtube) {
    profile.youtube_url = youtube;
  }

  // Extract emails (prioritize contact@, info@, hello@)
  const emailArray = Array.from(allEmails);
  const primaryEmail = emailArray.find(e => 
    e.startsWith('contact@') || 
    e.startsWith('info@') || 
    e.startsWith('hello@')
  ) || emailArray[0];
  
  if (primaryEmail) {
    profile.primary_email = primaryEmail;
  }

  const alternateEmail = emailArray.find(e => 
    e !== primaryEmail && (
      e.startsWith('sales@') || 
      e.startsWith('support@') || 
      e.startsWith('help@')
    )
  );
  if (alternateEmail) {
    profile.alternate_email = alternateEmail;
  }

  // Extract description from homepage content
  if (homepage && homepage.content) {
    const description = homepage.content
      .substring(0, 500)
      .replace(/\s+/g, ' ')
      .trim();
    if (description.length > 50) {
      profile.description = description;
    }
  }

  return profile;
}

