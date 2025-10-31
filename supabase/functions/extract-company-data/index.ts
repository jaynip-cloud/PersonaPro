import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  urls: string[];
  openaiKey: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { urls, openaiKey }: RequestBody = await req.json();

    if (!urls || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "No URLs provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const scrapedData = await scrapeUrls(urls);
    const extractedInfo = await extractCompanyInfo(scrapedData, openaiKey);

    return new Response(
      JSON.stringify(extractedInfo),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function scrapeUrls(urls: string[]): Promise<string> {
  const contents: string[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CompanyBot/1.0)",
        },
      });

      if (response.ok) {
        const html = await response.text();
        const text = extractTextFromHtml(html);
        contents.push(`URL: ${url}\n${text}\n\n`);
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      contents.push(`URL: ${url}\nError: Could not fetch content\n\n`);
    }
  }

  return contents.join("\n---\n\n");
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<style[^>]*>.*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.substring(0, 8000);
}

async function extractCompanyInfo(content: string, openaiKey: string) {
  const prompt = `Analyze the following content from company websites and social media profiles. Extract and structure the information into the following JSON format:

{
  "companyInfo": {
    "name": "Company name",
    "industry": "Industry",
    "description": "Brief description",
    "valueProposition": "Value proposition",
    "founded": "Year founded",
    "location": "Location",
    "size": "Company size",
    "website": "Website URL",
    "mission": "Mission statement",
    "vision": "Vision statement"
  },
  "services": [
    {
      "name": "Service name",
      "description": "Service description",
      "tags": ["tag1", "tag2"],
      "budgetRange": "Budget estimate",
      "duration": "Typical duration"
    }
  ],
  "caseStudies": [
    {
      "title": "Project title",
      "client": "Client name",
      "industry": "Industry",
      "results": ["Result 1", "Result 2"],
      "services": ["Service used"],
      "duration": "Project duration"
    }
  ],
  "team": [
    {
      "name": "Team member name",
      "role": "Role/Title",
      "specialization": "Areas of expertise",
      "experience": "Years of experience"
    }
  ],
  "blogs": [
    {
      "title": "Blog post title",
      "url": "Blog post URL",
      "date": "Publication date",
      "summary": "Brief summary"
    }
  ]
}

Content to analyze:
${content}

Provide only the JSON response, no additional text. If certain information is not available, use empty strings or empty arrays.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a data extraction assistant. Extract company information from provided content and return it as structured JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw error;
  }
}