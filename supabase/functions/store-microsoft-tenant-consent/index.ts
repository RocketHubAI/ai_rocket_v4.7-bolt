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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const { tenant_id, admin_email, team_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing tenant_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Store Microsoft Tenant Consent] Storing consent for tenant:', tenant_id);
    console.log('[Store Microsoft Tenant Consent] Admin email:', admin_email);
    console.log('[Store Microsoft Tenant Consent] Team ID:', team_id);

    const { data: existingConsent } = await supabase
      .from('microsoft_tenant_consent')
      .select('*')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    let result;
    if (existingConsent) {
      console.log('[Store Microsoft Tenant Consent] Updating existing consent record');
      const updateResult = await supabase
        .from('microsoft_tenant_consent')
        .update({
          granted_at: new Date().toISOString(),
          granted_by_email: admin_email,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenant_id)
        .select();
      result = updateResult;
    } else {
      console.log('[Store Microsoft Tenant Consent] Creating new consent record');
      const insertResult = await supabase
        .from('microsoft_tenant_consent')
        .insert({
          tenant_id,
          team_id: team_id || null,
          granted_by_email: admin_email,
          is_active: true,
        })
        .select();
      result = insertResult;
    }

    if (result.error) {
      console.error('[Store Microsoft Tenant Consent] Database error:', result.error);
      throw new Error(`Failed to store tenant consent: ${result.error.message}`);
    }

    console.log('[Store Microsoft Tenant Consent] Consent stored successfully');

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id,
        message: 'Tenant consent recorded successfully'
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('[Store Microsoft Tenant Consent] Error:', error);
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
