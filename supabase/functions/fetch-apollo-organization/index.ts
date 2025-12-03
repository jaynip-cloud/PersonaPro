import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logger, LogContext } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  clientId: string;
  apolloApiKey?: string;
}

interface ApolloOrganizationEnrich {
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
  };
}

interface ApolloOrganizationFull {
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    linkedin_url?: string;
    twitter_url?: string;
    facebook_url?: string;
    logo_url?: string;
    industry?: string;
    estimated_num_employees?: number;
    founded_year?: number;
    short_description?: string;
    seo_description?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    street_address?: string;
    raw_address?: string;
    primary_phone?: { number?: string };
    phone?: string;
    annual_revenue?: number;
    annual_revenue_printed?: string;
    total_funding?: number;
    total_funding_printed?: string;
    latest_funding_stage?: string;
    latest_funding_round_date?: string;
    keywords?: string[];
    technology_names?: string[];
    current_technologies?: Array<{
      uid?: string;
      name?: string;
      category?: string;
    }>;
    funding_events?: Array<{
      id?: string;
      date?: string;
      type?: string;
      amount?: string;
      investors?: string;
      news_url?: string;
    }>;
    employee_metrics?: Array<{
      start_date?: string;
      departments?: Array<{
        functions?: string;
        new?: number;
        retained?: number;
        churned?: number;
      }>;
    }>;
    departmental_head_count?: Record<string, number>;
    industries?: string[];
    secondary_industries?: string[];
    alexa_ranking?: number;
    primary_domain?: string;
    linkedin_uid?: string;
  };
}

// Extract domain from website URL
function extractDomain(url: string): string | null {
  if (!url) return null;
  
  try {
    // Remove protocol if present
    let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Remove path and query
    domain = domain.split('/')[0].split('?')[0];
    // Remove port if present
    domain = domain.split(':')[0];
    return domain.trim() || null;
  } catch (e) {
    return null;
  }
}

