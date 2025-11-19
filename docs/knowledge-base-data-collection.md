# Knowledge Base Data Collection

## Overview
The Knowledge Base collects comprehensive company intelligence through multiple sources and AI-powered extraction processes.

---

## Data Collection Methods

### 1. **AI-Powered Website Extraction (Primary Method)**
During onboarding, the system automatically extracts data from your company website using AI:

**Process Flow:**
1. User provides company website URL
2. System crawls website pages
3. AI extracts structured data using OpenAI GPT-4
4. Data is validated and stored in database
5. Embeddings are generated for semantic search

**Edge Functions Used:**
- `ai-prefill` - Orchestrates the entire extraction process
- `extract-company-data` - Extracts basic company information
- `extract-services` - Discovers services and products
- `extract-blogs` - Extracts blog articles and content
- `extract-technology` - Analyzes technology stack
- `generate-embeddings` - Creates vector embeddings for search

---

### 2. **Manual Input**
Users can manually add or edit any field through the Knowledge Base UI

---

### 3. **External Web Research**
AI insights generation includes external web research using:
- **Perplexity API** (if configured) - Real-time web search
- **OpenAI Knowledge Base** (fallback) - General knowledge

---

## Database Schema: `company_profiles` Table

### Basic Company Information
| Field | Type | Description | Collection Method |
|-------|------|-------------|-------------------|
| `id` | uuid | Unique identifier | Auto-generated |
| `user_id` | uuid | Owner user ID | Auto-assigned |
| `company_name` | text | Company name | AI extraction / Manual |
| `website` | text | Company website URL | Manual input (required) |
| `industry` | text | Industry sector | AI extraction / Manual |
| `about` | text | Company description | AI extraction / Manual |
| `value_proposition` | text | Value proposition | AI extraction / Manual |
| `founded` | text | Year founded | AI extraction / Manual |
| `location` | text | Headquarters location | AI extraction / Manual |
| `size` | text | Company size/employees | AI extraction / Manual |
| `mission` | text | Mission statement | AI extraction / Manual |
| `vision` | text | Vision statement | AI extraction / Manual |
| `logo_url` | text | Company logo URL | Manual |

### Contact Information
| Field | Type | Description | Collection Method |
|-------|------|-------------|-------------------|
| `email` | text | Contact email | AI extraction / Manual |
| `phone` | text | Contact phone | AI extraction / Manual |
| `address` | text | Physical address | AI extraction / Manual |

### Social Media Links
| Field | Type | Description | Collection Method |
|-------|------|-------------|-------------------|
| `linkedin_url` | text | LinkedIn profile | AI extraction / Manual |
| `twitter_url` | text | Twitter/X profile | AI extraction / Manual |
| `facebook_url` | text | Facebook page | AI extraction / Manual |
| `instagram_url` | text | Instagram profile | AI extraction / Manual |
| `youtube_url` | text | YouTube channel | AI extraction / Manual |

### Complex Data (JSONB Fields)

#### `services` - Array of service objects
```json
[
  {
    "id": "uuid",
    "name": "Service Name",
    "description": "Detailed description",
    "tags": ["tag1", "tag2"],
    "pricing": "Pricing info"
  }
]
```
**Collection:** AI extraction from services/products pages + Manual

#### `leadership` - Array of leadership team members
```json
[
  {
    "id": "uuid",
    "name": "Full Name",
    "role": "Job Title",
    "bio": "Biography",
    "linkedinUrl": "LinkedIn profile URL",
    "experience": "Years of experience",
    "education": "Educational background",
    "skills": ["skill1", "skill2"]
  }
]
```
**Collection:** AI extraction from about/team pages + Manual

#### `blogs` - Array of blog articles
```json
[
  {
    "id": "uuid",
    "title": "Blog Title",
    "url": "Article URL",
    "date": "Publication date",
    "summary": "Article summary",
    "author": "Author name"
  }
]
```
**Collection:** AI extraction from blog pages + Manual

#### `technology` - Technology stack and partners
```json
{
  "stack": ["React", "Node.js", "PostgreSQL"],
  "partners": ["Partner Company 1", "Partner Company 2"],
  "integrations": ["Integration 1", "Integration 2"]
}
```
**Collection:** AI extraction from technology/partners pages + Manual

#### `case_studies` - Array of case studies (Future use)
```json
[
  {
    "id": "uuid",
    "title": "Case Study Title",
    "client": "Client Name",
    "challenge": "Problem description",
    "solution": "Solution provided",
    "results": "Outcomes achieved"
  }
]
```
**Collection:** Manual (not currently extracted)

#### `press_news` - Array of press releases (Future use)
```json
[
  {
    "id": "uuid",
    "title": "Press Release Title",
    "date": "Publication date",
    "summary": "Brief summary",
    "url": "Full article URL"
  }
]
```
**Collection:** Manual (not currently extracted)

#### `careers` - Careers information (Future use)
```json
{
  "openPositions": 5,
  "culture": "Company culture description",
  "benefits": ["benefit1", "benefit2"]
}
```
**Collection:** Manual (not currently extracted)

#### `documents` - Uploaded document metadata
```json
[
  {
    "id": "uuid",
    "name": "document.pdf",
    "url": "storage URL",
    "uploadedAt": "timestamp",
    "size": 1024
  }
]
```
**Collection:** Manual file upload

### AI-Generated Fields

