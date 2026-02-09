import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-3-flash-preview";

interface WizardRequest {
  action:
    | "analyze_api"
    | "generate_endpoints"
    | "test_connection"
    | "submit_for_review"
    | "approve"
    | "reject";
  api_docs_url?: string;
  api_docs_text?: string;
  api_name?: string;
  base_url?: string;
  auth_type?: string;
  auth_config?: Record<string, string>;
  api_definition_id?: string;
  approval_notes?: string;
  openapi_spec?: Record<string, unknown>;
}

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function handleAnalyzeApi(
  docsUrl?: string,
  docsText?: string,
  openApiSpec?: Record<string, unknown>
) {
  let apiContext = "";

  if (openApiSpec) {
    apiContext = `OpenAPI/Swagger Specification:\n${JSON.stringify(openApiSpec, null, 2).slice(0, 15000)}`;
  } else if (docsText) {
    apiContext = `API Documentation Text:\n${docsText.slice(0, 15000)}`;
  } else if (docsUrl) {
    try {
      const response = await fetch(docsUrl, {
        headers: { Accept: "text/html, application/json" },
      });
      if (response.ok) {
        const text = await response.text();
        apiContext = `API Documentation from ${docsUrl}:\n${text.slice(0, 15000)}`;
      } else {
        apiContext = `Could not fetch docs from ${docsUrl}. User should paste the documentation text directly.`;
      }
    } catch {
      apiContext = `Could not fetch docs from ${docsUrl}. User should paste the documentation text directly.`;
    }
  }

  if (!apiContext) {
    throw new Error(
      "Provide api_docs_url, api_docs_text, or openapi_spec to analyze"
    );
  }

  const prompt = `You are an API integration expert. Analyze the following API documentation and extract key information for creating an integration.

${apiContext}

Return a JSON object with this exact structure (no markdown, just raw JSON):
{
  "api_name": "Human-readable API name",
  "description": "Brief description of what this API does",
  "base_url": "The base URL for API requests",
  "auth_type": "api_key|bearer_token|oauth2|basic_auth|none",
  "auth_instructions": "Step-by-step instructions for the user to get their API credentials",
  "category": "finance|crm|communication|project_management|transcription|analytics|marketing|ecommerce|custom",
  "rate_limit_rpm": 60,
  "suggested_endpoints": [
    {
      "endpoint_name": "snake_case_name",
      "display_name": "Human Readable Name",
      "description": "What this endpoint does",
      "http_method": "GET|POST|PUT|DELETE",
      "path": "/api/path/{param}",
      "is_read_only": true,
      "input_parameters": [
        {
          "name": "param_name",
          "type": "string|number|boolean",
          "required": true,
          "description": "What this parameter does"
        }
      ],
      "sample_response": {}
    }
  ]
}

Focus on read-only endpoints that would be most useful for an AI business assistant. Prioritize endpoints that retrieve data over those that modify data. Include at most 10 of the most useful endpoints.`;

  const geminiResponse = await callGemini(prompt);

  let analysis;
  try {
    const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch {
    return {
      raw_analysis: geminiResponse,
      parse_error:
        "Could not parse structured analysis. Review the raw analysis.",
    };
  }

  return { analysis };
}

async function handleGenerateEndpoints(
  supabase: any,
  userId: string,
  teamId: string,
  apiName: string,
  baseUrl: string,
  authType: string,
  authConfig: Record<string, string>,
  analysis: any
) {
  const apiSlug = apiName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: apiDef, error: defError } = await supabase
    .from("custom_api_definitions")
    .upsert(
      {
        team_id: teamId,
        created_by: userId,
        api_name: apiName,
        api_slug: apiSlug,
        base_url: baseUrl,
        description: analysis?.description || `Custom API: ${apiName}`,
        auth_type: authType || "api_key",
        auth_config: authConfig || {},
        category: analysis?.category || "custom",
        rate_limit_rpm: analysis?.rate_limit_rpm || 60,
        status: "draft",
        metadata: { analysis_source: "api_wizard", analyzed_at: new Date().toISOString() },
      },
      { onConflict: "team_id,api_slug" }
    )
    .select("id")
    .single();

  if (defError) throw new Error(`Failed to create API definition: ${defError.message}`);

  const endpoints = analysis?.suggested_endpoints || [];
  let created = 0;

  for (const ep of endpoints) {
    const inputSchema: Record<string, unknown> = {
      type: "object",
      properties: {},
      required: [] as string[],
    };

    for (const param of ep.input_parameters || []) {
      (inputSchema.properties as any)[param.name] = {
        type: param.type || "string",
        description: param.description,
      };
      if (param.required) {
        (inputSchema.required as string[]).push(param.name);
      }
    }

    const { error: epError } = await supabase
      .from("custom_api_endpoints")
      .upsert(
        {
          api_definition_id: apiDef.id,
          team_id: teamId,
          endpoint_name: ep.endpoint_name,
          display_name: ep.display_name,
          description: ep.description,
          http_method: ep.http_method || "GET",
          path: ep.path,
          input_schema: inputSchema,
          output_schema: ep.sample_response || {},
          is_read_only: ep.is_read_only !== false,
          is_enabled: true,
          ai_generated: true,
        },
        { onConflict: "api_definition_id,endpoint_name" }
      );

    if (!epError) created++;
  }

  return {
    api_definition_id: apiDef.id,
    api_slug: apiSlug,
    endpoints_created: created,
    total_suggested: endpoints.length,
  };
}

