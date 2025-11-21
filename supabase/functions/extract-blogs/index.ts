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

    // Extract ALL links with their anchor text and context from HTML
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links: Array<{ href: string; text: string }> = [];
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1].trim();
      const text = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

      // Only include links with meaningful text
      if (text && href && text.length > 3) {
        links.push({ href, text });
      }
    }

    console.log(`Found ${links.length} total links on the page`);

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

CRITICAL URL RULE:
You MUST use the EXACT href value from the links list. DO NOT modify, clean, or change the href in any way. Copy it character-by-character as it appears in the links list.

EXTRACTION RULES:
1. ONLY extract blog articles explicitly present in the HTML
2. DO NOT generate, invent, or hallucinate any articles
3. Each article MUST have a matching link in the provided links list
4. Use the EXACT href value from the links - do not modify it at all
5. If no blog articles are found, return {"blogs": []}

PROCESS:
1. Look for blog article titles in the HTML
2. For each title, find the matching link in the links list (by matching the anchor text to the title)
3. Copy the exact "href" value from that link - DO NOT CHANGE IT
4. If a title has no matching link, skip that article

For each blog article:
- title: Exact title from HTML
- url: EXACT href value from links list (copy it verbatim, no modifications)
- date: Date if visible
- author: Author if visible
- excerpt: Description if available
- tags: Categories if shown

CRITICAL: The "url" field must be the exact, unmodified href value from the links list.

Examples of what to do:
✓ href="/blog/my-post" → url: "/blog/my-post" (exact copy)
✓ href="https://example.com/blog/post" → url: "https://example.com/blog/post" (exact copy)
✓ href="../posts/article.html" → url: "../posts/article.html" (exact copy)

Examples of what NOT to do:
✗ DO NOT change relative to absolute URLs
✗ DO NOT clean or normalize the URL
✗ DO NOT add or remove slashes
✗ DO NOT modify the URL in any way

OUTPUT FORMAT:
{
  "blogs": [
    {
      "title": "Exact title",
      "url": "Exact href from links list - NO MODIFICATIONS",
      "date": "Date",
      "author": "Author",
      "excerpt": "Excerpt",
      "tags": ["tag1", "tag2"]
    }
  ]
}

REMEMBER: Copy the href value exactly as it appears. The backend will handle URL normalization.`
          },
          {
            role: 'user',
            content: `Extract blog articles from this webpage. Base URL: ${baseOrigin}

CRITICAL: You MUST use the EXACT href values from the links list below. DO NOT modify, guess, or create URLs.

ALL LINKS ON THE PAGE (use these exact hrefs):
${JSON.stringify(links.slice(0, 300), null, 2)}

INSTRUCTIONS:
1. Find blog article titles in the HTML below
2. For each article, find its corresponding link in the links list above
3. Use the EXACT href value from the links list (do not modify it)
4. If you cannot find a matching link for an article, skip that article
5. Return the href exactly as it appears in the links list

HTML CONTENT:
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

    console.log(`Extracted and validated ${blogs.length} blog articles from ${url}`);

    // Log final URLs for debugging
    if (blogs.length > 0) {
      console.log('Final blog URLs:', blogs.map((b: any) => ({ title: b.title, url: b.url })));
    }

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
