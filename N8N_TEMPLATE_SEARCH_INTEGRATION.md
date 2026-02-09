# N8N Template Search Integration Guide

## Overview

This guide explains how to integrate template search functionality into your n8n Astra Intelligence Agent workflow, enabling users to discover and import n8n templates through conversational AI.

---

## What Was Built

### Frontend Components

1. **Template Search Service** (`src/lib/template-search-service.ts`)
   - Interfaces with n8n's public template API
   - Detects template-related queries
   - Provides search suggestions

2. **TemplateSearchResults Component** (`src/components/TemplateSearchResults.tsx`)
   - Displays template cards in chat
   - One-click import functionality
   - Links to n8n.io for details

3. **Updated MessageBubble** (`src/components/MessageBubble.tsx`)
   - Renders template results when `metadata.action_type === 'template_search'`
   - Passes import handler to TemplateSearchResults

4. **Enhanced useChat Hook** (`src/hooks/useChat.ts`)
   - `handleTemplateImportFromChat` function
   - Creates workflows from templates
   - Shows loading and success states

---

## How It Works

### User Flow

1. User asks: "Find me Slack notification templates"
2. Frontend sends message to n8n webhook
3. N8n workflow detects template intent
4. N8n calls template API and returns results
5. Frontend renders template cards in chat
6. User clicks "Import" button
7. Template imported to their workspace
8. Success message shown in chat

### Message Format

When Astra detects a template search query, it should respond with:

```json
{
  "response": "I found 12 templates for Slack notifications. Here are the top results:",
  "metadata": {
    "action_type": "template_search",
    "templates": [
      {
        "id": 123,
        "name": "Send Slack Notifications on Schedule",
        "description": "Automatically send notifications to Slack channels...",
        "views": 1500,
        "nodes": [
          { "displayName": "Schedule Trigger" },
          { "displayName": "HTTP Request" },
          { "displayName": "Slack" }
        ],
        "categories": [
          { "id": 1, "name": "Marketing" }
        ],
        "user": { "username": "n8n-team" },
        "workflow": {
          "nodes": [...],
          "connections": {...}
        }
      }
    ],
    "search_query": "slack notifications",
    "total_results": 12
  }
}
```

---

## N8N Workflow Integration

### Step 1: Add Template Detection Tool

Add a function/tool to your n8n Intelligence Agent workflow to detect template queries:

**Tool Name:** `detect_template_intent`

**Input:** User message text

**Logic:**
```javascript
function detectTemplateIntent(message) {
  const lowerMessage = message.toLowerCase();

  const templateKeywords = [
    'find template',
    'show template',
    'search template',
    'workflow for',
    'automation for',
    'templates for',
    'find workflow',
    'show workflow'
  ];

  const isTemplateQuery = templateKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  );

  return {
    isTemplateQuery,
    searchQuery: extractSearchQuery(message)
  };
}
```

### Step 2: Create Template Search Function

Add an HTTP Request node that calls n8n's template API:

**Node Configuration:**
- **Type:** HTTP Request
- **Method:** GET
- **URL:** `https://api.n8n.io/templates/search`
- **Query Parameters:**
  - `search`: `{{ $json.searchQuery }}`
  - `limit`: 6 (default for chat display)
  - `categories`: (optional, if detected)

**Headers:** None required (public API)

### Step 3: Format Response

Add a Code node to format the API response:

```javascript
// Get template search results
const templateResults = $input.all();

if (!templateResults || templateResults.length === 0 || !templateResults[0].json.workflows) {
  return [{
    json: {
      response: "I couldn't find any templates matching your search. Try browsing all templates or refine your search.",
      metadata: {
        action_type: 'template_search',
        templates: [],
        total_results: 0
      }
    }
  }];
}

const data = templateResults[0].json;
const templates = data.workflows || [];
const totalResults = data.totalWorkflows || 0;

// Format response
return [{
  json: {
    response: `I found ${totalResults} template${totalResults === 1 ? '' : 's'} for your search. Here are the top results:`,
    metadata: {
      action_type: 'template_search',
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        views: t.views || 0,
        nodes: (t.nodes || []).map(n => ({ displayName: n.displayName || n.name })),
        categories: t.categories || [],
        user: { username: t.user?.username || 'Unknown' },
        workflow: {
          nodes: t.workflow?.nodes || [],
          connections: t.workflow?.connections || {}
        }
      })),
      search_query: $('detect_template_intent').item.json.searchQuery,
      total_results: totalResults
    }
  }
}];
```

### Step 4: Add to Agent Flow

Update your main AI Agent node to:

1. **Check for template intent** before calling LLM
2. **If template query detected:**
   - Call template search function
   - Return formatted results
   - Skip LLM call
3. **If not template query:**
   - Proceed with normal AI flow

**Example Flow Structure:**
```
Webhook Trigger
    ↓
Check Template Intent (Code node)
    ↓
    ├─── Template Query → Search Templates → Format Results → Return
    └─── Regular Query → AI Agent → Return
```

---

## Template Keywords Reference

