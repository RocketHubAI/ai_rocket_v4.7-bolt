import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TelegramRequest {
  user_id: string;
  chat_id: string;
  message: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  event_type?: string;
  event_id?: string;
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
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!telegramBotToken) {
      throw new Error("Missing Telegram configuration. Please set TELEGRAM_BOT_TOKEN secret.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, chat_id, message, parse_mode, event_type, event_id }: TelegramRequest = await req.json();

    if (!user_id || !chat_id || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, chat_id, message" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    const telegramPayload: Record<string, string> = {
      chat_id: chat_id,
      text: message,
    };

    if (parse_mode) {
      telegramPayload.parse_mode = parse_mode;
    }

    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(telegramPayload),
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error("Telegram error:", telegramResult);

      if (event_id) {
        await supabase
          .from("assistant_proactive_events")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            error_message: telegramResult.description || "Telegram send failed",
            provider_response: telegramResult,
          })
          .eq("id", event_id);
      }

      return new Response(
        JSON.stringify({
          error: "Failed to send Telegram message",
          details: telegramResult.description || "Unknown error"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (event_id) {
      await supabase
        .from("assistant_proactive_events")
        .update({
          status: "delivered",
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          provider_message_id: telegramResult.result?.message_id?.toString(),
          provider_response: telegramResult,
        })
        .eq("id", event_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: telegramResult.result?.message_id,
        chat_id: telegramResult.result?.chat?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-telegram-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});