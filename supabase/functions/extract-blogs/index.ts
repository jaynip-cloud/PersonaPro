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

    // Fetch the webpage content
    const webpageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!webpageResponse.ok) {
      throw new Error(`Failed to fetch webpage: ${webpageResponse.statusText}`);
    }

    const html = await webpageResponse.text();

    // Parse base URL for converting relative links
    const baseUrl = new URL(url);
    const baseOrigin = baseUrl.origin;

    // Extract links with their anchor text from HTML for better URL accuracy
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links: Array<{ href: string; text: string }> = [];
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text && href) {
        links.push({ href, text });
      }
    }

    // Clean HTML while preserving structure for context
    const cleanedHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .substring(0, 50000);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Use OpenAI to extract blogs from the HTML
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a precise blog article extractor. Extract ONLY real blog articles that actually exist on the provided webpage.

CRITICAL RULES - READ CAREFULLY:
1. ONLY extract blog articles that are explicitly present in the HTML content
2. DO NOT generate, invent, or hallucinate any blog articles
3. DO NOT create example or placeholder articles
4. If NO blog articles are found, return an empty blogs array
5. Each article MUST have an actual link/URL found in the HTML
6. Match article titles with their corresponding URLs from the links list provided

EXTRACTION REQUIREMENTS:
- Identify blog articles by looking for article elements, blog post cards, post listings
- Extract EXACT titles as they appear in the HTML
- Match each title with its corresponding URL from the provided links
- URLs MUST be actual hrefs found in the HTML (from the links list)
- Look for common blog patterns: article titles with dates, author names, excerpts
- Verify the URL actually points to a blog post (typically contains /blog/, /post/, /article/, or year/month patterns)

For each REAL blog article found, extract:
- title: The EXACT article title from the HTML (do not modify)
- url: The actual href URL that corresponds to this article title (match from links list)
- date: Publication date if visible
- author: Author name if mentioned
- excerpt: Brief description if available (actual text from page)
- tags: Categories or tags if shown

URL MATCHING RULES:
- Find the article title in the HTML
- Look for the corresponding <a> tag that contains this title
- Extract the exact href value from that <a> tag
- If the URL is relative (starts with /), prepend the base URL
- If the URL is absolute, use it as-is
- The URL should logically match the article (not homepage, not category pages)

VALIDATION:
✓ Does this title appear in the HTML?
✓ Is there a real <a href="..."> for this article?
✓ Does the URL make sense for this article?
✓ Am I using the actual href value, not making it up?

If you cannot find ANY blog articles, return: {"blogs": []}

OUTPUT FORMAT (JSON only):
{
  "blogs": [
    {
      "title": "Exact title from HTML",
      "url": "Actual href URL from HTML",
      "date": "Date if available",
      "author": "Author if available",
      "excerpt": "Description if available",
      "tags": ["tags", "if", "available"]
    }
  ]
}

REMEMBER: Every URL must be an actual href found in the HTML. Match titles to their real links.`
          },
          {
            role: 'user',
            content: `Extract blog articles from this webpage. Base URL for relative links: ${baseOrigin}

Here are ALL the links found on the page with their anchor text:
${JSON.stringify(links.slice(0, 200), null, 2)}

Now analyze the HTML to find blog articles and match them with their correct URLs from the links above:

${cleanedHtml}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
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

      try {
        // Remove query parameters and anchors for cleaner URLs (optional)
        // normalizedUrl = normalizedUrl.split('?')[0].split('#')[0];

        // Convert relative URLs to absolute
        if (normalizedUrl.startsWith('/')) {
          normalizedUrl = `${baseOrigin}${normalizedUrl}`;
        } else if (normalizedUrl.startsWith('./')) {
          normalizedUrl = `${baseOrigin}/${normalizedUrl.substring(2)}`;
        } else if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          // Relative URL without leading slash
          normalizedUrl = `${baseOrigin}/${normalizedUrl}`;
        }

        // Validate the URL
        const urlObj = new URL(normalizedUrl);

        // Ensure the URL is from the same domain or subdomain
        if (!urlObj.hostname.includes(baseUrl.hostname.split('.').slice(-2).join('.'))) {
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
          .map((blog: any) => {
            // Must have a title
            if (!blog.title || typeof blog.title !== 'string' || !blog.title.trim()) {
              return null;
            }

            // Normalize the URL
            const normalizedUrl = normalizeUrl(blog.url);
            if (!normalizedUrl) {
              console.log(`Skipping blog with invalid URL: ${blog.title}`);
              return null;
            }

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

    console.log(`Extracted and validated ${blogs.length} blog articles from ${url}`);

    return new Response(
      JSON.stringify({
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
