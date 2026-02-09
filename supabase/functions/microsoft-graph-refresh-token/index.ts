import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const microsoftClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!microsoftClientId || !microsoftClientSecret) {
      throw new Error('Missing Microsoft OAuth configuration');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');

    let userId: string;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
      console.log('[Microsoft Token Refresh] User ID:', userId);
    } catch (e) {
      console.error('[Microsoft Token Refresh] Failed to parse JWT:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: connection, error: connError } = await supabase
      .from('user_drive_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'microsoft')
      .eq('is_active', true)
      .maybeSingle();

    if (connError || !connection) {
      console.error('[Microsoft Token Refresh] Connection not found:', connError);
      return new Response(
        JSON.stringify({ error: 'Microsoft connection not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!connection.refresh_token) {
      console.error('[Microsoft Token Refresh] No refresh token available');
      return new Response(
        JSON.stringify({ error: 'No refresh token available. Please reconnect.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Microsoft Token Refresh] Refreshing token...');

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: microsoftClientId,
        client_secret: microsoftClientSecret,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[Microsoft Token Refresh] Failed:', tokens.error);
      console.error('[Microsoft Token Refresh] Description:', tokens.error_description);

      await supabase
        .from('user_drive_connections')
        .update({ connection_status: 'token_expired' })
        .eq('id', connection.id);

      throw new Error(tokens.error_description || 'Failed to refresh token');
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const cleanAccessToken = tokens.access_token?.replace?.(/[\r\n]/g, '') || tokens.access_token;
    const cleanRefreshToken = tokens.refresh_token?.replace?.(/[\r\n]/g, '') || tokens.refresh_token || connection.refresh_token;

    const { error: updateError } = await supabase
      .from('user_drive_connections')
      .update({
        access_token: cleanAccessToken,
        refresh_token: cleanRefreshToken,
        token_expires_at: expiresAt.toISOString(),
        connection_status: 'connected',
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('[Microsoft Token Refresh] Update failed:', updateError);
      throw new Error('Failed to update tokens');
    }

    console.log('[Microsoft Token Refresh] Success, expires at:', expiresAt.toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        expires_at: expiresAt.toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('[Microsoft Token Refresh] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});