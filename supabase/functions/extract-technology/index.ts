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

    // Extract visible text from HTML for better processing
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Use OpenAI to extract technology information
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
            content: `You are an expert technology stack analyzer. Extract ALL technologies, partners, and integrations from the provided webpage content with PERFECT accuracy.

EXTRACTION RULES:

1. TECHNOLOGY STACK (techStack):
   - Programming Languages: JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, C#, C++, Rust, Swift, Kotlin, etc.
   - Frontend: React, Vue.js, Angular, Svelte, Next.js, Nuxt.js, Gatsby, etc.
   - Backend: Node.js, Express, Django, Flask, FastAPI, Spring Boot, Ruby on Rails, Laravel, .NET, etc.
   - Databases: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, DynamoDB, Cassandra, Neo4j, etc.
   - Cloud Providers: AWS, Google Cloud (GCP), Microsoft Azure, DigitalOcean, Heroku, Vercel, Netlify, etc.
   - DevOps/Infrastructure: Docker, Kubernetes, Jenkins, GitLab CI, GitHub Actions, Terraform, Ansible, etc.
   - Mobile: React Native, Flutter, SwiftUI, Jetpack Compose, Xamarin, etc.
   - AI/ML: TensorFlow, PyTorch, scikit-learn, Keras, OpenAI API, Hugging Face, etc.
   - Data Processing: Apache Spark, Kafka, Airflow, Hadoop, etc.

2. PARTNERS (partners):
   - Technology/Platform Partners: AWS Partner, Microsoft Partner, Google Cloud Partner, Salesforce Partner, etc.
   - Strategic Business Partners: Major companies they collaborate with
   - Certified Partnerships: Official certifications and partner programs
   - Reseller/Distribution Partners: Companies they work with for distribution

3. INTEGRATIONS (integrations):
   - Business Tools: Slack, Microsoft Teams, Zoom, Google Workspace, etc.
   - CRM/Sales: Salesforce, HubSpot, Pipedrive, Zoho CRM, etc.
   - Marketing: Mailchimp, SendGrid, Marketo, ActiveCampaign, etc.
   - Payment: Stripe, PayPal, Square, Braintree, etc.
   - Analytics: Google Analytics, Mixpanel, Amplitude, Segment, etc.
   - Communication: Twilio, SendGrid, Postmark, etc.
   - Automation: Zapier, Make (Integromat), n8n, etc.
   - Project Management: Jira, Asana, Trello, Monday.com, etc.

CRITICAL INSTRUCTIONS:
- Look for explicit mentions of technologies in text, lists, badges, and descriptions
- Check for technology keywords in alt text, class names, and data attributes
- Extract clean, standardized names (e.g., "React" not "React.js" or "ReactJS")
- Remove version numbers (e.g., "Python 3.11" → "Python")
- Avoid duplicates - each technology should appear once
- If uncertain about categorization, prefer techStack for technical tools
- Include technologies mentioned in job listings, tech blog posts, and about sections
- Look for cloud provider logos, certification badges, and partnership mentions

OUTPUT FORMAT:
Return ONLY valid JSON with no extra text, markdown, or formatting:
{
  "techStack": ["Technology1", "Technology2", ...],
  "partners": ["Partner1", "Partner2", ...],
  "integrations": ["Integration1", "Integration2", ...]
}

Be exhaustive and thorough - extract EVERY technology, partner, and integration mentioned.`
          },
          {
            role: 'user',
            content: `Analyze this webpage and extract ALL technologies, partners, and integrations with perfect accuracy:\n\n${textContent.substring(0, 40000)}`
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
      throw new Error('Failed to extract technology data using AI');
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

    // Validate and clean the data
    const techStack = Array.isArray(extractedData.techStack)
      ? [...new Set(extractedData.techStack.filter((t: any) => typeof t === 'string' && t.trim()))]
      : [];

    const partners = Array.isArray(extractedData.partners)
      ? [...new Set(extractedData.partners.filter((p: any) => typeof p === 'string' && p.trim()))]
      : [];

    const integrations = Array.isArray(extractedData.integrations)
      ? [...new Set(extractedData.integrations.filter((i: any) => typeof i === 'string' && i.trim()))]
      : [];

    console.log('Extracted technology data:', {
      techStackCount: techStack.length,
      partnersCount: partners.length,
      integrationsCount: integrations.length
    });

    return new Response(
      JSON.stringify({
        techStack,
        partners,
        integrations,
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
    console.error('Error in extract-technology function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while extracting technology data',
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
