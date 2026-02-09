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

    const getOAuthCredentials = (oauthAppId: string | null) => {
      if (oauthAppId === 'alternate' && googleClientIdAlt && googleClientSecretAlt) {
        return { clientId: googleClientIdAlt, clientSecret: googleClientSecretAlt };
      }
      return { clientId: googleClientId, clientSecret: googleClientSecret };
    };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Token Refresh] Starting automatic Google token refresh...');

    const refreshThreshold = new Date(Date.now() + 45 * 60 * 1000).toISOString();

    console.log('[Token Refresh] Checking Gmail tokens...');
    const { data: gmailAuths, error: gmailError } = await supabase
      .from('gmail_auth')
      .select('*')
      .eq('is_active', true)
      .lt('expires_at', refreshThreshold);

    if (gmailError) {
      console.error('[Token Refresh] Error fetching Gmail auths:', gmailError);
    } else {
      console.log(`[Token Refresh] Found ${gmailAuths?.length || 0} Gmail tokens to refresh`);

      for (const auth of gmailAuths || []) {
        try {
          console.log(`[Token Refresh] Refreshing Gmail token for user: ${auth.user_id}`);

          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: googleClientId,
              client_secret: googleClientSecret,
              refresh_token: auth.refresh_token,
              grant_type: 'refresh_token'
            })
          });

          const tokens = await tokenResponse.json();

          if (!tokenResponse.ok) {
            console.error(`[Token Refresh] Failed to refresh Gmail token for ${auth.user_id}:`, tokens);

            if (tokens.error === 'invalid_grant') {
              await supabase
                .from('gmail_auth')
                .update({ is_active: false })
                .eq('user_id', auth.user_id);
              console.log(`[Token Refresh] Marked Gmail auth as inactive for user: ${auth.user_id}`);
            }
            continue;
          }

          const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

          const updateData: Record<string, unknown> = {
            access_token: tokens.access_token,
            expires_at: expiresAt.toISOString(),
            is_active: true
          };

          if (tokens.refresh_token) {
            updateData.refresh_token = tokens.refresh_token;
          }

          await supabase
            .from('gmail_auth')
            .update(updateData)
            .eq('user_id', auth.user_id);

          console.log(`[Token Refresh] Gmail token refreshed for user: ${auth.user_id}`);
        } catch (err) {
          console.error(`[Token Refresh] Error refreshing Gmail token for ${auth.user_id}:`, err);
        }
      }
    }

    console.log('[Token Refresh] Checking Google Drive tokens...');
    const { data: driveConnections, error: driveError } = await supabase
      .from('user_drive_connections')
      .select('*')
      .eq('provider', 'google')
      .eq('is_active', true)
      .eq('connection_status', 'connected')
      .lt('token_expires_at', refreshThreshold);

    if (driveError) {
      console.error('[Token Refresh] Error fetching Drive connections:', driveError);
    } else {
      console.log(`[Token Refresh] Found ${driveConnections?.length || 0} Google Drive tokens to refresh`);

      for (const connection of driveConnections || []) {
        const previousExpiry = connection.token_expires_at;

        try {
          const { clientId, clientSecret } = getOAuthCredentials(connection.oauth_app_id);
          console.log(`[Token Refresh] Refreshing Drive token for user: ${connection.user_id} (OAuth app: ${connection.oauth_app_id || 'primary'})`);

          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: connection.refresh_token,
              grant_type: 'refresh_token'
            })
          });

          const tokens = await tokenResponse.json();

          if (!tokenResponse.ok) {
            console.error(`[Token Refresh] Failed to refresh Drive token for ${connection.user_id}:`, tokens);

            await supabase.from('token_refresh_logs').insert({
              user_id: connection.user_id,
              team_id: connection.team_id,
              service: 'google_drive',
              success: false,
              error_code: tokens.error || 'unknown',
              error_message: tokens.error_description || 'Token refresh failed',
              previous_expiry: previousExpiry
            });

            if (tokens.error === 'invalid_grant') {
              await supabase
                .from('user_drive_connections')
                .update({
                  is_active: false,
                  connection_status: 'token_expired'
                })
                .eq('id', connection.id);
              console.log(`[Token Refresh] Marked Drive connection as expired: ${connection.id}`);
            }
            continue;
          }

          const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

          const updateData: Record<string, unknown> = {
            access_token: tokens.access_token,
            token_expires_at: expiresAt.toISOString(),
            is_active: true,
            connection_status: 'connected'
          };

          if (tokens.refresh_token) {
            updateData.refresh_token = tokens.refresh_token;
          }

          await supabase
            .from('user_drive_connections')
            .update(updateData)
            .eq('id', connection.id);

          await supabase.from('token_refresh_logs').insert({
            user_id: connection.user_id,
            team_id: connection.team_id,
            service: 'google_drive',
            success: true,
            previous_expiry: previousExpiry,
            new_expiry: expiresAt.toISOString()
          });

          console.log(`[Token Refresh] Drive token refreshed for connection: ${connection.id}`);
        } catch (err) {
          console.error(`[Token Refresh] Error refreshing Drive token for ${connection.user_id}:`, err);

          await supabase.from('token_refresh_logs').insert({
            user_id: connection.user_id,
            team_id: connection.team_id,
            service: 'google_drive',
            success: false,
            error_code: 'exception',
            error_message: err instanceof Error ? err.message : 'Unknown error',
            previous_expiry: previousExpiry
          });
        }
      }
    }

    console.log('[Token Refresh] Checking Microsoft tokens...');
    const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const microsoftClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

    let microsoftTokensRefreshed = 0;

    if (microsoftClientId && microsoftClientSecret) {
      const { data: msConnections, error: msError } = await supabase
        .from('user_drive_connections')
        .select('*')
        .eq('provider', 'microsoft')
        .eq('is_active', true)
        .eq('connection_status', 'connected')
        .lt('token_expires_at', refreshThreshold);

      if (msError) {
        console.error('[Token Refresh] Error fetching Microsoft connections:', msError);
      } else {
        console.log(`[Token Refresh] Found ${msConnections?.length || 0} Microsoft tokens to refresh`);

        for (const connection of msConnections || []) {
          const previousExpiry = connection.token_expires_at;

          try {
            console.log(`[Token Refresh] Refreshing Microsoft token for team: ${connection.team_id}`);

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
              console.error(`[Token Refresh] Failed to refresh Microsoft token for ${connection.team_id}:`, tokens);

              await supabase.from('token_refresh_logs').insert({
                user_id: connection.user_id,
                team_id: connection.team_id,
                service: 'microsoft_drive',
                success: false,
                error_code: tokens.error || 'unknown',
                error_message: tokens.error_description || 'Token refresh failed',
                previous_expiry: previousExpiry
              });

              if (tokens.error === 'invalid_grant') {
                await supabase
                  .from('user_drive_connections')
                  .update({
                    connection_status: 'token_expired'
                  })
                  .eq('id', connection.id);
                console.log(`[Token Refresh] Marked Microsoft connection as expired: ${connection.id}`);
              }
              continue;
            }

            const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

            const cleanAccessToken = tokens.access_token?.replace?.(/[\r\n]/g, '') || tokens.access_token;
            const cleanRefreshToken = tokens.refresh_token?.replace?.(/[\r\n]/g, '') || tokens.refresh_token || connection.refresh_token;

            await supabase
              .from('user_drive_connections')
              .update({
                access_token: cleanAccessToken,
                refresh_token: cleanRefreshToken,
                token_expires_at: expiresAt.toISOString(),
                connection_status: 'connected',
                updated_at: new Date().toISOString()
              })
              .eq('id', connection.id);

            await supabase.from('token_refresh_logs').insert({
              user_id: connection.user_id,
              team_id: connection.team_id,
              service: 'microsoft_drive',
              success: true,
              previous_expiry: previousExpiry,
              new_expiry: expiresAt.toISOString()
            });

            microsoftTokensRefreshed++;
            console.log(`[Token Refresh] Microsoft token refreshed for connection: ${connection.id}`);
          } catch (err) {
            console.error(`[Token Refresh] Error refreshing Microsoft token for ${connection.team_id}:`, err);

            await supabase.from('token_refresh_logs').insert({
              user_id: connection.user_id,
              team_id: connection.team_id,
              service: 'microsoft_drive',
              success: false,
              error_code: 'exception',
              error_message: err instanceof Error ? err.message : 'Unknown error',
              previous_expiry: previousExpiry
            });
          }
        }
      }
    } else {
      console.log('[Token Refresh] Microsoft OAuth credentials not configured, skipping Microsoft token refresh');
    }

    const summary = {
      success: true,
      gmail_tokens_checked: gmailAuths?.length || 0,
      drive_tokens_checked: driveConnections?.length || 0,
      microsoft_tokens_refreshed: microsoftTokensRefreshed,
      timestamp: new Date().toISOString()
    };

    console.log('[Token Refresh] Complete:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('[Token Refresh] Error:', error);
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