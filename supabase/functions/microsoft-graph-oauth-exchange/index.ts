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
      throw new Error('Missing Microsoft OAuth configuration. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET');
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
      console.log('[Microsoft OAuth Exchange] User ID from JWT:', userId);
    } catch (e) {
      console.error('[Microsoft OAuth Exchange] Failed to parse JWT:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    console.log('[Microsoft OAuth Exchange] User verification result:');
    console.log('[Microsoft OAuth Exchange] - User found:', !!user);
    console.log('[Microsoft OAuth Exchange] - User email:', user?.email);

    if (userError || !user) {
      console.error('[Microsoft OAuth Exchange] User verification failed:', userError);
      return new Response(
        JSON.stringify({
          error: 'User not found. Please ensure you have signed up first.',
          details: userError?.message
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: publicUserData } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', userId)
      .maybeSingle();

    const teamId = publicUserData?.team_id || null;
    console.log('[Microsoft OAuth Exchange] Team ID:', teamId);

    const { code, redirect_uri } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Microsoft OAuth Exchange] Exchanging code for tokens...');
    console.log('[Microsoft OAuth Exchange] Redirect URI:', redirect_uri);

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: microsoftClientId,
        client_secret: microsoftClientSecret,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[Microsoft OAuth Exchange] Failed to get tokens');
      console.error('[Microsoft OAuth Exchange] Status:', tokenResponse.status);
      console.error('[Microsoft OAuth Exchange] Error:', tokens.error);
      console.error('[Microsoft OAuth Exchange] Error description:', tokens.error_description);
      throw new Error(tokens.error_description || tokens.error || 'Failed to get tokens');
    }

    console.log('[Microsoft OAuth Exchange] Tokens received successfully');

    const profileResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      }
    );

    if (!profileResponse.ok) {
      console.error('[Microsoft OAuth Exchange] Failed to get user profile');
      throw new Error('Failed to retrieve user profile from Microsoft');
    }

    const profile = await profileResponse.json();
    console.log('[Microsoft OAuth Exchange] Profile:', profile.mail || profile.userPrincipalName);

    const microsoftEmail = profile.mail || profile.userPrincipalName;
    if (!microsoftEmail) {
      console.error('[Microsoft OAuth Exchange] No email in profile');
      throw new Error('Microsoft account email not found');
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    console.log('[Microsoft OAuth Exchange] Storing connection for user:', user.id);

    const cleanAccessToken = tokens.access_token?.replace?.(/[\r\n]/g, '') || tokens.access_token;
    const cleanRefreshToken = tokens.refresh_token?.replace?.(/[\r\n]/g, '') || tokens.refresh_token;

    const { data: existingConnection } = await supabase
      .from('user_drive_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'microsoft')
      .maybeSingle();

    const connectionData: Record<string, unknown> = {
      user_id: user.id,
      team_id: teamId || null,
      provider: 'microsoft',
      access_token: cleanAccessToken,
      refresh_token: cleanRefreshToken,
      token_expires_at: expiresAt.toISOString(),
      microsoft_account_email: microsoftEmail,
      is_active: true,
      connection_status: 'connected',
    };

    let data;
    let dbError;

    if (existingConnection) {
      console.log('[Microsoft OAuth Exchange] Updating existing connection');
      const result = await supabase
        .from('user_drive_connections')
        .update(connectionData)
        .eq('id', existingConnection.id)
        .select();
      data = result.data;
      dbError = result.error;
    } else {
      console.log('[Microsoft OAuth Exchange] Creating new connection');
      const result = await supabase
        .from('user_drive_connections')
        .insert(connectionData)
        .select();
      data = result.data;
      dbError = result.error;
    }

    if (dbError) {
      console.error('[Microsoft OAuth Exchange] Database error:', dbError);
      throw new Error(`Failed to store Microsoft authentication: ${dbError.message}`);
    }

    console.log('[Microsoft OAuth Exchange] Connection stored successfully');

    return new Response(
      JSON.stringify({
        success: true,
        email: microsoftEmail,
        connection_id: data?.[0]?.id
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('[Microsoft OAuth Exchange] Error:', error);
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