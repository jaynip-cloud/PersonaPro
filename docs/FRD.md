# PersonaPro Functional Requirements Document (FRD)

## 1. Executive Summary

### 1.1 Purpose
This document defines the functional requirements for PersonaPro, a comprehensive Client Intelligence and Relationship Management Platform. The system uses AI-powered analytics to help businesses understand their clients, manage relationships, generate personalized pitches, and make data-driven decisions.

### 1.2 System Overview
PersonaPro is a web-based application that combines:
- Client relationship management (CRM) capabilities
- AI-powered persona analysis and sentiment tracking
- Document and meeting transcript processing
- Opportunity and project management
- Intelligent pitch generation
- Knowledge base management
- Multi-source data integration

### 1.3 Target Users
- Sales professionals
- Account managers
- Customer success managers
- Business development teams
- Marketing professionals

### 1.4 Key Benefits
- Automated client intelligence gathering
- AI-powered insights and recommendations
- Personalized pitch generation
- Centralized client data management
- Relationship health tracking
- Opportunity pipeline management

---

## 2. System Architecture Overview

### 2.1 Technology Stack
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Edge Functions)
- **AI Services**: OpenAI GPT-4, Perplexity API (optional)
- **Vector Database**: pgvector for semantic search
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

### 2.2 Core Components
1. **Frontend Application** (`src/`)
   - React components and pages
   - UI components library
   - Context providers for state management
   - Utility functions

2. **Backend Services** (`supabase/functions/`)
   - Edge Functions for business logic
   - AI processing functions
   - Data enrichment services
   - Integration connectors

3. **Database** (`supabase/migrations/`)
   - PostgreSQL with Row Level Security (RLS)
   - Vector embeddings for semantic search
   - Comprehensive schema for all entities

---

## 3. User Roles and Permissions

### 3.1 User Types
- **Authenticated User**: Standard user with full access to their own data
- All users have isolated data access (RLS enforced)

### 3.2 Access Control
- Row Level Security (RLS) ensures users can only access their own data
- All database tables enforce user_id-based access control
- API endpoints require authentication

---

## 4. Functional Requirements

### 4.1 Authentication & Onboarding

#### 4.1.1 User Registration
**FR-AUTH-001**: Users can create an account
- Email and password registration
- Email verification required
- Password reset functionality

**FR-AUTH-002**: User Login
- Email/password authentication
- Session management
- Protected routes

#### 4.1.2 Onboarding Flow
**FR-ONBOARD-001**: First-Time User Onboarding
- Multi-step wizard for company profile setup
- AI-powered website extraction
- Company information collection:
  - Company name, website, industry
  - Services and offerings
  - Team information
  - Case studies
  - Value proposition

**FR-ONBOARD-002**: First Client Creation Wizard
- Guided client addition process
- AI pre-fill from website or manual entry
- Dual AI model comparison (Perplexity vs OpenAI)
- Contact information collection

---

### 4.2 Client Management

#### 4.2.1 Client CRUD Operations
**FR-CLIENT-001**: Create Client
- Manual entry form with multiple tabs:
  - Basic information (name, company, email, phone, role, industry)
  - Contact details (primary/alternate email, phone)
  - Social media links (LinkedIn, Twitter, Instagram, Facebook)
  - Additional information (location, founded, company size, budget)
  - Goals and expectations
- AI-powered pre-fill from website URL
- Apollo organization data enrichment
- Document upload during creation

**FR-CLIENT-002**: View Client List
- Grid/list view of all clients
- Filtering by status (active, inactive, prospect)
- Search functionality
- Sorting options
- Client cards showing key metrics

**FR-CLIENT-003**: View Client Details
- Comprehensive client detail page with tabs:
  - Overview: Key metrics, financial data, health score
  - Relationships: Contacts, communication history
  - Assets: Documents, meeting notes, Fathom recordings
  - Intelligence Agent: AI-powered Q&A
  - Growth: Opportunities and projects
  - Apollo: Enriched organization data
  - Settings: Client configuration

**FR-CLIENT-004**: Edit Client
- Update all client information
- Modify tags and metadata
- Update status and tier

**FR-CLIENT-005**: Delete Client
- Soft delete or hard delete option
- Cascade deletion of related data

#### 4.2.2 Client Enrichment
**FR-CLIENT-006**: Apollo Organization Enrichment
- Fetch organization data from Apollo API
- Technology stack information
- Funding events
- Employee metrics
- Industry classifications
- Revenue and funding data

