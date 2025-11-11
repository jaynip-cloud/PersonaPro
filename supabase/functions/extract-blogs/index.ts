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

    // Extract visible text from HTML for better processing
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Parse base URL for converting relative links
    const baseUrl = new URL(url);
    const baseOrigin = baseUrl.origin;

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
1. ONLY extract blog articles that are explicitly present in the provided content
2. DO NOT generate, invent, or hallucinate any blog articles
3. DO NOT create example or placeholder articles
4. If NO blog articles are found, return an empty blogs array
5. Extract ONLY information that is clearly visible in the content
6. Each article MUST have been explicitly mentioned in the provided text

EXTRACTION REQUIREMENTS:
- Extract ONLY articles that appear on the page (titles must match exactly)
- Look for blog lists, article grids, blog archives, recent posts sections
- Capture article titles, URLs, dates, authors, and excerpts AS THEY APPEAR
- Do NOT paraphrase or modify titles - use exact text from the page
- For URLs: convert relative URLs (e.g., "/blog/article") to absolute URLs using the base URL provided

For each REAL blog article found, extract:
- title: The EXACT article title from the page (do not modify or paraphrase)
- url: Full URL to the article (convert relative URLs to absolute)
- date: Publication date if shown (format as-is)
- author: Author name if mentioned (use exact name from page)
- excerpt: Brief excerpt or description if available (use actual text from page, 1-2 sentences max)
- tags: Tags or categories if shown (max 5)

VALIDATION CHECKLIST:
✓ Is this article title actually on the webpage?
✓ Did I copy the exact title without modification?
✓ Is there a real link to this article?
✓ Am I extracting real content, not making it up?

If you cannot find ANY blog articles on the page, return: {"blogs": []}

DO NOT include articles from:
- Navigation menus (unless they link to actual blog posts on the page)
- Footer links (unless they're clearly blog posts)
- External websites or unrelated content

OUTPUT FORMAT (JSON only, no markdown):
{
  "blogs": [
    {
      "title": "EXACT title from webpage",
      "url": "https://example.com/actual-url",
      "date": "Actual date format from page",
      "author": "Actual author name",
      "excerpt": "Actual excerpt from page",
      "tags": ["actual", "tags", "from", "page"]
    }
  ]
}

REMEMBER: Accuracy over quantity. Return ONLY real articles that exist on the page. When in doubt, DO NOT include it.`
          },
          {
            role: 'user',
            content: `Extract ONLY the real blog articles that actually appear on this webpage. Base URL: ${baseOrigin}

DO NOT generate fake examples. DO NOT hallucinate content. ONLY extract what actually exists.

Content:
${textContent.substring(0, 40000)}`
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

    // Validate and clean the blog data
    const blogs = Array.isArray(extractedData.blogs)
      ? extractedData.blogs
          .filter((blog: any) => {
            // Must have a title
            if (!blog.title || typeof blog.title !== 'string' || !blog.title.trim()) {
              return false;
            }
            // URL should exist and be valid if provided
            if (blog.url && typeof blog.url === 'string') {
              try {
                // Convert relative URLs to absolute
                if (blog.url.startsWith('/')) {
                  blog.url = `${baseOrigin}${blog.url}`;
                } else if (!blog.url.startsWith('http')) {
                  blog.url = `${baseOrigin}/${blog.url}`;
                }
                new URL(blog.url);
              } catch {
                // Invalid URL, skip this blog
                return false;
              }
            }
            return true;
          })
          .map((blog: any) => ({
            title: blog.title.trim(),
            url: blog.url || '',
            date: blog.date || '',
            author: blog.author || '',
            excerpt: blog.excerpt || '',
            tags: Array.isArray(blog.tags) ? blog.tags.slice(0, 5).filter((t: any) => typeof t === 'string') : []
          }))
      : [];

    console.log(`Extracted ${blogs.length} blog articles from ${url}`);

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
