# Gemini Model Standard

## Critical: Standard Model Configuration

**ALL Gemini API calls in this application MUST use the following models:**

| Purpose | Model Name |
|---------|------------|
| **Text/Analysis** | `gemini-3-flash-preview` |
| **Image Generation** | `gemini-3-pro-image-preview` |

This is a non-negotiable standard unless explicitly changed by project leadership.

## Model Details

### Gemini Flash (Text/Analysis)
- **Model:** `gemini-3-flash-preview`
- **Use for:** All text generation, analysis, chat responses, summaries, JSON generation
- **API Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`

### Gemini Pro Image (Image Generation)
- **Model:** `gemini-3-pro-image-preview`
- **Use for:** All image generation (infographics, visualizations, charts as images)
- **API Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
- **Config:** Use `responseModalities: ['TEXT', 'IMAGE']` in generationConfig

## Where This Applies

### Text/Analysis Model (`gemini-3-flash-preview`):
1. **Ask Astra** - Main chat interactions
2. **Team Chat Summaries** - Activity summarization
3. **Help Assistant** - User support interactions
4. **Metrics Assistant** - User metrics analysis and insights
5. **Team Pulse Analysis** - Health score and insights generation
6. **Any text-based AI features**

### Image Generation Model (`gemini-3-pro-image-preview`):
1. **Team Pulse Infographic** - Weekly snapshot image generation
2. **Any future image generation features**

### Special Cases:
- **Visualizations (HTML)** - Uses text model to generate HTML/SVG visualizations
- **Reports** - Calls n8n webhook workflow (configured separately)

## Implementation Patterns

### Text/Analysis (Client-side with SDK):
```typescript
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',  // ALWAYS USE THIS FOR TEXT
  generationConfig: {
    temperature: 1.0,
    topK: 64,
    topP: 0.95,
    maxOutputTokens: 100000,
  }
});
```

### Text/Analysis (Edge Function with fetch):
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096
      }
    })
  }
);
```

### Image Generation (Edge Function):
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    })
  }
);

// Extract image from response
const imagePart = result.candidates?.[0]?.content?.parts?.find(
  (part: any) => part.inlineData?.mimeType?.startsWith('image/')
);
const base64Image = imagePart?.inlineData?.data;
```

## DO NOT Use

- `gemini-flash-latest` - Deprecated alias
- `gemini-2.0-flash` - Old version
- `gemini-2.0-flash-exp` - Experimental, not for production
- `gemini-2.0-flash-exp-image-generation` - Deprecated
- `gemini-1.5-flash` - Old version
- `gemini-pro` - Different model, use `gemini-3-pro-image-preview` only for images
- Any other model names unless explicitly approved

## Files Using Gemini

Current files that must maintain this standard:

### Client-side (Text Model):
- `src/hooks/useVisualization.ts` - Visualization generation
- `src/components/GroupChat.tsx` - Team chat summaries
- `src/lib/help-assistant.ts` - Help/support features
- `src/lib/metrics-assistant.ts` - Metrics analysis and insights

### Edge Functions:
- `supabase/functions/generate-team-pulse/index.ts` - Uses BOTH models:
  - Text analysis: `gemini-3-flash-preview`
  - Image generation: `gemini-3-pro-image-preview`
- `supabase/functions/generate-report-visualization/index.ts` - Uses text model:
  - HTML visualization: `gemini-3-flash-preview`

## Verification Checklist

When reviewing code or adding new AI features:

- [ ] Text features use `gemini-3-flash-preview`
- [ ] Image generation uses `gemini-3-pro-image-preview`
- [ ] No hardcoded old version numbers
- [ ] Update this document if new files are added

## Exception Process

If a different model is required:

1. Must be explicitly approved by Clay (clay@rockethub.ai)
2. Document the reason in code comments
3. Update this file with the exception and rationale
4. Use feature flags if testing alternative models

---

**Last Updated:** January 12, 2026
**Text Model Standard:** `gemini-3-flash-preview`
**Image Model Standard:** `gemini-3-pro-image-preview`
**Status:** ACTIVE - All features must comply