#### `ai_insights` - Comprehensive AI analysis
```json
{
  "executiveSummary": "4-6 paragraph comprehensive overview",
  "summary": "Brief overview",
  "strengths": ["strength 1", "strength 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "marketPosition": "Market position analysis",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "contentStrategy": "Content strategy analysis",
  "techStack": "Technology assessment",
  "kpis": {
    "contentScore": 85,
    "contentScoreReasoning": "Explanation...",
    "teamStrength": 70,
    "teamStrengthReasoning": "Explanation...",
    "techModernity": 75,
    "techModernityReasoning": "Explanation...",
    "marketReadiness": 80,
    "marketReadinessReasoning": "Explanation...",
    "brandPresence": 65,
    "brandPresenceReasoning": "Explanation...",
    "growthPotential": 90,
    "growthPotentialReasoning": "Explanation..."
  },
  "sentiment": {
    "overall": "positive",
    "score": 85,
    "brandTone": "professional",
    "marketPerception": "Analysis...",
    "confidenceLevel": "high",
    "reasoning": "Why this assessment..."
  },
  "behaviorAnalysis": {
    "contentBehavior": "Analysis...",
    "marketApproach": "Analysis...",
    "innovationLevel": "moderate",
    "innovationReasoning": "Why...",
    "customerFocus": "Analysis...",
    "growthOrientation": "Analysis..."
  },
  "riskFactors": ["risk 1", "risk 2"],
  "competitiveEdge": ["differentiator 1", "differentiator 2"]
}
```
**Collection:** Generated by `generate-kb-insights` edge function using OpenAI GPT-4

| Field | Type | Description | Collection Method |
|-------|------|-------------|-------------------|
| `ai_insights` | jsonb | Comprehensive AI analysis | Generated via edge function |
| `ai_insights_generated_at` | timestamptz | Last generation timestamp | Auto-set on generation |

### System Fields
| Field | Type | Description |
|-------|------|-------------|
| `onboarding_completed` | boolean | Onboarding status |
| `onboarding_step` | integer | Current onboarding step |
| `created_at` | timestamptz | Profile creation time |
| `updated_at` | timestamptz | Last update time |

---

## Vector Database Integration

### `document_embeddings` Table
Stores vector embeddings for semantic search:

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Unique identifier |
| `user_id` | uuid | Owner user ID |
| `content` | text | Original text content |
| `embedding` | vector(1536) | OpenAI embedding vector |
| `metadata` | jsonb | Additional metadata |
| `source_type` | text | Source type (document/transcript/kb) |
| `created_at` | timestamptz | Creation timestamp |

**Usage:**
- Powers semantic search across documents
- Enables AI-powered question answering
- Used for intelligent matching and recommendations

---

## AI Extraction Process

### Step 1: Website Crawling
- User provides website URL
- System identifies key pages (about, services, blog, team, contact)
- Pages are fetched and prepared for analysis

### Step 2: AI Analysis
- **Model:** OpenAI GPT-4
- **Method:** Structured data extraction with JSON schema
- **Context:** Full page content + metadata
- **Output:** Structured JSON data

### Step 3: Data Validation & Storage
- Validate extracted data structure
- Clean and normalize data
- Store in PostgreSQL with JSONB
- Update timestamps

### Step 4: Embedding Generation
- Text content is chunked
- OpenAI `text-embedding-3-small` generates embeddings
- Vectors stored in pgvector for semantic search

### Step 5: Insights Generation (On Demand)
- User triggers "Generate AI Insights"
- System analyzes all collected data
- External web research (optional)
- Comprehensive executive summary generated
- KPIs calculated with reasoning

---

## API Integrations

### OpenAI API
**Used for:**
- Data extraction from websites
- Embedding generation
- Insights generation
- Question answering

**Models:**
- GPT-4o (extraction & insights)
- text-embedding-3-small (embeddings)

### Perplexity API (Optional)
**Used for:**
- Real-time web research
- External validation
- Market intelligence

**Model:** Sonar

---

## Data Flow Diagram

```
User Website URL
       ↓
   [AI Crawl]
       ↓
   [Extract Data] → Company Info, Services, Leadership, Blogs, Tech Stack
       ↓
   [Store in DB] → company_profiles table (PostgreSQL)
       ↓
   [Generate Embeddings] → document_embeddings table (pgvector)
       ↓
   [User Trigger]
       ↓
   [Generate Insights] → AI analysis with web research
       ↓
   [Store Insights] → ai_insights field (JSONB)
       ↓
   [Display in UI] → Knowledge Base page with executive summary
```

---

## Security & Privacy

- **RLS (Row Level Security):** Users can only access their own data
- **API Keys:** Stored securely in `api_keys` table
- **Authentication:** All operations require authenticated user
- **Data Isolation:** Each user's data is completely isolated

---

## Summary

The Knowledge Base collects data through:
1. **AI-powered website extraction** (primary method)
2. **Manual user input** (supplementary)
3. **External web research** (for insights)
4. **Vector embeddings** (for semantic search)

All data is stored in a single `company_profiles` table with 30+ fields covering:
- Basic company info (10 fields)
- Contact details (3 fields)
- Social media (5 fields)
- Complex data structures (8 JSONB fields)
- AI-generated insights (2 fields)
- System metadata (4 fields)

The system uses OpenAI GPT-4 and pgvector for intelligent data extraction, analysis, and semantic search capabilities.
