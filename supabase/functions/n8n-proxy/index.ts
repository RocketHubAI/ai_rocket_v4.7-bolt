import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const N8N_WEBHOOK_BASE = 'https://healthrocket.app.n8n.cloud/webhook';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requestBody: any = null;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      try {
        const text = await req.text();
        if (text) {
          requestBody = JSON.parse(text);
        }
      } catch (e) {
      }
    }

    if (requestBody?.webhook_path) {
      const webhookPath = requestBody.webhook_path;
      const webhookMethod = requestBody.method || 'POST';
      const webhookPayload = requestBody.payload;
      const queryParams = requestBody.query_params;

      console.log(`[n8n-proxy] Calling webhook: ${webhookPath} with method: ${webhookMethod}`);

      let webhookUrl = `${N8N_WEBHOOK_BASE}/${webhookPath}`;

      if (queryParams && webhookMethod === 'GET') {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(queryParams)) {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        }
        const queryString = params.toString();
        if (queryString) {
          webhookUrl += `?${queryString}`;
        }
      }

      const fetchOptions: RequestInit = {
        method: webhookMethod,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (webhookMethod !== 'GET' && webhookPayload) {
        fetchOptions.body = JSON.stringify(webhookPayload);
      }

      const webhookResponse = await fetch(webhookUrl, fetchOptions);

      const responseText = await webhookResponse.text();
      console.log(`[n8n-proxy] Webhook response: ${webhookResponse.status} - ${responseText}`);

      if (!webhookResponse.ok) {
        return new Response(
          JSON.stringify({ error: `Webhook error: ${webhookResponse.status}`, details: responseText }),
          { status: webhookResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { success: true, message: responseText || 'Webhook triggered' };
      }

      return new Response(
        JSON.stringify(responseData),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: accessRecord } = await supabase
      .from('n8n_user_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .maybeSingle();

    if (!accessRecord) {
      return new Response(
        JSON.stringify({ error: 'N8N access not enabled for this user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const n8nUrl = Deno.env.get('N8N_URL');
    const n8nApiKey = Deno.env.get('N8N_API_KEY');

    if (!n8nUrl || !n8nApiKey) {
      return new Response(
        JSON.stringify({ error: 'N8N not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const n8nPath = url.searchParams.get('path') || '/workflows';
    const n8nEndpoint = `${n8nUrl}/api/v1${n8nPath}`;

    const n8nResponse = await fetch(n8nEndpoint, {
      method: req.method,
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      return new Response(
        JSON.stringify({ error: `N8N API Error: ${n8nResponse.status} - ${errorText}` }),
        { status: n8nResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let n8nData;
    const responseText = await n8nResponse.text();
    if (responseText) {
      try {
        n8nData = JSON.parse(responseText);
      } catch (e) {
        n8nData = { success: true, message: 'Operation completed' };
      }
    } else {
      n8nData = { success: true, message: 'Operation completed' };
    }

    return new Response(
      JSON.stringify(n8nData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in n8n-proxy:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});