async function handleTestConnection(
  baseUrl: string,
  authType: string,
  authConfig: Record<string, string>
) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (authType === "api_key") {
    const headerName = authConfig?.header_name || "Authorization";
    const prefix = authConfig?.prefix || "Bearer";
    const key = authConfig?.api_key || authConfig?.key || "";
    headers[headerName] = `${prefix} ${key}`;
  } else if (authType === "bearer_token") {
    headers["Authorization"] = `Bearer ${authConfig?.token || ""}`;
  } else if (authType === "basic_auth") {
    const credentials = btoa(
      `${authConfig?.username || ""}:${authConfig?.password || ""}`
    );
    headers["Authorization"] = `Basic ${credentials}`;
  }

  try {
    const response = await fetch(baseUrl, {
      method: "GET",
      headers,
    });

    return {
      success: response.ok,
      status_code: response.status,
      status_text: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body_preview: (await response.text()).slice(0, 1000),
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function handleSubmitForReview(
  supabase: any,
  apiDefinitionId: string,
  teamId: string
) {
  const { data, error } = await supabase
    .from("custom_api_definitions")
    .update({
      status: "pending_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", apiDefinitionId)
    .eq("team_id", teamId)
    .select("id, api_name, status")
    .single();

  if (error) throw new Error(`Failed to submit for review: ${error.message}`);

  return { submitted: true, api_definition: data };
}

async function handleApprove(
  supabase: any,
  userId: string,
  apiDefinitionId: string,
  teamId: string,
  notes?: string
) {
  const { data, error } = await supabase
    .from("custom_api_definitions")
    .update({
      status: "active",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      approval_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", apiDefinitionId)
    .eq("team_id", teamId)
    .select("id, api_name, status")
    .single();

  if (error) throw new Error(`Failed to approve: ${error.message}`);

  return { approved: true, api_definition: data };
}

async function handleReject(
  supabase: any,
  userId: string,
  apiDefinitionId: string,
  teamId: string,
  notes?: string
) {
  const { data, error } = await supabase
    .from("custom_api_definitions")
    .update({
      status: "rejected",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      approval_notes: notes || "Rejected by admin",
      updated_at: new Date().toISOString(),
    })
    .eq("id", apiDefinitionId)
    .eq("team_id", teamId)
    .select("id, api_name, status")
    .single();

  if (error) throw new Error(`Failed to reject: ${error.message}`);

  return { rejected: true, api_definition: data };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createUserClient(authHeader);
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamId = user.user_metadata?.team_id;
    if (!teamId) {
      return new Response(
        JSON.stringify({ error: "No team associated with user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: WizardRequest = await req.json();
    const supabase = createServiceClient();
    let result: unknown;

    switch (body.action) {
      case "analyze_api":
        result = await handleAnalyzeApi(
          body.api_docs_url,
          body.api_docs_text,
          body.openapi_spec
        );
        break;

      case "generate_endpoints": {
        if (!body.api_name || !body.base_url) {
          throw new Error("api_name and base_url are required");
        }
        const analysisResult = await handleAnalyzeApi(
          body.api_docs_url,
          body.api_docs_text,
          body.openapi_spec
        );
        result = await handleGenerateEndpoints(
          supabase,
          user.id,
          teamId,
          body.api_name,
          body.base_url,
          body.auth_type || "api_key",
          body.auth_config || {},
          (analysisResult as any).analysis
        );
        break;
      }

      case "test_connection":
        if (!body.base_url) throw new Error("base_url is required");
        result = await handleTestConnection(
          body.base_url,
          body.auth_type || "none",
          body.auth_config || {}
        );
        break;

      case "submit_for_review":
        if (!body.api_definition_id) throw new Error("api_definition_id is required");
        result = await handleSubmitForReview(supabase, body.api_definition_id, teamId);
        break;

      case "approve": {
        const isAdmin = user.user_metadata?.role === "admin";
        if (!isAdmin) throw new Error("Only admins can approve API definitions");
        if (!body.api_definition_id) throw new Error("api_definition_id is required");
        result = await handleApprove(supabase, user.id, body.api_definition_id, teamId, body.approval_notes);
        break;
      }

      case "reject": {
        const isAdmin = user.user_metadata?.role === "admin";
        if (!isAdmin) throw new Error("Only admins can reject API definitions");
        if (!body.api_definition_id) throw new Error("api_definition_id is required");
        result = await handleReject(supabase, user.id, body.api_definition_id, teamId, body.approval_notes);
        break;
      }

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in api-wizard:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
