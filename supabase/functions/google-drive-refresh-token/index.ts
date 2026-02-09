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
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const googleClientIdAlt = Deno.env.get('GOOGLE_CLIENT_ID_ALT');
    const googleClientSecretAlt = Deno.env.get('GOOGLE_CLIENT_SECRET_ALT');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Missing Google OAuth configuration');
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
    } catch (e) {
      console.error('Failed to parse JWT:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Google Refresh] Refreshing token for user:', user.id);

    const { data: driveConnection, error: fetchError } = await supabase
      .from('user_drive_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError || !driveConnection) {
      console.error('[Google Refresh] Connection not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Google Drive connection not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!driveConnection.refresh_token) {
      return new Response(
        JSON.stringify({ error: 'No refresh token available. Please reconnect your Google Drive account.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const useAltCredentials = driveConnection.oauth_app_id === 'alternate' && googleClientIdAlt && googleClientSecretAlt;
    const activeClientId = useAltCredentials ? googleClientIdAlt : googleClientId;
    const activeClientSecret = useAltCredentials ? googleClientSecretAlt : googleClientSecret;

    console.log('[Google Refresh] Requesting new access token...');
    console.log('[Google Refresh] Using OAuth App:', driveConnection.oauth_app_id || 'primary');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: activeClientId,
        client_secret: activeClientSecret,
        refresh_token: driveConnection.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[Google Refresh] Failed to refresh token:', tokens);

      if (tokens.error === 'invalid_grant') {
        await supabase
          .from('user_drive_connections')
          .update({
            is_active: false,
            connection_status: 'token_expired'
          })
          .eq('user_id', user.id)
          .eq('provider', 'google');

        throw new Error('Refresh token is invalid. Please reconnect your Google Drive account.');
      }

      throw new Error(tokens.error_description || 'Failed to refresh token');
    }

    console.log('[Google Refresh] Token refreshed successfully');

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const cleanAccessToken = tokens.access_token?.replace?.(/[\r\n]/g, '') || tokens.access_token;
    const cleanRefreshToken = tokens.refresh_token?.replace?.(/[\r\n]/g, '') || tokens.refresh_token;

    const updateData: Record<string, unknown> = {
      access_token: cleanAccessToken,
      token_expires_at: expiresAt.toISOString(),
      is_active: true,
      connection_status: 'connected'
    };

    if (cleanRefreshToken) {
      updateData.refresh_token = cleanRefreshToken;
    }

    const { error: updateError } = await supabase
      .from('user_drive_connections')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('provider', 'google');

    if (updateError) {
      console.error('[Google Refresh] Failed to update tokens:', updateError);
      throw new Error('Failed to update Google Drive authentication');
    }

    console.log('[Google Refresh] Tokens updated successfully');
    console.log('[Google Refresh] New expiration:', expiresAt.toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        access_token: cleanAccessToken,
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
    console.error('[Google Refresh] Error:', error);
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