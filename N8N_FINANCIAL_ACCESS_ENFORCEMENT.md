# N8N Workflow: Financial Access Enforcement Guide

This guide explains how to update your N8N workflow to properly enforce financial access restrictions for users who don't have the `view_financial` permission.

## Overview

The hybrid approach to financial access control works as follows:

1. **UI Layer (Already Implemented)**
   - Detects financial keywords in user prompts
   - Shows warning banner when user lacks financial access
   - Blocks high-confidence financial questions before sending to webhook
   - Provides helpful message directing user to contact their admin

2. **Backend Layer (N8N Workflow - Your Responsibility)**
   - Receives `view_financial` flag in webhook payload
   - Filters financial documents from vector search/RAG context
   - Adds system instructions to prevent financial data disclosure
   - Returns appropriate response if financial data is requested

## Webhook Payload Structure

Your N8N webhook receives the following payload:

```json
{
  "chatInput": "user's message",
  "user_id": "uuid",
  "user_email": "user@example.com",
  "user_name": "Display Name",
  "conversation_id": "uuid or null",
  "team_id": "uuid",
  "team_name": "Team Name",
  "role": "admin|member",
  "view_financial": true|false,  // <-- KEY FIELD
  "mode": "private"
}
```

## Implementation Steps

### Step 1: Check the `view_financial` Flag

At the start of your workflow, extract and check the `view_financial` parameter:

```javascript
// In a Code node
const viewFinancial = $input.first().json.view_financial;
const hasFinancialAccess = viewFinancial !== false;

return {
  hasFinancialAccess,
  ...originalData
};
```

### Step 2: Filter Documents in Vector Search

When querying your vector database (Pinecone, Supabase, etc.), add a filter to exclude financial documents if the user lacks access:

**For Supabase Vector Search:**
```sql
-- Add this condition to your vector search query
WHERE
  team_id = $team_id
  AND (
    $has_financial_access = true
    OR category != 'financial'
  )
```

**For document_chunks queries:**
```javascript
// In a Code or Supabase node
const query = supabase
  .from('document_chunks')
  .select('*')
  .eq('team_id', teamId);

if (!hasFinancialAccess) {
  // Exclude financial documents from context
  query.neq('category', 'financial');
}
```

### Step 3: Add System Instructions for AI

When calling your LLM (GPT, Claude, etc.), prepend a system instruction when the user lacks financial access:

```javascript
// In a Code node before your LLM call
let systemPrompt = baseSystemPrompt;

if (!hasFinancialAccess) {
  systemPrompt += `

IMPORTANT FINANCIAL ACCESS RESTRICTION:
This user does NOT have permission to access financial data. You MUST:
1. NOT provide any financial information, even if you have it in your context
2. NOT reference financial documents, budgets, P&L statements, or revenue data
3. NOT discuss cash flow, expenses, profits, losses, or financial projections
4. Politely inform the user that they need financial access for such queries
5. Suggest they contact their team administrator for access

If the user asks about financial topics, respond with:
"I don't have access to financial data for your account. Please contact your team administrator to request financial access."
`;
}
```

### Step 4: Post-Response Validation (Optional but Recommended)

Add a validation step after the LLM response to ensure no financial data leaked:

```javascript
// In a Code node after LLM response
const response = $input.first().json.output;
const hasFinancialAccess = $input.first().json.hasFinancialAccess;

if (!hasFinancialAccess) {
  // Check for financial keywords that shouldn't be in response
  const financialPatterns = [
    /\$[\d,]+/,           // Dollar amounts
    /revenue|profit|loss/i,
    /budget|expense|cost/i,
    /financial\s+(data|report|statement)/i
  ];

  const containsFinancialData = financialPatterns.some(p => p.test(response));

  if (containsFinancialData) {
    console.warn('Warning: Response may contain financial data for restricted user');
    // Optionally sanitize or replace the response
  }
}
```

## Complete Workflow Example

Here's a simplified N8N workflow structure:

```
[Webhook Trigger]
       |
       v
[Code: Extract view_financial flag]
       |
       v
[IF: hasFinancialAccess?]
      / \
     /   \
    v     v
[Full   [Filtered
Query]  Query - exclude financial]
     \   /
      \ /
       v
[Code: Build System Prompt with restrictions if needed]
       |
       v
[LLM Call]
       |
       v
[Code: Validate response (optional)]
       |
       v
[Respond to Webhook]
```

## Database-Level Protection (Already Implemented)

Your Supabase database already has RLS policies that restrict financial documents:

```sql
-- From migration: 20251027100000_create_teams_and_update_user_metadata.sql
CREATE POLICY "Team members can view team financial documents"
  ON document_chunks_financial
  FOR SELECT
  TO authenticated
  USING (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid())
    AND (auth.jwt()->'user_metadata'->>'view_financial')::boolean = true
  );
```

However, your N8N workflow likely uses a service role key that bypasses RLS, so you MUST implement the filtering in your workflow logic.

## Testing Checklist

- [ ] User with `view_financial: false` cannot see financial data in responses
- [ ] Vector search excludes financial documents for restricted users
- [ ] AI system prompt includes financial restrictions
- [ ] Response validation catches any leaks (if implemented)
- [ ] Restricted user receives helpful message about requesting access

## Integration with UI

The UI and backend work together:

| Scenario | UI Behavior | Backend Behavior |
|----------|-------------|------------------|
| User types financial question, no access | Shows warning banner | Should never receive (blocked by UI) |
| Low-confidence financial question, no access | Shows no warning (passes through) | Filters financial docs, adds AI restrictions |
| Any question, has access | No warning | Full access to all documents |

The UI blocks high-confidence financial questions entirely, but the backend must still handle edge cases where:
- The question wasn't detected as financial by the UI
- The question was low-confidence (single keyword match)
- A malicious user bypasses the UI entirely

## Security Best Practices

1. **Defense in Depth**: Never rely solely on UI restrictions
2. **Service Role Caution**: Your N8N workflow bypasses RLS - enforce permissions explicitly
3. **Log Access Attempts**: Consider logging when restricted users attempt financial queries
4. **Regular Audits**: Periodically test the restrictions work correctly
5. **Fail Secure**: If uncertain about permissions, default to restricting access
