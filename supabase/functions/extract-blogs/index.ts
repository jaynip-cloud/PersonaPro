import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url }: RequestPayload = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log('Extracting blogs from:', url);

    const authHeader = req.headers.get("Authorization");
    const scrapeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-website`;

    const scrapeResponse = await fetch(scrapeUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, includeLinks: true }),
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Failed to scrape webpage: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    if (!scrapeData.success) {
      throw new Error('Scraping failed');
    }

    const pageData = scrapeData.data;
    const baseUrl = new URL(url);
    const baseOrigin = baseUrl.origin;

    console.log(`Found ${pageData.links?.length || 0} links on page`);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const structuredData = {
      pageTitle: pageData.title,
      headings: pageData.structuredData?.headings || [],
      paragraphs: pageData.structuredData?.paragraphs?.slice(0, 40) || [],
      links: pageData.links?.slice(0, 200) || [],
    };

    console.log('Structured data prepared:', {
      headings: structuredData.headings.length,
      paragraphs: structuredData.paragraphs.length,
      links: structuredData.links.length
    });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a blog article extractor. Extract ONLY real blog articles from the structured data.

EXTRACTION RULES:
1. Look for article titles in headings
2. Match titles to URLs from the links array
3. Use EXACT URLs from the links array (do not modify)
4. Extract dates, authors, excerpts from nearby text
5. Only extract articles explicitly present in the data
6. Return empty array if no blogs found

For each blog:
- title: Article title from headings
- url: EXACT URL from links array matching the title
- date: Publication date if found
- author: Author name if found
- excerpt: Brief description from paragraphs
- tags: Relevant categories (max 5)

Return JSON: {"blogs": [...]}`
          },
          {
            role: 'user',
            content: `Extract blog articles from this structured webpage data. Base URL: ${baseOrigin}\n\n${JSON.stringify(structuredData, null, 2)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to extract blogs using AI');
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    // Helper function to normalize and validate URLs
    const normalizeUrl = (rawUrl: string): string | null => {
      if (!rawUrl || typeof rawUrl !== 'string') return null;

      let normalizedUrl = rawUrl.trim();

      // Skip anchor-only links
      if (normalizedUrl === '#' || normalizedUrl.startsWith('#')) {
        return null;
      }

      // Skip javascript: and mailto: links
      if (normalizedUrl.startsWith('javascript:') || normalizedUrl.startsWith('mailto:')) {
        return null;
      }

      try {
        // Convert relative URLs to absolute - preserve the exact path
        if (normalizedUrl.startsWith('/')) {
          // Absolute path relative to domain
          normalizedUrl = `${baseOrigin}${normalizedUrl}`;
        } else if (normalizedUrl.startsWith('./')) {
          // Relative to current directory
          const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
          normalizedUrl = `${baseOrigin}${basePath}${normalizedUrl.substring(2)}`;
        } else if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          // Relative URL without prefix - relative to current directory
          const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
          normalizedUrl = `${baseOrigin}${basePath}${normalizedUrl}`;
        }

        // Validate the URL
        const urlObj = new URL(normalizedUrl);

        // Ensure the URL is from the same domain (not external)
        // Extract root domain (e.g., "example.com" from "blog.example.com")
        const baseRootDomain = baseUrl.hostname.split('.').slice(-2).join('.');
        const urlRootDomain = urlObj.hostname.split('.').slice(-2).join('.');

        if (baseRootDomain !== urlRootDomain) {
          console.log(`Skipping external URL: ${normalizedUrl}`);
          return null;
        }

        return normalizedUrl;
      } catch (err) {
        console.error(`Invalid URL: ${rawUrl}`, err);
        return null;
      }
    };

    // Validate and clean the blog data
    const blogs = Array.isArray(extractedData.blogs)
      ? extractedData.blogs
          .map((blog: any, index: number) => {
            // Must have a title
            if (!blog.title || typeof blog.title !== 'string' || !blog.title.trim()) {
              console.log(`Skipping blog at index ${index}: missing title`);
              return null;
            }

            // Log the raw URL before normalization
            console.log(`Blog "${blog.title}": Raw URL = "${blog.url}"`);

            // Normalize the URL
            const normalizedUrl = normalizeUrl(blog.url);
            if (!normalizedUrl) {
              console.log(`Skipping blog "${blog.title}": URL normalization failed for "${blog.url}"`);
              return null;
            }

            console.log(`Blog "${blog.title}": Normalized URL = "${normalizedUrl}"`);

            return {
              title: blog.title.trim(),
              url: normalizedUrl,
              date: (blog.date || '').toString().trim(),
              author: (blog.author || '').toString().trim(),
              excerpt: (blog.excerpt || '').toString().trim(),
              tags: Array.isArray(blog.tags)
                ? blog.tags.slice(0, 5).filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim())
                : []
            };
          })
          .filter((blog: any) => blog !== null)
      : [];

    console.log(`Extracted and validated ${blogs.length} blog articles`);

    // Log final URLs for debugging
    if (blogs.length > 0) {
      console.log('Final blog URLs:', blogs.map((b: any) => ({ title: b.title, url: b.url })));
    }

    return new Response(
      JSON.stringify({
        success: true,
        blogs,
        url: url,
        count: blogs.length,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Error in extract-blogs function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while extracting blogs',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
