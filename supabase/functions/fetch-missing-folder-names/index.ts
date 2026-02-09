import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * DEPRECATED: This function is no longer needed.
 * The legacy folder columns (strategy_folder_id, meetings_folder_id, financial_folder_id)
 * have been removed from the database in favor of the unified folder structure.
 *
 * The new structure uses:
 * - root_folder_id for the first connected folder (index 0)
 * - folder_1 through folder_19 for additional folders (up to 20 total)
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    success: true,
    message: "This function is deprecated. Legacy folder columns have been removed.",
    updated: 0
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});