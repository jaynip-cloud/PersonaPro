# Generate Client FAQs - Intelligence Analyzer

This Edge Function analyzes meeting transcripts and client data to generate predefined Frequently Asked Questions (FAQs) about a client.

## Overview

The intelligence analyzer reads meeting transcripts, client profile data, documents, and call records to answer 12 predefined FAQ questions about the client. Each answer includes:

- Comprehensive answer based on available data
- Evidence citations from transcripts and documents
- Confidence level (high/medium/low)
- Source quotes and dates
- Clarification needs if information is missing

## Predefined FAQ Questions

1. **Pain Points & Challenges**: What are the client's main pain points and challenges?
2. **Goals & Objectives**: What are the client's short-term and long-term goals?
3. **Communication**: What is the client's communication style and preferences?
4. **Decision Making**: What is the client's decision-making process and timeline?
5. **Budget & Financial**: What is the client's budget range and spending capacity?
6. **Priorities**: What are the client's key priorities and focus areas?
7. **Relationship Health**: What is the overall sentiment and relationship health?
8. **Expectations**: What are the client's expectations from our partnership?
9. **Action Items**: What action items or next steps were discussed?
10. **Risk Assessment**: What are potential risks or concerns with this client?
11. **Opportunities**: What upsell or cross-sell opportunities exist?
12. **Market Context**: What is the client's industry position and market context?

## API Usage

### Request

```typescript
POST /functions/v1/generate-client-faqs
Authorization: Bearer <supabase_token>
Content-Type: application/json

{
  "clientId": "uuid-of-client"
}
```

### Response

```typescript
{
  "success": true,
  "faqs": [
    {
      "question": "What are the client's main pain points and challenges?",
      "category": "Pain Points & Challenges",
      "answer": "Based on meeting transcripts, the client's main pain points include...",
      "evidence": [
        {
          "source": "meeting_transcript",
          "sourceDetails": "Q4 Strategy Meeting",
          "date": "2024-11-15",
          "quote": "We're struggling with...",
          "relevance": "high"
        }
      ],
      "confidence": "high",
      "lastUpdated": "2024-11-15",
      "needsClarification": false,
      "clarificationNotes": ""
    }
  ],
  "summary": {
    "totalTranscripts": 5,
    "dateRange": "2024-09-01 to 2024-11-15",
    "keyThemes": ["Strategy", "Budget", "Timeline"],
    "dataQuality": "high",
    "coverage": "All categories well covered"
  },
  "recommendations": [
    "Schedule follow-up meeting to discuss budget constraints",
    "Provide case study addressing their main pain point"
  ],
  "metadata": {
    "clientId": "uuid",
    "transcriptsAnalyzed": 5,
    "documentsAnalyzed": 3,
    "callRecordsAnalyzed": 8,
    "generatedAt": "2024-11-15T10:30:00Z"
  }
}
```

## Prompt Structure

The prompt is designed to:

1. **Extract Evidence**: Cites specific information from meeting transcripts and client data
2. **Provide Context**: Includes relevant details, dates, and examples
3. **Be Specific**: Uses actual quotes, numbers, and concrete examples
4. **Identify Gaps**: States what is known and what needs clarification
5. **Prioritize Recent Data**: Gives more weight to recent meetings
6. **Synthesize Insights**: Combines information from multiple sources

## Data Sources

The function analyzes:

- **Client Profile**: Basic info, goals, expectations, pain points, budget
- **Meeting Transcripts**: Full transcript text, action items, sentiment, dates
- **Client Intelligence**: AI-generated insights (maturity, communication style, sentiment)
- **Documents**: Document summaries and insights
- **Call Records**: Call summaries, key points, sentiment

## Confidence Levels

- **High**: Multiple sources confirm, recent data, specific quotes available
- **Medium**: Some evidence, may be inferred from context
- **Low**: Limited evidence, older data, or requires inference

## Customization

To modify the predefined questions, edit the `predefinedQuestions` array in `index.ts`:

```typescript
const predefinedQuestions = [
  {
    question: "Your custom question here",
    category: "Your Category"
  },
  // Add more questions...
];
```

## Environment Variables

Required:
- `OPENAI_API_KEY`: OpenAI API key for GPT-4o
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key

## Error Handling

The function handles:
- Missing client data
- No meeting transcripts (returns FAQs with low confidence)
- Missing OpenAI API key
- Invalid client ID
- Unauthorized access

## Performance

- Processing time: ~10-30 seconds depending on transcript volume
- Token usage: ~2000-4000 tokens per request
- Model: GPT-4o (optimized for structured JSON output)

