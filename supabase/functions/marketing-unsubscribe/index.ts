import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = "https://airocket.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");
    const format = url.searchParams.get("format");

    const acceptHeader = req.headers.get("Accept") || "";
    const wantsJson = format === "json" || acceptHeader.includes("application/json");

    if (!token && !email) {
      return sendResponse("error", "Invalid Request", "No unsubscribe token or email provided.", wantsJson);
    }

    let contact: { id: string; email: string; first_name: string | null; unsubscribed: boolean } | null = null;
    let fetchError: any = null;

    if (token) {
      const result = await supabaseAdmin
        .from("marketing_contacts")
        .select("id, email, first_name, unsubscribed")
        .eq("unsubscribe_token", token)
        .maybeSingle();
      contact = result.data;
      fetchError = result.error;
    } else if (email) {
      const result = await supabaseAdmin
        .from("marketing_contacts")
        .select("id, email, first_name, unsubscribed")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      contact = result.data;
      fetchError = result.error;

      if (!contact && !fetchError) {
        return sendResponse(
          "info",
          "Not on Marketing List",
          `${email} is not on our marketing email list. You may be receiving emails as an active user of AI Rocket. To manage email notifications, please log in to your account and visit Settings.`,
          wantsJson
        );
      }
    }

    if (fetchError || !contact) {
      return sendResponse("error", "Not Found", "This unsubscribe link is invalid or has expired.", wantsJson);
    }

    if (contact.unsubscribed) {
      return sendResponse(
        "success",
        "Already Unsubscribed",
        `${contact.email} has already been unsubscribed from our marketing emails.`,
        wantsJson
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("marketing_contacts")
      .update({
        unsubscribed: true,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", contact.id);

    if (updateError) {
      console.error("Error updating unsubscribe status:", updateError);
      return sendResponse("error", "Error", "An error occurred while processing your request. Please try again.", wantsJson);
    }

    return sendResponse(
      "success",
      "Successfully Unsubscribed",
      `${contact.email} has been unsubscribed from AI Rocket marketing emails. You will no longer receive promotional emails from us.`,
      wantsJson
    );
  } catch (error) {
    console.error("Error in marketing-unsubscribe:", error);
    return sendResponse("error", "Error", "An unexpected error occurred. Please try again later.", false);
  }
});

function sendResponse(status: string, title: string, message: string, asJson: boolean): Response {
  if (asJson) {
    return new Response(
      JSON.stringify({ status, title, message, success: status === "success" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  const params = new URLSearchParams({ status, title, message });
  return new Response(null, {
    status: 302,
    headers: {
      "Location": `${APP_URL}/unsubscribe-result?${params.toString()}`,
      ...corsHeaders,
    },
  });
}
