import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateMessageRequest {
  user_id: string;
  event_type: string;
  context: Record<string, unknown>;
  channel?: string;
}

const EVENT_TYPE_TEMPLATES: Record<string, { title: string; promptTemplate: string }> = {
  daily_summary: {
    title: "Your Daily Briefing",
    promptTemplate: `Generate a brief, friendly daily summary for a team member. Include:
- A warm greeting appropriate for the time of day
- Key highlights from team activity (if provided)
- Any important upcoming items
- An encouraging closing

Context: {context}

Keep it conversational, brief (2-3 short paragraphs), and actionable. Use a professional but friendly tone.`,
  },
  report_ready: {
    title: "Your Report is Ready",
    promptTemplate: `Generate a brief notification message that a report has been generated. Include:
- The report name/type
- A brief summary of what the report contains
- Encouragement to review it

Context: {context}

Keep it to 1-2 short paragraphs. Be informative and helpful.`,
  },
  goal_milestone: {
    title: "Goal Progress Update",
    promptTemplate: `Generate an encouraging message about goal progress. Include:
- The specific milestone or progress achieved
- Recognition of the accomplishment
- Motivation to continue

Context: {context}

Keep it celebratory but brief (1-2 paragraphs). Be genuinely encouraging.`,
  },
  meeting_reminder: {
    title: "Meeting Reminder",
    promptTemplate: `Generate a helpful meeting reminder message. Include:
- The meeting details (name, time if provided)
- Any relevant context or preparation suggestions
- A brief helpful note

Context: {context}

Keep it concise (1 paragraph) and practical.`,
  },
  action_item_due: {
    title: "Action Item Reminder",
    promptTemplate: `Generate a friendly reminder about an upcoming deadline or action item. Include:
- What's due and when
- A gentle nudge to complete it
- Offer of assistance if needed

Context: {context}

Keep it brief and non-pressuring but clear about the deadline.`,
  },
  team_mention: {
    title: "You Were Mentioned",
    promptTemplate: `Generate a brief notification that someone mentioned this user in team chat. Include:
- Who mentioned them (if provided)
- A brief context of what was discussed
- Encouragement to respond

Context: {context}

Keep it very brief (1 short paragraph) and informative.`,
  },
  insight_discovered: {
    title: "New Insight Discovered",
    promptTemplate: `Generate an intriguing message about an AI-discovered insight. Include:
- A teaser about what was found
- Why it might be interesting or valuable
- Invitation to explore more

Context: {context}

Keep it engaging and curiosity-provoking (1-2 paragraphs).`,
  },
  sync_complete: {
    title: "Document Sync Complete",
    promptTemplate: `Generate a brief notification that document sync has completed. Include:
- Summary of what was synced (number of files if provided)
- Any highlights or new content
- Brief next steps

Context: {context}

Keep it informative but brief (1 paragraph).`,
  },
  weekly_recap: {
    title: "Your Weekly Recap",
    promptTemplate: `Generate a comprehensive but concise weekly summary. Include:
- Key accomplishments and highlights
- Team activity summary
- Upcoming priorities for next week
- An encouraging note

Context: {context}

Keep it structured, scannable, and motivating (3-4 short paragraphs or bullet points).`,
  },
  custom: {
    title: "Message from Astra",
    promptTemplate: `Generate a helpful message based on the following context:

Context: {context}

Be clear, friendly, and helpful. Keep it appropriately brief based on the content.`,
  },
};

async function generateWithGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || "Unknown error"}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response text from Gemini");
  }

  return text.trim();
}

function formatForChannel(message: string, channel: string): string {
  switch (channel) {
    case "sms":
      return message.length > 160 ? message.substring(0, 157) + "..." : message;
    case "whatsapp":
      return message.replace(/\*\*(.*?)\*\*/g, "*$1*");
    case "telegram":
      return message.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    case "email":
    default:
      return message;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, event_type, context, channel = "email" }: GenerateMessageRequest = await req.json();

    if (!user_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, event_type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user_id)
      .maybeSingle();

    if (userError) {
      console.error("Error fetching user:", userError);
    }

    const userName = user?.name || "there";

    const template = EVENT_TYPE_TEMPLATES[event_type] || EVENT_TYPE_TEMPLATES.custom;

    const contextWithUser = {
      ...context,
      user_name: userName,
      event_type,
    };

    const prompt = template.promptTemplate.replace(
      "{context}",
      JSON.stringify(contextWithUser, null, 2)
    );

    const generatedMessage = await generateWithGemini(prompt, geminiApiKey);
    const formattedMessage = formatForChannel(generatedMessage, channel);

    return new Response(
      JSON.stringify({
        success: true,
        title: template.title,
        message: formattedMessage,
        original_message: generatedMessage,
        event_type,
        channel,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-proactive-message:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});