**FR-CLIENT-007**: Apollo People Enrichment
- Fetch contacts from Apollo API
- LinkedIn profile links
- Role and department information
- Decision maker identification

**FR-CLIENT-008**: OpenAI Client Enrichment
- AI-powered data extraction from website
- Company information extraction
- Service discovery
- Technology stack analysis

---

### 4.3 Contact Management

#### 4.3.1 Contact Operations
**FR-CONTACT-001**: Add Contact
- Manual contact creation
- Link to client
- Fields: name, email, phone, role, department
- Decision maker flag
- Influence level (high, medium, low)
- LinkedIn URL

**FR-CONTACT-002**: View Contacts
- List of all contacts for a client
- Contact cards with key information
- Primary contact indicator
- Decision maker badges

**FR-CONTACT-003**: Edit Contact
- Update contact information
- Modify role and influence level

**FR-CONTACT-004**: Delete Contact
- Remove contact from client

---

### 4.4 Persona Analysis

#### 4.4.1 Persona Generation
**FR-PERSONA-001**: Generate Persona
- AI-powered persona analysis from:
  - Documents
  - Meeting transcripts
  - Communication history
  - Social profiles
- Output includes:
  - Communication style
  - Decision-making style
  - Priorities and pain points
  - Preferred channels
  - Response patterns
  - Sentiment analysis

**FR-PERSONA-002**: Persona Metrics
- Detailed metrics display:
  - Sentiment score
  - Cooperation level
  - Risk assessment
  - Communication style confidence
  - Response speed
  - Negotiation tone
  - Engagement patterns
  - Top project types
  - Sentiment trends

**FR-PERSONA-003**: Evidence Snippets
- View supporting evidence for persona conclusions
- Source attribution
- Contribution scoring
- Sentiment indicators

**FR-PERSONA-004**: Persona Editor
- Manual persona editing
- Adjust confidence levels
- Update priorities and pain points

---

### 4.5 Document Management

#### 4.5.1 Document Operations
**FR-DOC-001**: Upload Documents
- File upload interface
- Supported formats: PDF, DOCX, TXT, etc.
- Document type classification (proposal, contract, report, note, email)
- Automatic processing status

**FR-DOC-002**: Document Processing
- AI-powered text extraction
- Summary generation
- Key insights extraction
- Tag assignment
- Vector embedding generation for semantic search

**FR-DOC-003**: View Documents
- Document list with metadata
- Search functionality
- Filter by type, status, tags
- Download documents

**FR-DOC-004**: Document Analysis
- View AI-generated summaries
- See extracted insights
- Review tags and classifications

---

### 4.6 Meeting Management

#### 4.6.1 Meeting Notes
**FR-MEETING-001**: Create Meeting Notes
- Manual meeting note entry
- Title, date, and notes text
- Link to client and contacts
- Save to database

**FR-MEETING-002**: View Meeting Notes
- List of all meeting notes for a client
- Chronological display
- Search and filter

#### 4.6.2 Meeting Transcripts
**FR-MEETING-003**: Fathom Integration
- Connect Fathom account via OAuth
- Sync meeting recordings
- Automatic transcript import
- Speaker identification
- Action items extraction
- Sentiment analysis

**FR-MEETING-004**: Transcript Processing
- Vector embedding generation
- Semantic search capability
- AI-powered analysis
- Integration with Intelligence Agent

**FR-MEETING-005**: View Transcripts
- List of all transcripts
- Full transcript display
- Action items highlighted
- Sentiment indicators
- Edit transcript metadata

---

### 4.7 Intelligence Agent

#### 4.7.1 Query Interface
**FR-INTEL-001**: Ask Questions
- Natural language query interface
- Two modes:
  - Quick: Fast responses using cached data
  - Deep: Comprehensive analysis with full data search
- Real-time query processing

**FR-INTEL-002**: Query Processing
- Semantic search across:
  - Documents
  - Meeting transcripts
  - Client data
  - Apollo data
  - Contacts
- AI-powered answer generation
- Citation tracking
- Source attribution

**FR-INTEL-003**: Query Results
- Display AI-generated answers
- Show citations with sources
- Relevance scores
- Processing time and cost tracking
- Model information

**FR-INTEL-004**: Query History
- View past queries
- Re-run queries
- Track token usage and costs

---

### 4.8 Opportunity Management