### Keywords That Trigger Template Search

- "find template(s)"
- "show template(s)"
- "search template(s)"
- "workflow for..."
- "automation for..."
- "templates for..."
- "find workflow(s)"
- "show workflow(s)"
- "need a workflow"
- "looking for workflow"
- "looking for template"

### Category Detection

The system automatically detects categories from keywords:

| Keywords | Category |
|----------|----------|
| ai, artificial intelligence, chatbot | AI |
| document, pdf, file | Document Ops |
| it ops, devops, monitoring | IT Ops |
| marketing, social media, content | Marketing |
| sales, crm, lead | Sales |
| support, customer service, help desk | Support |

---

## Testing the Integration

### Test Queries

1. **Basic Search:**
   - "Find Slack templates"
   - "Show me Gmail workflows"
   - "Search for AI chatbot templates"

2. **Category-Specific:**
   - "Templates for marketing automation"
   - "Workflows for CRM integration"
   - "Show me document processing templates"

3. **Edge Cases:**
   - "Find templates for xyz123" (no results)
   - "Show all templates" (large result set)
   - Just "templates" (generic query)

### Expected Behavior

✅ **Correct Response:**
- Astra message with template description
- 2-6 template cards displayed below message
- Each card shows: name, description, views, nodes, import button
- Import button shows loading state
- Success message after import

❌ **Error Handling:**
- No results: "I couldn't find any templates..."
- API error: Falls back to suggesting Browse Templates
- Import failure: Error message with retry option

---

## API Details

### N8N Template API

**Base URL:** `https://api.n8n.io/templates`

**Endpoints:**

1. **Search Templates**
   ```
   GET /search
   Query Parameters:
     - search: string (search query)
     - categories: string (category name)
     - limit: number (results per page, default: 20)
     - offset: number (pagination offset)
   ```

2. **Get Categories**
   ```
   GET /categories
   Returns: Array of category objects with subcategories
   ```

3. **Get Workflow by ID**
   ```
   GET /workflows/{id}
   Returns: Full workflow object with nodes and connections
   ```

**Rate Limits:** None documented (public API)

**Authentication:** None required

---

## Troubleshooting

### Templates Not Showing

**Check:**
1. Message has `metadata.action_type === 'template_search'`
2. `metadata.templates` array is populated
3. `onTemplateImport` prop is passed to MessageBubble
4. TemplateSearchResults component is imported

**Debug:**
```javascript
console.log('Message metadata:', message.metadata);
console.log('Templates:', message.metadata?.templates);
```

### Import Not Working

**Check:**
1. `handleTemplateImportFromChat` is exported from useChat
2. ChatContainer passes it to MessageBubble
3. Template has `workflow.nodes` and `workflow.connections`
4. N8N service is properly configured

**Debug:**
```javascript
console.log('Importing template:', template);
console.log('Workflow data:', template.workflow);
```

### API Errors

**Common Issues:**
- **CORS errors:** API should support CORS, but check browser console
- **Network timeout:** API might be slow, increase timeout
- **Malformed response:** Check API response structure

---

## Enhancement Ideas

### Future Features

1. **Smart Recommendations**
   - Astra suggests templates based on user's past queries
   - "Users who searched for X also liked Y"

2. **Template Customization**
   - Ask user questions before import
   - Pre-configure credentials and settings
   - "What channel should I send to?"

3. **Template Collections**
   - Curated template packs
   - "Starter Kit for Marketing Teams"
   - "Complete Sales Automation Suite"

4. **Learning Mode**
   - Astra explains what each node does
   - Educational walkthrough after import
   - Best practices guide

5. **Template Ratings**
   - Users can rate imported templates
   - Show community ratings in results
   - "Most popular this week"

---

## Best Practices

### For AI Responses

✅ **Do:**
- Mention the total number of results
- Highlight popular templates (high view count)
- Suggest refinements if too many/few results
- Provide context: "For Slack notifications..."

❌ **Don't:**
- Return templates for non-template queries
- Show more than 6 templates in initial response
- Make up template names or descriptions
- Include templates without complete workflow data

### For UX

✅ **Do:**
- Show import progress clearly
- Confirm successful import
- Offer to navigate to workflow
- Provide "Browse All" option

❌ **Don't:**
- Navigate away without asking
- Lose chat context after import
- Hide template source (always credit creator)
- Auto-import without user confirmation

---

## Integration Checklist

- [ ] Template detection added to n8n workflow
- [ ] HTTP Request node calls template API
- [ ] Response formatting returns correct metadata structure
- [ ] Frontend components deployed
- [ ] useChat hook exports template handler
- [ ] ChatContainer passes handler to MessageBubble
- [ ] MessageBubble renders TemplateSearchResults
- [ ] Tested basic template search
- [ ] Tested template import
- [ ] Tested error cases
- [ ] Documented for team

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify n8n workflow webhook URL is correct
3. Test template API directly: `https://api.n8n.io/templates/search?search=slack`
4. Review n8n execution logs for workflow errors
5. Confirm Supabase connection for workflow metadata

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0
