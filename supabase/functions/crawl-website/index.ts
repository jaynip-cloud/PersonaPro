import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CrawlRequest {
  url: string;
  maxPages?: number;
  targetPages?: string[];
  followLinks?: boolean;
}

interface PageResult {
  url: string;
  title: string;
  content: string;
  text: string;
  links: string[];
  socialLinks: string[];
  emails: string[];
  metadata: Record<string, string | undefined>;
  structuredData?: {
    headings: { level: number; text: string }[];
    paragraphs: string[];
    lists: string[][];
    tables: string[][][];
  };
}

interface CrawlResult {
  rootUrl: string;
  pages: PageResult[];
  summary: {
    totalPages: number;
    totalEmails: number;
    totalSocialLinks: number;
    uniqueEmails: string[];
    uniqueSocialLinks: string[];
    pagesByType: {
      homepage: number;
      about: number;
      contact: number;
      services: number;
      blog: number;
      other: number;
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
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
      throw new Error('Unauthorized');
    }

    const body: CrawlRequest = await req.json();
    const {
      url,
      maxPages = 15,
      targetPages = [
        '', 'about', 'about-us', 'contact', 'team', 'leadership',
        'services', 'products', 'solutions', 'blog', 'news',
        'case-studies', 'testimonials', 'technology', 'partners'
      ],
      followLinks = false
    } = body;

    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Crawling website:', url, 'max pages:', maxPages);

    const result = await crawlWebsite(url, maxPages, targetPages, followLinks, authHeader);

    console.log('Crawling completed successfully. Pages crawled:', result.pages.length);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in crawl-website:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function crawlWebsite(
  startUrl: string,
  maxPages: number,
  targetPages: string[],
  followLinks: boolean,
  authHeader: string
): Promise<CrawlResult> {
  const baseUrl = new URL(startUrl);
  const visited = new Set<string>();
  const pages: PageResult[] = [];

  const urlsToFetch: string[] = [];

  // Add homepage
  urlsToFetch.push(normalizeUrl(startUrl));

  // Add target pages
  for (const page of targetPages) {
    if (!page) continue; // Skip empty string (homepage already added)
    const testUrl = new URL(startUrl);
    testUrl.pathname = `/${page}`;
    const normalizedUrl = normalizeUrl(testUrl.href);
    if (!urlsToFetch.includes(normalizedUrl)) {
      urlsToFetch.push(normalizedUrl);
    }

    // Also try with .html extension
    testUrl.pathname = `/${page}.html`;
    const htmlUrl = normalizeUrl(testUrl.href);
    if (!urlsToFetch.includes(htmlUrl)) {
      urlsToFetch.push(htmlUrl);
    }
  }

  const urlsToProcess = urlsToFetch.slice(0, maxPages);

  console.log(`Processing ${urlsToProcess.length} URLs`);

  const scrapeFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-website`;

  // Batch process in groups of 5 to avoid overwhelming the server
  const batchSize = 5;
  const batches: string[][] = [];
  for (let i = 0; i < urlsToProcess.length; i += batchSize) {
    batches.push(urlsToProcess.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const fetchPromises = batch.map(async (url) => {
      const normalizedUrl = normalizeUrl(url);
      if (visited.has(normalizedUrl)) return null;
      visited.add(normalizedUrl);

      try {
        console.log(`Fetching: ${url}`);

        const response = await fetch(scrapeFunctionUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            includeLinks: followLinks,
            screenshot: false,
          }),
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${url}: ${response.status}`);
          return null;
        }

        const result = await response.json();
        if (!result.success) {
          console.error(`Scraping failed for ${url}:`, result.error);
          return null;
        }

        return {
          url,
          title: result.data.title || '',
          content: result.data.html || '',
          text: result.data.text || result.data.content || '',
          links: result.data.links || [],
          socialLinks: result.data.socialLinks || [],
          emails: result.data.emails || [],
          metadata: result.data.metadata || {},
          structuredData: result.data.structuredData,
        } as PageResult;
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(fetchPromises);
    for (const result of batchResults) {
      if (result) {
        pages.push(result);
      }
    }

    // Small delay between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const allEmails = new Set<string>();
  const allSocialLinks = new Set<string>();

  for (const page of pages) {
    page.emails.forEach(email => allEmails.add(email));
    page.socialLinks.forEach(link => allSocialLinks.add(link));
  }

  // Categorize pages by type
  const pagesByType = {
    homepage: 0,
    about: 0,
    contact: 0,
    services: 0,
    blog: 0,
    other: 0,
  };

  for (const page of pages) {
    const path = new URL(page.url).pathname.toLowerCase();
    const title = page.title.toLowerCase();

    if (path === '/' || path === '') {
      pagesByType.homepage++;
    } else if (path.includes('about') || title.includes('about')) {
      pagesByType.about++;
    } else if (path.includes('contact') || title.includes('contact')) {
      pagesByType.contact++;
    } else if (path.includes('service') || path.includes('product') || path.includes('solution')) {
      pagesByType.services++;
    } else if (path.includes('blog') || path.includes('news') || path.includes('article')) {
      pagesByType.blog++;
    } else {
      pagesByType.other++;
    }
  }

  return {
    rootUrl: startUrl,
    pages,
    summary: {
      totalPages: pages.length,
      totalEmails: allEmails.size,
      totalSocialLinks: allSocialLinks.size,
      uniqueEmails: Array.from(allEmails),
      uniqueSocialLinks: Array.from(allSocialLinks),
      pagesByType,
    },
  };
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    let pathname = parsed.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;
    return parsed.href;
  } catch {
    return url;
  }
}