#### 4.8.1 Opportunity Operations
**FR-OPP-001**: Create Opportunity
- Manual opportunity creation
- AI-generated opportunity suggestions
- Fields: title, description, value, stage, probability, expected close date
- Link to client

**FR-OPP-002**: View Opportunities
- List of all opportunities
- Filter by stage, client, value
- Pipeline view
- Opportunity cards with key metrics

**FR-OPP-003**: Edit Opportunity
- Update opportunity details
- Change stage and probability
- Modify value and timeline

**FR-OPP-004**: Delete Opportunity
- Remove opportunity from system

**FR-OPP-005**: Generate Opportunities
- AI-powered opportunity identification
- Based on client data, persona, and interactions
- Suggested opportunities with reasoning

---

### 4.9 Project Management

#### 4.9.1 Project Operations
**FR-PROJ-001**: Create Project
- Manual project creation
- AI-generated project suggestions
- Fields: name, description, status, budget, timeline, due date
- Link to client and opportunity

**FR-PROJ-002**: View Projects
- List of all projects
- Filter by status, client
- Project cards with progress indicators

**FR-PROJ-003**: Project Details
- Detailed project view
- Status tracking
- Budget and timeline information
- Related opportunities and pitches

**FR-PROJ-004**: Edit Project
- Update project information
- Change status
- Modify budget and timeline

**FR-PROJ-005**: Delete Project
- Remove project from system

---

### 4.10 Pitch Generation

#### 4.10.1 Pitch Creation
**FR-PITCH-001**: Generate Pitch
- AI-powered pitch generation
- Input parameters:
  - Client selection
  - Services to highlight
  - Tone (formal/casual)
  - Length (short/long)
  - Custom context
- Link to opportunity or project

**FR-PITCH-002**: Pitch Structure
- Generated pitches include:
  - Title
  - Opening hook
  - Problem framing
  - Proposed solution
  - Value outcomes
  - Why us section
  - Next step CTA
- Evidence-based content
- Confidence scoring

**FR-PITCH-003**: Pitch Variants
- Generate multiple variants (A/B testing)
- Compare different approaches
- Select best performing variant

**FR-PITCH-004**: View Pitches
- List of all generated pitches
- Filter by client, date, status
- Pitch history tracking

**FR-PITCH-005**: Edit Pitch
- Manual pitch editing
- Customize generated content
- Save modifications

**FR-PITCH-006**: Export Pitch
- Export as PDF
- Copy to clipboard
- Share functionality

---

### 4.11 Growth Opportunities

#### 4.11.1 Opportunity Identification
**FR-GROWTH-001**: View Growth Opportunities
- AI-identified growth opportunities
- Categorized by type and priority
- Client-specific recommendations

**FR-GROWTH-002**: Generate Growth Opportunities
- AI analysis of client data
- Identify expansion opportunities
- Suggest new service offerings
- Recommend upsell/cross-sell

---

### 4.12 Knowledge Base

#### 4.12.1 Company Profile Management
**FR-KB-001**: Company Profile Setup
- Multi-tab interface:
  - Overview: Company name, description, value proposition
  - Company: Basic information, industry, founded
  - Contact: Contact details
  - Social: Social media links
  - Services: Service catalog
  - Team: Team members
  - Blogs: Blog articles
  - Technology: Tech stack

**FR-KB-002**: AI-Powered Data Extraction
- Website URL input
- Automatic crawling and extraction
- AI analysis using GPT-4
- Structured data extraction:
  - Company information
  - Services and products
  - Blog articles
  - Technology stack
  - Leadership team

**FR-KB-003**: Manual Data Entry
- Edit any field manually
- Add services, team members, case studies
- Update company information

**FR-KB-004**: Generate AI Insights
- On-demand insights generation
- Executive summary
- KPIs and metrics
- Market positioning analysis
- Competitive analysis (if Perplexity configured)

**FR-KB-005**: Vector Embeddings
- Automatic embedding generation
- Semantic search capability
- Used for matching and recommendations

---

### 4.13 Data Integrations

#### 4.13.1 Fathom Integration
**FR-INTEG-001**: Fathom Connection
- OAuth authentication
- Connect Fathom account
- Sync meeting recordings
- Automatic transcript import

**FR-INTEG-002**: Fathom Sync
- Manual sync trigger
- Automatic periodic sync
- Sync status tracking
- Error handling

