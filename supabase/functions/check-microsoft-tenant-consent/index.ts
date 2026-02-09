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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing tenant_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('[Check Microsoft Tenant Consent] Checking consent for tenant:', tenant_id);

    const { data: consent, error } = await supabase
      .from('microsoft_tenant_consent')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[Check Microsoft Tenant Consent] Database error:', error);
      throw new Error(`Failed to check tenant consent: ${error.message}`);
    }

    const hasConsent = !!consent;
    console.log('[Check Microsoft Tenant Consent] Tenant has consent:', hasConsent);

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id,
        has_consent: hasConsent,
        granted_at: consent?.granted_at || null,
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
    console.error('[Check Microsoft Tenant Consent] Error:', error);
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
