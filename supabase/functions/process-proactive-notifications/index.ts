import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QueuedNotification {
  id: string;
  user_id: string;
  team_id: string | null;
  event_type: string;
  priority: number;
  context: Record<string, unknown>;
  scheduled_for: string;
}

interface UserPreferences {
  user_id: string;
  proactive_enabled: boolean;
  proactive_level: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  telegram_enabled: boolean;
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

async function generateMessage(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  eventType: string,
  context: Record<string, unknown>
): Promise<{ title: string; message: string } | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-proactive-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        event_type: eventType,
        context,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Message generation failed:", error);
      return null;
    }

    const result = await response.json();
    return {
      title: result.title,
      message: result.message,
    };
  } catch (error) {
    console.error("Error generating message:", error);
    return null;
  }
}

async function sendNotification(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  eventType: string,
  title: string,
  message: string,
  context: Record<string, unknown>
): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-assistant-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        event_type: eventType,
        message_title: title,
        message_body: message,
        metadata: context,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Notification send failed:", error);
      return false;
    }

    const result = await response.json();
    return result.success && result.channels_sent?.length > 0;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
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

    const now = new Date().toISOString();
    const { data: queuedItems, error: queueError } = await supabase
      .from("proactive_notification_queue")
      .select("*")
      .eq("is_processed", false)
      .lte("scheduled_for", now)
      .lte("process_after", now)
      .gt("expires_at", now)
      .order("priority", { ascending: false })
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (queueError) {
      console.error("Error fetching queue:", queueError);
      throw new Error("Failed to fetch notification queue");
    }

    if (!queuedItems || queuedItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending notifications to process",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userIds = [...new Set(queuedItems.map((item: QueuedNotification) => item.user_id))];
    const { data: preferencesData, error: prefsError } = await supabase
      .from("user_assistant_preferences")
      .select("*")
      .in("user_id", userIds);

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
    }

    const preferencesMap = new Map<string, UserPreferences>();
    (preferencesData || []).forEach((pref: UserPreferences) => {
      preferencesMap.set(pref.user_id, pref);
    });

    let processed = 0;
    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of queuedItems as QueuedNotification[]) {
      try {
        await supabase
          .from("proactive_notification_queue")
          .update({ processing_started_at: new Date().toISOString() })
          .eq("id", item.id);

        const preferences = preferencesMap.get(item.user_id);

        if (!preferences || !preferences.proactive_enabled) {
          await supabase
            .from("proactive_notification_queue")
            .update({ is_processed: true })
            .eq("id", item.id);
          skipped++;
          processed++;
          continue;
        }

        const notificationTypes = preferences.notification_types || {};
        if (notificationTypes[item.event_type] === false) {
          await supabase
            .from("proactive_notification_queue")
            .update({ is_processed: true })
            .eq("id", item.id);
          skipped++;
          processed++;
          continue;
        }

        if (isWithinQuietHours(preferences) && item.priority < 8) {
          continue;
        }

        let message = item.generated_message;
        let title = "Astra Assistant";

        if (!message) {
          const generated = await generateMessage(
            supabaseUrl,
            supabaseServiceKey,
            item.user_id,
            item.event_type,
            item.context
          );

          if (generated) {
            title = generated.title;
            message = generated.message;

            await supabase
              .from("proactive_notification_queue")
              .update({ generated_message: message })
              .eq("id", item.id);
          }
        }

        if (!message) {
          console.error(`Failed to generate message for queue item ${item.id}`);
          errors.push(`Failed to generate message for ${item.id}`);
          continue;
        }

        const success = await sendNotification(
          supabaseUrl,
          supabaseServiceKey,
          item.user_id,
          item.event_type,
          title,
          message,
          item.context
        );

        await supabase
          .from("proactive_notification_queue")
          .update({ is_processed: true })
          .eq("id", item.id);

        if (success) {
          sent++;
        }
        processed++;
      } catch (itemError) {
        console.error(`Error processing queue item ${item.id}:`, itemError);
        errors.push(`Error processing ${item.id}: ${itemError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} notifications`,
        processed,
        sent,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-proactive-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});