#### 4.13.2 Apollo Integration
**FR-INTEG-003**: Apollo Organization Fetch
- Fetch organization data
- Technology stack
- Funding information
- Employee metrics
- Industry data

**FR-INTEG-004**: Apollo People Fetch
- Fetch contacts from Apollo
- LinkedIn profile links
- Role information
- Decision maker identification

#### 4.13.3 Other Integrations (Planned)
- LinkedIn
- Twitter/X
- Salesforce
- HubSpot
- Gmail/Outlook
- Zoom/Teams
- Google Drive/SharePoint
- Crunchbase
- Clutch

---

### 4.14 Dashboard & Analytics

#### 4.14.1 Dashboard Overview
**FR-DASH-001**: Main Dashboard
- Key performance indicators:
  - Total clients
  - Active projects
  - Total opportunities
  - Pipeline value
  - Total revenue
  - Conversion rate
  - Average deal size
- Recent activity feed
- Quick actions
- Charts and visualizations

**FR-DASH-002**: Client Metrics
- Client health scores
- Status distribution
- Tier breakdown
- Revenue trends

**FR-DASH-003**: Opportunity Pipeline
- Pipeline visualization
- Stage distribution
- Value by stage
- Win/loss analysis

---

### 4.15 Financial Tracking

#### 4.15.1 Financial Data
**FR-FIN-001**: Financial Overview
- MRR (Monthly Recurring Revenue)
- Total revenue
- Active deals count
- Latest deal information
- Revenue trends

**FR-FIN-002**: Financial Data Entry
- Manual financial data entry
- Update MRR and revenue
- Track deal values

---

## 5. Data Models

### 5.1 Core Entities

#### 5.1.1 Client
- id, name, company, email, phone, role, industry
- status (active, inactive, prospect)
- tier (platinum, gold, silver, bronze)
- location, founded, company_size
- persona_score, health_score
- tags, csm (customer success manager)
- apollo_data (JSONB)
- created_at, updated_at, user_id

#### 5.1.2 Contact
- id, client_id, name, email, phone
- role, department
- is_primary, is_decision_maker
- influence_level (high, medium, low)
- linkedin_url, source
- last_contact, created_at, user_id

#### 5.1.3 Persona
- id, client_id
- communication_style, decision_making_style
- priorities, pain_points, interests (arrays)
- preferred_channels (array)
- avg_response_time, preferred_time_of_day, best_day_of_week
- sentiment_overall, sentiment_score
- confidence, last_updated, created_at, user_id

#### 5.1.4 Persona Metrics
- id, client_id
- sentiment, cooperation, risk_level
- communication_style_value, communication_style_confidence
- response_speed_avg_days, response_speed_confidence
- negotiation_tone_value, negotiation_tone_confidence
- engagement_pattern_value, engagement_pattern_confidence
- top_project_types (array), sentiment_trend (array)
- created_at, user_id

#### 5.1.5 Document
- id, client_id, name, type, size, url
- summary, insights (array), tags (array)
- status (processing, completed, failed)
- source, uploaded_at, user_id

#### 5.1.6 Meeting Transcript
- id, client_id, title, meeting_date, duration
- transcript_text, sentiment
- action_items (array), speakers (JSONB)
- source, created_at, user_id

#### 5.1.7 Opportunity
- id, client_id, title, description, value
- stage (lead, qualified, proposal, negotiation, closed-won, closed-lost)
- probability, expected_close_date
- source, created_at, user_id

#### 5.1.8 Project
- id, client_id, name, description, status
- budget, timeline, due_date
- opportunity_id, created_at, user_id

#### 5.1.9 Generated Pitch
- id, client_id, client_name, client_company
- services (array), tone, length
- title, opening_hook, problem_framing
- proposed_solution, value_outcomes (array)
- why_us, next_step_cta
- confidence, evidence_tags (array), variant
- company_description, opportunity_id, project_id
- created_at, user_id

#### 5.1.10 Intelligence Query
- id, client_id, query, mode (quick, deep)
- response, key_findings (array)
- recommended_actions (JSONB)
- tokens_used, cost
- created_at, user_id

#### 5.1.11 Company Profile
- id, user_id
- company_name, website, industry, about
- value_proposition, founded
- contact_email, contact_phone, contact_address
- linkedin_url, twitter_url, instagram_url, facebook_url
- services (JSONB), team (JSONB), blogs (JSONB)
- technology_stack (JSONB), case_studies (JSONB)
- ai_insights (JSONB), executive_summary (text)
- onboarding_completed, created_at, updated_at

