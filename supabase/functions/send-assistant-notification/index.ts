import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  user_id: string;
  event_type: string;
  message_title?: string;
  message_body: string;
  message_html?: string;
  priority?: number;
  force_send?: boolean;
  metadata?: Record<string, unknown>;
}

interface UserPreferences {
  user_id: string;
  proactive_enabled: boolean;
  proactive_level: string;
  email_enabled: boolean;
  email_address: string | null;
  sms_enabled: boolean;
  sms_phone_number: string | null;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  notification_types: Record<string, boolean>;
}

function isWithinQuietHours(preferences: UserPreferences): boolean {
  if (!preferences.quiet_hours_enabled) {
    return false;
  }

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: preferences.quiet_hours_timezone || "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const currentTimeStr = formatter.format(now);
    const [currentHour, currentMinute] = currentTimeStr.split(":").map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = preferences.quiet_hours_start.split(":").map(Number);
    const [endHour, endMinute] = preferences.quiet_hours_end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch (error) {
    console.error("Error checking quiet hours:", error);
    return false;
  }
}

async function sendEmailNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  email: string,
  title: string,
  body: string,
  html: string | null,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-personal-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        subject: title,
        body: body,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Email send failed" };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendSMSNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  phoneNumber: string,
  message: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        phone_number: phoneNumber,
        message: message,
        event_id: eventId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "SMS send failed" };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendWhatsAppNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  phoneNumber: string,
  message: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        phone_number: phoneNumber,
        message: message,
        event_id: eventId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "WhatsApp send failed" };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendTelegramNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  chatId: string,
  message: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        chat_id: chatId,
        message: message,
        event_id: eventId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Telegram send failed" };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function createInAppNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  title: string,
  body: string,
  eventType: string,
  metadata: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("astra_notifications").insert({
      user_id: userId,
      type: eventType === "team_mention" ? "mention" : eventType === "report_ready" ? "report" : "system",
      title: title,
      message: body,
      metadata: metadata,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      user_id,
      event_type,
      message_title,
      message_body,
      message_html,
      priority = 5,
      force_send = false,
      metadata = {},
    }: NotificationRequest = await req.json();

    if (!user_id || !event_type || !message_body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, event_type, message_body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: preferences, error: prefsError } = await supabase
      .from("user_assistant_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
      throw new Error("Failed to fetch user preferences");
    }

    if (!preferences) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "User has no notification preferences configured",
          channels_sent: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!preferences.proactive_enabled && !force_send) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Proactive notifications are disabled for this user",
          channels_sent: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const notificationTypes = preferences.notification_types as Record<string, boolean>;
    if (notificationTypes && notificationTypes[event_type] === false && !force_send) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `User has disabled ${event_type} notifications`,
          channels_sent: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (isWithinQuietHours(preferences) && !force_send && priority < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Currently within quiet hours",
          channels_sent: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, team_id")
      .eq("id", user_id)
      .maybeSingle();

    if (userError || !user) {
      throw new Error("Failed to fetch user data");
    }

    const title = message_title || "Astra Assistant";
    const results: Record<string, { success: boolean; error?: string; event_id?: string }> = {};

    if (preferences.email_enabled) {
      const emailAddress = preferences.email_address || user.email;
      if (emailAddress) {
        const { data: emailEvent } = await supabase
          .from("assistant_proactive_events")
          .insert({
            user_id,
            team_id: user.team_id,
            event_type,
            channel: "email",
            message_title: title,
            message_body,
            message_html,
            status: "sending",
            metadata,
          })
          .select()
          .single();

        const result = await sendEmailNotification(
          supabaseUrl,
          supabaseServiceKey,
          user_id,
          emailAddress,
          title,
          message_body,
          message_html || null,
          emailEvent?.id
        );

        if (emailEvent?.id) {
          await supabase
            .from("assistant_proactive_events")
            .update({
              status: result.success ? "sent" : "failed",
              sent_at: result.success ? new Date().toISOString() : null,
              failed_at: result.success ? null : new Date().toISOString(),
              error_message: result.error,
            })
            .eq("id", emailEvent.id);
        }

        results.email = { ...result, event_id: emailEvent?.id };
      }
    }

    if (preferences.sms_enabled && preferences.sms_phone_number) {
      const { data: smsEvent } = await supabase
        .from("assistant_proactive_events")
        .insert({
          user_id,
          team_id: user.team_id,
          event_type,
          channel: "sms",
          message_title: title,
          message_body,
          status: "sending",
          metadata,
        })
        .select()
        .single();

      const smsMessage = title ? `${title}\n\n${message_body}` : message_body;
      const result = await sendSMSNotification(
        supabaseUrl,
        supabaseServiceKey,
        user_id,
        preferences.sms_phone_number,
        smsMessage,
        smsEvent?.id
      );

      results.sms = { ...result, event_id: smsEvent?.id };
    }

    if (preferences.whatsapp_enabled && preferences.whatsapp_number) {
      const { data: whatsappEvent } = await supabase
        .from("assistant_proactive_events")
        .insert({
          user_id,
          team_id: user.team_id,
          event_type,
          channel: "whatsapp",
          message_title: title,
          message_body,
          status: "sending",
          metadata,
        })
        .select()
        .single();

      const whatsappMessage = title ? `*${title}*\n\n${message_body}` : message_body;
      const result = await sendWhatsAppNotification(
        supabaseUrl,
        supabaseServiceKey,
        user_id,
        preferences.whatsapp_number,
        whatsappMessage,
        whatsappEvent?.id
      );

      results.whatsapp = { ...result, event_id: whatsappEvent?.id };
    }

    if (preferences.telegram_enabled && preferences.telegram_chat_id) {
      const { data: telegramEvent } = await supabase
        .from("assistant_proactive_events")
        .insert({
          user_id,
          team_id: user.team_id,
          event_type,
          channel: "telegram",
          message_title: title,
          message_body,
          status: "sending",
          metadata,
        })
        .select()
        .single();

      const telegramMessage = title ? `<b>${title}</b>\n\n${message_body}` : message_body;
      const result = await sendTelegramNotification(
        supabaseUrl,
        supabaseServiceKey,
        user_id,
        preferences.telegram_chat_id,
        telegramMessage,
        telegramEvent?.id
      );

      results.telegram = { ...result, event_id: telegramEvent?.id };
    }

    const inAppResult = await createInAppNotification(
      supabase,
      user_id,
      title,
      message_body,
      event_type,
      metadata
    );
    results.in_app = inAppResult;

    const channelsSent = Object.entries(results)
      .filter(([_, result]) => result.success)
      .map(([channel]) => channel);

    const channelsFailed = Object.entries(results)
      .filter(([_, result]) => !result.success)
      .map(([channel, result]) => ({ channel, error: result.error }));

    return new Response(
      JSON.stringify({
        success: channelsSent.length > 0,
        channels_sent: channelsSent,
        channels_failed: channelsFailed,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-assistant-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});