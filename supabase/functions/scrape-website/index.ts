import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScrapeRequest {
  url: string;
  includeLinks?: boolean;
  screenshot?: boolean;
  waitForSelector?: string;
}

interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  html: string;
  text: string;
  links: string[];
  socialLinks: string[];
  emails: string[];
  metadata: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    description?: string;
    keywords?: string;
    author?: string;
    canonical?: string;
  };
  screenshot?: string;
  structuredData?: {
    headings: { level: number; text: string }[];
    paragraphs: string[];
    lists: string[][];
    tables: string[][][];
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

    const { data: apiKeys, error: keysError } = await supabaseClient
      .from('api_keys')
      .select('playwright_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const body: ScrapeRequest = await req.json();
    const { url, includeLinks = true, screenshot = false, waitForSelector } = body;

    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Scraping URL:', url);

    let result: ScrapeResult;

    if (apiKeys?.playwright_api_key) {
      result = await scrapeWithPlaywright(url, apiKeys.playwright_api_key, {
        includeLinks,
        screenshot,
        waitForSelector
      });
    } else {
      result = await scrapeWithCheerio(url, { includeLinks });
    }

    console.log('Scraping completed successfully');

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
    console.error('Error in scrape-website:', error);
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

async function scrapeWithPlaywright(
  url: string,
  apiKey: string,
  options: { includeLinks?: boolean; screenshot?: boolean; waitForSelector?: string }
): Promise<ScrapeResult> {
  console.log('Using Playwright for scraping:', url);

  const playwrightEndpoint = `https://production-sfo.browserless.io/chromium/playwright?token=${apiKey}`;

  const script = `
    const browser = await playwright.chromium.connectOverCDP('${playwrightEndpoint}');
    const page = await browser.newPage();

    try {
      await page.goto('${url}', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      ${options.waitForSelector ? `await page.waitForSelector('${options.waitForSelector}', { timeout: 10000 });` : ''}

      const title = await page.title();
      const content = await page.content();
      const text = await page.evaluate(() => document.body.innerText);

      const metadata = await page.evaluate(() => {
        const getMeta = (name) => {
          const meta = document.querySelector(\`meta[property="\${name}"], meta[name="\${name}"]\`);
          return meta ? meta.getAttribute('content') : null;
        };

        const getLink = (rel) => {
          const link = document.querySelector(\`link[rel="\${rel}"]\`);
          return link ? link.getAttribute('href') : null;
        };

        return {
          ogTitle: getMeta('og:title'),
          ogDescription: getMeta('og:description'),
          ogImage: getMeta('og:image'),
          description: getMeta('description'),
          keywords: getMeta('keywords'),
          author: getMeta('author'),
          canonical: getLink('canonical'),
        };
      });

      const links = ${options.includeLinks} ? await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
      }) : [];

      ${options.screenshot ? `const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });` : 'const screenshot = null;'}

      await browser.close();

      return {
        title,
        content,
        text,
        metadata,
        links,
        screenshot,
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  `;

  const playwrightResponse = await fetch('https://production-sfo.browserless.io/function', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({
      token: apiKey,
      code: script,
    }),
  });

  if (!playwrightResponse.ok) {
    const errorText = await playwrightResponse.text();
    console.error('Playwright API error:', errorText);
    throw new Error(`Playwright API error: ${playwrightResponse.status}`);
  }

  const playwrightData = await playwrightResponse.json();

  const { title, content, text, metadata, links, screenshot: screenshotData } = playwrightData;

  const $ = cheerio.load(content);
  const { socialLinks, emails } = extractContactInfo($);
  const structuredData = extractStructuredData($);

  return {
    url,
    title,
    content,
    html: content,
    text,
    links: options.includeLinks ? links : [],
    socialLinks,
    emails,
    metadata,
    screenshot: screenshotData,
    structuredData,
  };
}

async function scrapeWithCheerio(
  url: string,
  options: { includeLinks?: boolean }
): Promise<ScrapeResult> {
  console.log('Using Cheerio for scraping:', url);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "DNT": "1",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove script and style tags
  $('script').remove();
  $('style').remove();
  $('noscript').remove();

  const title = $('title').text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                $('h1').first().text().trim() || '';

  const metadata = {
    ogTitle: $('meta[property="og:title"]').attr('content'),
    ogDescription: $('meta[property="og:description"]').attr('content'),
    ogImage: $('meta[property="og:image"]').attr('content'),
    description: $('meta[name="description"]').attr('content'),
    keywords: $('meta[name="keywords"]').attr('content'),
    author: $('meta[name="author"]').attr('content'),
    canonical: $('link[rel="canonical"]').attr('href'),
  };

  const text = $('body').text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50000);

  const links = options.includeLinks ? extractLinks($, url) : [];
  const { socialLinks, emails } = extractContactInfo($);
  const structuredData = extractStructuredData($);

  return {
    url,
    title,
    content: text,
    html,
    text,
    links,
    socialLinks,
    emails,
    metadata,
    structuredData,
  };
}

