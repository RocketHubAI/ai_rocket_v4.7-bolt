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
    const driveRedirectUri = Deno.env.get('GOOGLE_DRIVE_REDIRECT_URI');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!googleClientId || !googleClientSecret || !driveRedirectUri) {
      throw new Error('Missing Google OAuth configuration. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_DRIVE_REDIRECT_URI');
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
      console.log('[OAuth Exchange] User ID from JWT:', userId);
    } catch (e) {
      console.error('[OAuth Exchange] Failed to parse JWT:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    console.log('[OAuth Exchange] Admin API getUserById result:');
    console.log('[OAuth Exchange] - User ID queried:', userId);
    console.log('[OAuth Exchange] - User found:', !!user);
    console.log('[OAuth Exchange] - User email:', user?.email);
    console.log('[OAuth Exchange] - Error:', userError);

    if (userError || !user) {
      console.error('[OAuth Exchange] User verification failed:', userError);
      return new Response(
        JSON.stringify({
          error: 'User not found in database. Please ensure you have signed up with this email address first.',
          details: userError?.message
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: publicUserData, error: publicUserError } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', userId)
      .maybeSingle();

    const teamId = publicUserData?.team_id || null;
    console.log('[OAuth Exchange] Team ID from public.users table:', teamId);

    console.log('[OAuth Exchange] User verified:', user.email);

    const { code, redirect_uri, oauth_app_id } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const useAltCredentials = oauth_app_id === 'alternate' && googleClientIdAlt && googleClientSecretAlt;
    const activeClientId = useAltCredentials ? googleClientIdAlt : googleClientId;
    const activeClientSecret = useAltCredentials ? googleClientSecretAlt : googleClientSecret;
    const activeOAuthAppId = useAltCredentials ? 'alternate' : 'primary';

    const finalRedirectUri = redirect_uri || driveRedirectUri;

    console.log('[OAuth Exchange] Exchanging authorization code for tokens...');
    console.log('[OAuth Exchange] OAuth App ID:', activeOAuthAppId);
    console.log('[OAuth Exchange] Client ID:', activeClientId?.substring(0, 30) + '...');
    console.log('[OAuth Exchange] Using redirect URI:', finalRedirectUri);
    console.log('[OAuth Exchange] Env GOOGLE_DRIVE_REDIRECT_URI:', driveRedirectUri);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: activeClientId,
        client_secret: activeClientSecret,
        redirect_uri: finalRedirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[OAuth Exchange] Failed to get tokens from Google');
      console.error('[OAuth Exchange] Status:', tokenResponse.status);
      console.error('[OAuth Exchange] Error:', tokens.error);
      console.error('[OAuth Exchange] Error description:', tokens.error_description);
      console.error('[OAuth Exchange] Full response:', JSON.stringify(tokens));
      throw new Error(tokens.error_description || tokens.error || 'Failed to get tokens');
    }

    console.log('[OAuth Exchange] Tokens received successfully');

    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      }
    );

    if (!profileResponse.ok) {
      console.error('[OAuth Exchange] Failed to get user profile from Google');
      throw new Error('Failed to retrieve user profile from Google');
    }

    const profile = await profileResponse.json();

    console.log('[OAuth Exchange] Full profile response:', JSON.stringify(profile));

    if (!profile.email) {
      console.error('[OAuth Exchange] No email in profile response');
      throw new Error('Google account email not found in authorization response.');
    }

    console.log('[OAuth Exchange] Google account:', profile.email);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    console.log('[OAuth Exchange] Attempting to store Google Drive auth for user:', user.id);
    console.log('[OAuth Exchange] Email:', profile.email);
    console.log('[OAuth Exchange] Team ID:', teamId);
    console.log('[OAuth Exchange] Expires at:', expiresAt.toISOString());

    const cleanAccessToken = tokens.access_token?.replace?.(/[\r\n]/g, '') || tokens.access_token;
    const cleanRefreshToken = tokens.refresh_token?.replace?.(/[\r\n]/g, '') || tokens.refresh_token;

    const { data: existingConnection } = await supabase
      .from('user_drive_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const upsertData: Record<string, unknown> = {
      user_id: user.id,
      team_id: teamId || null,
      provider: 'google',
      access_token: cleanAccessToken,
      refresh_token: cleanRefreshToken,
      token_expires_at: expiresAt.toISOString(),
      google_account_email: profile.email,
      is_active: true,
      connection_status: 'connected',
      scope_version: 3,
      oauth_app_id: activeOAuthAppId,
    };

    if (!existingConnection) {
      console.log('[OAuth Exchange] New connection - using unified folder structure');
    } else {
      console.log('[OAuth Exchange] Re-authorization - preserving existing folder configurations');
    }

    const { data, error: dbError } = await supabase
      .from('user_drive_connections')
      .upsert(upsertData, {
        onConflict: 'user_id,provider'
      })
      .select();

    if (dbError) {
      console.error('[OAuth Exchange] Failed to store tokens');
      console.error('[OAuth Exchange] Error code:', dbError.code);
      console.error('[OAuth Exchange] Error message:', dbError.message);
      console.error('[OAuth Exchange] Error details:', dbError.details);
      console.error('[OAuth Exchange] Error hint:', dbError.hint);
      console.error('[OAuth Exchange] Full error:', JSON.stringify(dbError));
      throw new Error(`Failed to store Google Drive authentication: ${dbError.message}`);
    }

    console.log('[OAuth Exchange] Data returned:', data);
    console.log('[OAuth Exchange] Google Drive authentication stored successfully');

    return new Response(
      JSON.stringify({
        success: true,
        email: profile.email,
        connection_id: data[0]?.id
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('[OAuth Exchange] Error:', error);
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