// Enrich organization to get organization_id
async function enrichOrganization(
  domain: string,
  apolloApiKey: string,
  context: LogContext
): Promise<string | null> {
  try {
    logger.apiCall('Apollo Organizations Enrich', 'GET', `https://api.apollo.io/api/v1/organizations/enrich?domain=${domain}`, context);
    const startTime = Date.now();
    
    const response = await fetch(
      `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey,
        },
      }
    );

    const duration = Date.now() - startTime;
    logger.apiResponse('Apollo Organizations Enrich', response.status, duration, context);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Apollo Organization Enrichment failed', context, { status: response.status, error: errorText });
      return null;
    }

    const data: ApolloOrganizationEnrich = await response.json();
    const organization = data.organization;
    
    if (organization?.id) {
      logger.success('Organization ID retrieved', context, { organizationId: organization.id, organizationName: organization.name });
      return organization.id;
    }

    logger.warn('No organization ID found in response', context, { data });
    return null;
  } catch (error: any) {
    logger.error('Error enriching organization', context, { error: error.message });
    return null;
  }
}

// Get full organization details
async function getOrganizationDetails(
  organizationId: string,
  apolloApiKey: string,
  context: LogContext
): Promise<ApolloOrganizationFull['organization'] | null> {
  try {
    logger.apiCall('Apollo Organizations Get', 'GET', `https://api.apollo.io/api/v1/organizations/${organizationId}`, context);
    const startTime = Date.now();
    
    const response = await fetch(
      `https://api.apollo.io/api/v1/organizations/${organizationId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey,
        },
      }
    );

    const duration = Date.now() - startTime;
    logger.apiResponse('Apollo Organizations Get', response.status, duration, context);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Apollo Organization Get failed', context, { status: response.status, error: errorText });
      return null;
    }

    const data: ApolloOrganizationFull = await response.json();
    const organization = data.organization;
    
    if (organization) {
      // Debug: Log what fields Apollo actually returned
      logger.debug('Apollo organization raw data', context, {
        hasKeywords: !!organization.keywords,
        keywordsCount: organization.keywords?.length || 0,
        hasTechnologies: !!organization.current_technologies,
        technologiesCount: organization.current_technologies?.length || 0,
        hasTechnologyNames: !!organization.technology_names,
        technologyNamesCount: organization.technology_names?.length || 0,
        hasFunding: !!organization.total_funding,
        hasRevenue: !!organization.annual_revenue,
        hasFundingEvents: !!organization.funding_events,
        fundingEventsCount: organization.funding_events?.length || 0,
        hasEmployeeMetrics: !!organization.employee_metrics,
        hasDepartmentalHeadCount: !!organization.departmental_head_count,
        departmentalHeadCountKeys: organization.departmental_head_count ? Object.keys(organization.departmental_head_count).length : 0,
      });
      
      logger.success('Organization details retrieved', context, { organizationId, organizationName: organization.name });
      return organization;
    }

    logger.warn('No organization details found in response', context, { data });
    return null;
  } catch (error: any) {
    logger.error('Error getting organization details', context, { error: error.message });
    return null;
  }
}

// Map Apollo organization data to client format
function mapApolloToClient(
  apolloOrg: ApolloOrganizationFull['organization']
): Record<string, any> {
  if (!apolloOrg) {
    return {};
  }

  return {
    // Direct field mappings
    company: apolloOrg.name,
    website: apolloOrg.website_url,
    linkedin_url: apolloOrg.linkedin_url,
    twitter_url: apolloOrg.twitter_url,
    facebook_url: apolloOrg.facebook_url,
    logo_url: apolloOrg.logo_url,
    industry: apolloOrg.industry,
    company_size: apolloOrg.estimated_num_employees?.toString(),
    founded: apolloOrg.founded_year?.toString(),
    company_overview: apolloOrg.short_description || apolloOrg.seo_description,
    city: apolloOrg.city,
    state: apolloOrg.state,
    country: apolloOrg.country,
    zip_code: apolloOrg.postal_code,
    street_address: apolloOrg.street_address,
    primary_phone: apolloOrg.primary_phone?.number || apolloOrg.phone,
    annual_revenue: apolloOrg.annual_revenue,
    total_funding: apolloOrg.total_funding,
    latest_funding_stage: apolloOrg.latest_funding_stage,
    
    // Complex data in JSONB
    apollo_data: {
      keywords: apolloOrg.keywords || [],
      technology_names: apolloOrg.technology_names || [],
      current_technologies: apolloOrg.current_technologies || [],
      funding_events: apolloOrg.funding_events || [],
      employee_metrics: apolloOrg.employee_metrics || [],
      departmental_head_count: apolloOrg.departmental_head_count || {},
      industries: apolloOrg.industries || [],
      secondary_industries: apolloOrg.secondary_industries || [],
      alexa_ranking: apolloOrg.alexa_ranking,
      annual_revenue_printed: apolloOrg.annual_revenue_printed,
      total_funding_printed: apolloOrg.total_funding_printed,
      latest_funding_round_date: apolloOrg.latest_funding_round_date,
      raw_address: apolloOrg.raw_address,
    },
  };
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let context: LogContext = { functionName: 'fetch-apollo-organization' };

  logger.startFlow('APOLLO ORGANIZATION FETCH', context);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    logger.step('CORS', 'Handling preflight request', context);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Step 1: Authentication
    logger.step('AUTH', 'Starting authentication', context);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('Missing authorization header', context);
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logger.error('Authentication failed', context, { error: userError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.userId = user.id;
    logger.success('User authenticated', context, { userId: user.id });

    // Step 2: Parse request
    logger.step('PARSE', 'Parsing request body', context);
    const body: RequestBody = await req.json();
    const { clientId, apolloApiKey: requestKey } = body;

    if (!clientId) {
      logger.error('Missing clientId', context);
      return new Response(
        JSON.stringify({ error: 'clientId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get client data
    logger.step('CLIENT', 'Fetching client data', context);
    const { data: clientData, error: clientError } = await supabaseClient
      .from('clients')
      .select('id, company, website')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (clientError || !clientData) {
      logger.error('Client not found', context, { error: clientError });
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.clientName = clientData.company;
    logger.success('Client data retrieved', context, { clientId, company: clientData.company });

    // Step 4: Get Apollo API key
    logger.step('API_KEY', 'Retrieving Apollo API key', context);
    let apolloApiKey = requestKey || Deno.env.get('APOLLO_API_KEY');

    if (!apolloApiKey) {
      const { data: apiKeys } = await supabaseClient
        .from('api_keys')
        .select('apollo_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (apiKeys?.apollo_api_key) {
        apolloApiKey = apiKeys.apollo_api_key;
      }
    }

    if (!apolloApiKey) {
      logger.error('Apollo API key not found', context);
      return new Response(
        JSON.stringify({ error: 'Apollo API key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.success('Apollo API key retrieved', context);

    // Step 5: Extract domain from website
    logger.step('DOMAIN', 'Extracting domain from website', context);
    if (!clientData.website) {
      logger.error('Client website not found', context);
      return new Response(
        JSON.stringify({ error: 'Client website is required to fetch organization data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = extractDomain(clientData.website);
    if (!domain) {
      logger.error('Invalid website URL', context, { website: clientData.website });
      return new Response(
        JSON.stringify({ error: 'Invalid website URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.success('Domain extracted', context, { domain });

    // Step 6: Enrich organization to get organization_id
    logger.step('ORG_ENRICH', 'Enriching organization to get ID', context);
    const organizationId = await enrichOrganization(domain, apolloApiKey, context);

    if (!organizationId) {
      logger.error('Failed to get organization ID', context);
      return new Response(
        JSON.stringify({ error: 'Failed to find organization in Apollo. Please verify the website URL is correct.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 7: Get full organization details
    logger.step('ORG_DETAILS', 'Fetching full organization details', context);
    const organizationData = await getOrganizationDetails(organizationId, apolloApiKey, context);

    if (!organizationData) {
      logger.error('Failed to get organization details', context);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch organization details from Apollo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 8: Skip news articles (not available with current API key)
    logger.step('NEWS', 'Skipping news articles search (not available with current API key)', context);

    // Step 9: Map Apollo data to client format
    logger.step('MAP', 'Mapping Apollo data to client format', context);
    const mappedData = mapApolloToClient(organizationData);

    // Debug: Log what data we're getting from Apollo
    logger.debug('Apollo organization data received', context, {
      hasKeywords: !!organizationData.keywords && organizationData.keywords.length > 0,
      keywordsCount: organizationData.keywords?.length || 0,
      hasTechnologies: !!organizationData.current_technologies && organizationData.current_technologies.length > 0,
      technologiesCount: organizationData.current_technologies?.length || 0,
      hasFunding: !!organizationData.total_funding,
      hasRevenue: !!organizationData.annual_revenue,
      hasFundingEvents: !!organizationData.funding_events && organizationData.funding_events.length > 0,
      fundingEventsCount: organizationData.funding_events?.length || 0,
    });

    // Step 10: Update client record
    logger.step('UPDATE', 'Updating client record', context);
    const { error: updateError } = await supabaseClient
      .from('clients')
      .update(mappedData)
      .eq('id', clientId)
      .eq('user_id', user.id);

    if (updateError) {
      logger.error('Failed to update client', context, { error: updateError });
      return new Response(
        JSON.stringify({ error: 'Failed to update client', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.success('Client record updated', context);

    // Step 11: Skip news articles storage (not available with current API key)
    logger.step('NEWS_SAVE', 'Skipping news articles storage (not available with current API key)', context);
    const articlesSaved = 0;

    const totalDuration = Date.now() - startTime;
    logger.endFlow('APOLLO ORGANIZATION FETCH', context, {
      duration: `${totalDuration}ms`,
      organizationName: organizationData.name,
    });

    // Prepare detailed response with full data
    const responseData = {
      success: true,
      message: `Successfully fetched and updated organization data.`,
      organization: {
        name: organizationData.name,
        industry: organizationData.industry,
        employees: organizationData.estimated_num_employees,
        website: organizationData.website_url,
        linkedin: organizationData.linkedin_url,
        twitter: organizationData.twitter_url,
        facebook: organizationData.facebook_url,
        city: organizationData.city,
        state: organizationData.state,
        country: organizationData.country,
        postalCode: organizationData.postal_code,
        streetAddress: organizationData.street_address,
        rawAddress: organizationData.raw_address,
        founded: organizationData.founded_year,
        description: organizationData.short_description || organizationData.seo_description,
        annualRevenue: organizationData.annual_revenue,
        annualRevenuePrinted: organizationData.annual_revenue_printed,
        totalFunding: organizationData.total_funding,
        totalFundingPrinted: organizationData.total_funding_printed,
        latestFundingStage: organizationData.latest_funding_stage,
        latestFundingRoundDate: organizationData.latest_funding_round_date,
        alexaRanking: organizationData.alexa_ranking,
        logoUrl: organizationData.logo_url,
        phone: organizationData.primary_phone?.number || organizationData.phone,
        primaryDomain: organizationData.primary_domain,
        linkedinUid: organizationData.linkedin_uid,
      },
      dataFetched: {
        keywords: organizationData.keywords || [],
        technologyNames: organizationData.technology_names || [],
        currentTechnologies: organizationData.current_technologies || [],
        fundingEvents: organizationData.funding_events || [],
        employeeMetrics: organizationData.employee_metrics || [],
        departmentalHeadCount: organizationData.departmental_head_count || {},
        industries: organizationData.industries || [],
        secondaryIndustries: organizationData.secondary_industries || [],
        hasRevenue: !!organizationData.annual_revenue,
        hasFunding: !!organizationData.total_funding,
        keywordsCount: organizationData.keywords?.length || 0,
        technologiesCount: organizationData.current_technologies?.length || 0,
        fundingEventsCount: organizationData.funding_events?.length || 0,
        employeeMetricsCount: organizationData.employee_metrics?.length || 0,
      },
      metadata: {
        processingTime: totalDuration,
        timestamp: new Date().toISOString(),
      },
    };

    logger.debug('Response data prepared', context, {
      keywordsCount: responseData.dataFetched.keywordsCount,
      technologiesCount: responseData.dataFetched.technologiesCount,
      fundingEventsCount: responseData.dataFetched.fundingEventsCount,
    });

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    logger.error('Error in fetch-apollo-organization', context, { 
      error: error.message,
      stack: error.stack,
      duration: `${totalDuration}ms`
    });

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