function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    try {
      const absoluteUrl = new URL(href, baseUrl).href;
      links.add(absoluteUrl);
    } catch {
      // Invalid URL, skip
    }
  });

  return Array.from(links);
}

function extractContactInfo($: cheerio.CheerioAPI): { socialLinks: string[]; emails: string[] } {
  const socialPatterns = [
    { regex: /https?:\/\/(www\.)?(linkedin\.com\/company\/[^\s"'<>]+)/gi, platform: 'linkedin' },
    { regex: /https?:\/\/(www\.)?(linkedin\.com\/in\/[^\s"'<>]+)/gi, platform: 'linkedin' },
    { regex: /https?:\/\/(www\.)?(twitter\.com\/[^\s"'<>]+)/gi, platform: 'twitter' },
    { regex: /https?:\/\/(www\.)?(x\.com\/[^\s"'<>]+)/gi, platform: 'x' },
    { regex: /https?:\/\/(www\.)?(facebook\.com\/[^\s"'<>]+)/gi, platform: 'facebook' },
    { regex: /https?:\/\/(www\.)?(instagram\.com\/[^\s"'<>]+)/gi, platform: 'instagram' },
    { regex: /https?:\/\/(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)?[^\s"'<>]+)/gi, platform: 'youtube' },
  ];

  const socialLinks = new Set<string>();
  const emails = new Set<string>();

  // Extract from href attributes
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';

    // Check for social media links
    for (const { regex } of socialPatterns) {
      const matches = href.matchAll(regex);
      for (const match of matches) {
        socialLinks.add(match[0]);
      }
    }

    // Check for mailto links
    if (href.startsWith('mailto:')) {
      const email = href.replace('mailto:', '').split('?')[0].toLowerCase();
      if (isValidEmail(email)) {
        emails.add(email);
      }
    }
  });

  // Extract from text content
  const bodyHtml = $('body').html() || '';

  // Extract emails from text
  const emailPattern = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const emailMatches = bodyHtml.matchAll(emailPattern);
  for (const match of emailMatches) {
    const email = match[1].toLowerCase();
    if (isValidEmail(email)) {
      emails.add(email);
    }
  }

  // Extract social links from text
  for (const { regex } of socialPatterns) {
    const matches = bodyHtml.matchAll(regex);
    for (const match of matches) {
      socialLinks.add(match[0]);
    }
  }

  return {
    socialLinks: Array.from(socialLinks),
    emails: Array.from(emails),
  };
}

function isValidEmail(email: string): boolean {
  if (!email.includes('@')) return false;

  const invalidExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js'];
  if (invalidExtensions.some(ext => email.toLowerCase().includes(ext))) return false;

  const invalidDomains = ['example.com', 'domain.com', 'test.com', 'localhost'];
  if (invalidDomains.some(domain => email.toLowerCase().includes(domain))) return false;

  const parts = email.split('@');
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (local.length === 0 || domain.length === 0) return false;
  if (!domain.includes('.')) return false;

  return true;
}

function extractStructuredData($: cheerio.CheerioAPI): {
  headings: { level: number; text: string }[];
  paragraphs: string[];
  lists: string[][];
  tables: string[][][];
} {
  const headings: { level: number; text: string }[] = [];
  const paragraphs: string[] = [];
  const lists: string[][] = [];
  const tables: string[][][] = [];

  // Extract headings
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase();
    const level = parseInt(tag?.replace('h', '') || '1');
    const text = $(el).text().trim();
    if (text) {
      headings.push({ level, text });
    }
  });

  // Extract paragraphs (limit to first 50)
  $('p').slice(0, 50).each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) {
      paragraphs.push(text);
    }
  });

  // Extract lists
  $('ul, ol').slice(0, 20).each((_, el) => {
    const items: string[] = [];
    $(el).find('li').each((_, li) => {
      const text = $(li).text().trim();
      if (text) {
        items.push(text);
      }
    });
    if (items.length > 0) {
      lists.push(items);
    }
  });

  // Extract tables (limit to first 10)
  $('table').slice(0, 10).each((_, table) => {
    const rows: string[][] = [];
    $(table).find('tr').each((_, tr) => {
      const cells: string[] = [];
      $(tr).find('td, th').each((_, cell) => {
        cells.push($(cell).text().trim());
      });
      if (cells.length > 0) {
        rows.push(cells);
      }
    });
    if (rows.length > 0) {
      tables.push(rows);
    }
  });

  return { headings, paragraphs, lists, tables };
}
