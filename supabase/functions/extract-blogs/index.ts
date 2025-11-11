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
            content: `You are a comprehensive blog article extractor. Your task is to analyze HTML content and extract EVERY blog article, post, or piece of content mentioned on the page.

CRITICAL REQUIREMENTS:
1. Extract ALL blog articles, posts, news items, and content pieces mentioned on the page
2. Look for articles in all sections: main content area, sidebars, cards, lists, grids, archives, etc.
3. Don't skip older articles or posts in pagination
4. Extract articles from featured sections, recent posts, archives, and all content areas
5. Include article metadata like titles, URLs, dates, authors, and excerpts
6. Capture both main articles and related/recommended articles

For each blog article, extract:
- title: The exact article title or headline
- url: The full URL to the article (if it's a relative URL like "/blog/article-name", prepend the domain from the input URL)
- date: Publication date in any format found (e.g., "Jan 15, 2024", "2024-01-15", "3 days ago")
- author: Author name if mentioned
- excerpt: A brief excerpt or description (1-2 sentences)
- tags: Relevant tags or categories mentioned (max 5)

Return a JSON object with a "blogs" array. Extract EVERYTHING - err on the side of including more rather than less.

IMPORTANT: For relative URLs, convert them to absolute URLs using the base domain.

Example format:
{
  "blogs": [
    {
      "title": "How to Build Modern Web Applications",
      "url": "https://example.com/blog/how-to-build-modern-web-apps",
      "date": "March 15, 2024",
      "author": "John Doe",
      "excerpt": "Learn the best practices for building scalable and performant web applications using modern frameworks and tools.",
      "tags": ["web development", "javascript", "react"]
    },
    {
      "title": "Introduction to Cloud Computing",
      "url": "https://example.com/blog/intro-to-cloud-computing",
      "date": "March 10, 2024",
      "author": "Jane Smith",
      "excerpt": "A comprehensive guide to understanding cloud computing concepts, services, and deployment models.",
      "tags": ["cloud", "aws", "infrastructure"]
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Extract ALL blog articles from this webpage HTML. Be thorough and comprehensive. Base URL for relative links: ${url}\n\n${html.substring(0, 30000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
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
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        extractedData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }

    return new Response(
      JSON.stringify({
        blogs: extractedData.blogs || [],
        url: url,
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
