import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SMSRequest {
  user_id: string;
  phone_number: string;
  message: string;
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
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error("Missing Twilio configuration. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER secrets.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, phone_number, message, event_type, event_id }: SMSRequest = await req.json();

    if (!user_id || !phone_number || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, phone_number, message" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const formattedPhone = phone_number.startsWith("+") ? phone_number : `+${phone_number}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhoneNumber,
        Body: message,
      }),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);

      if (event_id) {
        await supabase
          .from("assistant_proactive_events")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            error_message: twilioResult.message || "SMS send failed",
            provider_response: twilioResult,
          })
          .eq("id", event_id);
      }

      return new Response(
        JSON.stringify({
          error: "Failed to send SMS",
          details: twilioResult.message || "Unknown error"
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
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: twilioResult.sid,
          provider_response: twilioResult,
        })
        .eq("id", event_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_sid: twilioResult.sid,
        status: twilioResult.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-sms-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});