---

## 6. User Flows

### 6.1 New User Onboarding Flow
1. User signs up
2. Email verification
3. Onboarding wizard:
   - Step 1: Company website URL
   - Step 2: AI extraction process
   - Step 3: Review and edit extracted data
   - Step 4: Services setup
   - Step 5: Team information
4. First client creation wizard
5. Redirect to dashboard

### 6.2 Client Creation Flow
1. Navigate to "Add Client"
2. Enter basic information or provide website URL
3. AI pre-fill (optional)
4. Review and edit information
5. Add contacts
6. Upload documents (optional)
7. Save client
8. Redirect to client detail page

### 6.3 Intelligence Query Flow
1. Navigate to client detail page
2. Open "Intelligence Agent" tab
3. Enter natural language query
4. Select mode (quick/deep)
5. System processes query:
   - Semantic search across documents/transcripts
   - AI answer generation
   - Citation extraction
6. Display results with sources
7. Save query to history

### 6.4 Pitch Generation Flow
1. Navigate to Pitch Generator or Client Detail
2. Select client
3. Choose services to highlight
4. Set tone and length
5. Optionally link to opportunity/project
6. Generate pitch
7. Review generated pitch
8. Edit if needed
9. Save or export

### 6.5 Document Processing Flow
1. Upload document to client
2. System extracts text
3. AI generates summary and insights
4. Vector embeddings created
5. Document available for search
6. Status updated to "completed"

### 6.6 Fathom Sync Flow
1. Navigate to client detail > Assets > Fathom
2. Click "Connect Fathom"
3. OAuth authentication
4. Authorize access
5. Return to application
6. Sync recordings
7. Transcripts imported and processed
8. Available in Intelligence Agent

---

## 7. Technical Requirements

### 7.1 Performance Requirements
- Page load time: < 2 seconds
- Query response time: < 5 seconds (quick mode), < 30 seconds (deep mode)
- Document processing: < 60 seconds per document
- Real-time updates for sync operations

### 7.2 Scalability Requirements
- Support 1000+ clients per user
- Handle 10,000+ documents
- Process 100+ concurrent users
- Vector search performance optimization

### 7.3 Security Requirements
- Row Level Security (RLS) on all tables
- Authentication required for all operations
- API key encryption
- Secure OAuth flows
- Data isolation between users

### 7.4 Integration Requirements
- RESTful API design
- OAuth 2.0 support
- Webhook support (future)
- Rate limiting
- Error handling and retries

---

## 8. Non-Functional Requirements

### 8.1 Usability
- Intuitive user interface
- Responsive design (mobile, tablet, desktop)
- Accessible design (WCAG 2.1 AA)
- Clear error messages
- Help tooltips and documentation

### 8.2 Reliability
- 99.9% uptime target
- Data backup and recovery
- Transaction integrity
- Error logging and monitoring

### 8.3 Maintainability
- Modular code structure
- Comprehensive documentation
- Version control
- Testing framework

### 8.4 Compliance
- GDPR compliance
- Data privacy protection
- User data export capability
- Data deletion on request

---

## 9. Future Enhancements (Out of Scope)

- Multi-user collaboration
- Advanced analytics and reporting
- Custom workflows
- Mobile applications
- Additional integrations
- Advanced AI models
- Real-time notifications
- Email integration
- Calendar integration

---

## 10. Glossary

- **Persona**: AI-generated profile of a client's communication style, preferences, and behavior patterns
- **Intelligence Agent**: AI-powered Q&A system that answers questions about clients using all available data
- **Vector Embedding**: Numerical representation of text for semantic search
- **RLS**: Row Level Security - database-level access control
- **MRR**: Monthly Recurring Revenue
- **CSM**: Customer Success Manager
- **Fathom**: Meeting recording and transcription service
- **Apollo**: B2B contact and company data platform

---

## 11. Appendices

### 11.1 API Endpoints
- All Supabase Edge Functions are documented in `supabase/functions/`
- Authentication: Supabase Auth
- Database: Supabase PostgreSQL

### 11.2 Database Schema
- Complete schema defined in `supabase/migrations/`
- 20+ tables with relationships
- RLS policies for security

### 11.3 File Structure
- Frontend: `src/` directory
- Backend: `supabase/functions/` directory
- Migrations: `supabase/migrations/` directory
- Documentation: `docs/` directory

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Author**: PersonaPro Development Team

