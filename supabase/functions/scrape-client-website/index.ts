import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScrapeRequest {
  url: string;
  clientId?: string;
}

interface ScrapedData {
  title: string;
  description: string;
  companyInfo: {
    name?: string;
    tagline?: string;
    description?: string;
  };
  contact: {
    email?: string;
    phone?: string;
    address?: string;
  };
  socialMedia: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  technologies: string[];
  headings: string[];
  links: string[];
  images: string[];
}

function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return Array.from(new Set(text.match(emailRegex) || []));
}

function extractPhones(text: string): string[] {
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  return Array.from(new Set(text.match(phoneRegex) || []));
}

function extractTechnologies(html: string): string[] {
  const techKeywords = [
    'react', 'vue', 'angular', 'node', 'python', 'java', 'aws', 'azure',
    'gcp', 'docker', 'kubernetes', 'typescript', 'javascript', 'mongodb',
    'postgresql', 'mysql', 'redis', 'graphql', 'rest', 'api'
  ];

  const lowerHtml = html.toLowerCase();
  return techKeywords.filter(tech => lowerHtml.includes(tech));
}

function extractSocialLinks(doc: any): Record<string, string> {
  const social: Record<string, string> = {};
  const links = doc.querySelectorAll('a[href]');

  links.forEach((link: any) => {
    const href = link.getAttribute('href');
    if (!href) return;

    if (href.includes('linkedin.com')) social.linkedin = href;
    else if (href.includes('twitter.com') || href.includes('x.com')) social.twitter = href;
    else if (href.includes('facebook.com')) social.facebook = href;
    else if (href.includes('instagram.com')) social.instagram = href;
  });

  return social;
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

    const body: ScrapeRequest = await req.json();
    const { url, clientId } = body;

    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Scraping URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    const title = doc.querySelector('title')?.textContent?.trim() || '';
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');

    const h1Elements = Array.from(doc.querySelectorAll('h1')).map((h: any) => h.textContent?.trim() || '');
    const h2Elements = Array.from(doc.querySelectorAll('h2')).map((h: any) => h.textContent?.trim() || '');

    const bodyText = doc.body?.textContent || '';

    const emails = extractEmails(bodyText);
    const phones = extractPhones(bodyText);

    const socialMedia = extractSocialLinks(doc);

    const technologies = extractTechnologies(html);

    const links = Array.from(doc.querySelectorAll('a[href]'))
      .map((a: any) => a.getAttribute('href'))
      .filter((href: string) => href && (href.startsWith('http') || href.startsWith('/')))
      .slice(0, 50);

    const images = Array.from(doc.querySelectorAll('img[src]'))
      .map((img: any) => img.getAttribute('src'))
      .filter((src: string) => src && (src.startsWith('http') || src.startsWith('/')))
      .slice(0, 20);

    const scrapedData: ScrapedData = {
      title,
      description: metaDescription || ogDescription || '',
      companyInfo: {
        name: ogTitle || h1Elements[0] || title,
        tagline: h1Elements[1] || h2Elements[0] || '',
        description: metaDescription || ogDescription || '',
      },
      contact: {
        email: emails[0] || undefined,
        phone: phones[0] || undefined,
      },
      socialMedia,
      technologies,
      headings: [...h1Elements, ...h2Elements].filter(Boolean).slice(0, 10),
      links,
      images,
    };

    if (clientId) {
      await supabaseClient
        .from('clients')
        .update({
          website_data: scrapedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .eq('user_id', user.id);
    }

    console.log('Scraping completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: scrapedData,
        url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in scrape-client-website:', error);
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
