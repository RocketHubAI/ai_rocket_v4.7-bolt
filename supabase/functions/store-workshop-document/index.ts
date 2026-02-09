import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

interface StoreDocumentPayload {
  teamId: string;
  userId: string;
  fileName: string;
  content: string;
  category?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log("[store-workshop-document] Starting request processing...");

    if (!GEMINI_API_KEY) {
      console.error("[store-workshop-document] GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing API key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[store-workshop-document] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("[store-workshop-document] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[store-workshop-document] User authenticated:", user.id);

    const payload = await req.json() as StoreDocumentPayload;
    console.log("[store-workshop-document] Payload received for team:", payload.teamId);

    if (!payload.teamId || !payload.userId || !payload.fileName || !payload.content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: teamId, userId, fileName, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userError || !userData || userData.team_id !== payload.teamId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - team mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const documentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const contentChunks = splitContentIntoChunks(payload.content, 2000);

    console.log(`[store-workshop-document] Generating embeddings for ${contentChunks.length} chunks...`);

    // Generate embeddings for each chunk
    const chunkRecords = [];
    for (let index = 0; index < contentChunks.length; index++) {
      const chunkContent = contentChunks[index];

      // Generate embedding using Gemini
      const embedding = await generateEmbedding(chunkContent);

      if (!embedding) {
        console.error(`[store-workshop-document] Failed to generate embedding for chunk ${index}`);
        return new Response(
          JSON.stringify({ error: "Failed to generate embeddings" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      chunkRecords.push({
        id: crypto.randomUUID(),
        team_id: payload.teamId,
        document_id: documentId,
        chunk_index: index,
        content: chunkContent,
        embedding: embedding,
        file_name: payload.fileName,
        doc_category: payload.category || "strategy",
        doc_type: "markdown",
        mime_type: "text/markdown",
        file_size: new TextEncoder().encode(payload.content).length,
        upload_source: "workshop_astra_created",
        uploaded_by: payload.userId,
        original_filename: payload.fileName,
        provider: "workshop",
        sync_status: "completed",
        classification_status: "completed",
        created_at: now,
        updated_at: now,
        last_synced_at: now,
        file_modified_at: now,
      });
    }

    console.log(`[store-workshop-document] Inserting ${chunkRecords.length} chunks with embeddings...`);

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords);

    if (insertError) {
      console.error("[store-workshop-document] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store document", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[store-workshop-document] Successfully stored ${chunkRecords.length} chunks with embeddings for document ${documentId}`);

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        fileName: payload.fileName,
        chunksCreated: chunkRecords.length,
        contentLength: payload.content.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[store-workshop-document] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: {
            parts: [{ text }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[store-workshop-document] Embedding API error:", errorText);
      return null;
    }

    const data = await response.json();
    return data.embedding?.values || null;
  } catch (error) {
    console.error("[store-workshop-document] Error generating embedding:", error);
    return null;
  }
}

function splitContentIntoChunks(content: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 <= maxChunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      if (paragraph.length <= maxChunkSize) {
        currentChunk = paragraph;
      } else {
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        currentChunk = "";
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
            currentChunk += (currentChunk ? " " : "") + sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          }
        }
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [content];
}
