import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

interface ProcessRequest {
  uploadId: string;
  storagePath: string;
  filename: string;
  mimeType: string;
  teamId: string;
  userId: string;
  category?: string;
}

interface ChunkData {
  chunk_index: number;
  content: string;
  chunk_start: number;
  chunk_end: number;
}

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

function chunkDocument(content: string): ChunkData[] {
  const chunks: ChunkData[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < content.length) {
    let endIndex = startIndex + CHUNK_SIZE;

    if (endIndex < content.length) {
      const lastPeriod = content.lastIndexOf('.', endIndex);
      const lastNewline = content.lastIndexOf('\n', endIndex);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > startIndex + CHUNK_SIZE / 2) {
        endIndex = breakPoint + 1;
      }
    }

    const chunkContent = content.substring(startIndex, endIndex).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        chunk_index: chunkIndex,
        content: chunkContent,
        chunk_start: startIndex,
        chunk_end: endIndex,
      });
      chunkIndex++;
    }

    startIndex = endIndex - CHUNK_OVERLAP;
  }

  return chunks;
}

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdfParse = await import("npm:pdf-parse@1.1.1");
    const data = await pdfParse.default(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Unable to extract text from PDF. File may be corrupted or password-protected.");
  }
}

async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import("npm:mammoth@1.6.0");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error("Unable to extract text from Word document. File may be corrupted or password-protected.");
  }
}

async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const embeddings: number[][] = [];
  const batchSize = 100;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: batch,
          }),
        });

        if (response.status === 429) {
          console.log(`Rate limited, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          retries--;
          continue;
        }

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${error}`);
        }

        const data = await response.json();
        embeddings.push(...data.data.map((item: any) => item.embedding));
        break;
      } catch (error) {
        if (retries === 1) throw error;
        console.error(`Embedding generation error, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        retries--;
      }
    }
  }

  return embeddings;
}

Deno.serve(async (req: Request) => {
  console.log("Process PDF/DOCX function called, method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData = await req.json() as ProcessRequest;
    console.log("Processing request:", {
      filename: requestData.filename,
      mimeType: requestData.mimeType,
      teamId: requestData.teamId,
    });

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData || userData.team_id !== requestData.teamId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - team mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Downloading file from storage:", requestData.storagePath);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("local-uploads")
      .download(requestData.storagePath);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "File not found in storage. Please re-upload." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Extracting text from file...");
    const fileBuffer = await fileData.arrayBuffer();
    let extractedText: string;

    if (requestData.mimeType === "application/pdf") {
      extractedText = await extractTextFromPDF(fileBuffer);
    } else if (requestData.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
               requestData.mimeType === "application/msword") {
      extractedText = await extractTextFromDOCX(fileBuffer);
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported file type for direct processing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No text content could be extracted from the file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${extractedText.length} characters. Chunking...`);
    const chunks = chunkDocument(extractedText);
    console.log(`Created ${chunks.length} chunks. Generating embeddings...`);

    const embeddings = await generateEmbeddings(chunks.map(c => c.content));
    console.log(`Generated ${embeddings.length} embeddings. Inserting into database...`);

    const documentId = crypto.randomUUID();
    const sanitizedFilename = requestData.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const currentTime = new Date().toISOString();

    const chunksToInsert = chunks.map((chunk, index) => ({
      team_id: requestData.teamId,
      document_id: documentId,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      embedding: `[${embeddings[index].join(',')}]`,
      doc_category: requestData.category || 'other',
      doc_type: null,
      sensitivity_level: 'general',
      ai_classification: {},
      file_name: sanitizedFilename,
      file_path: null,
      folder_path: null,
      parent_folder_name: null,
      google_file_id: null,
      source_id: null,
      mime_type: requestData.mimeType,
      file_size: fileBuffer.byteLength,
      file_modified_at: currentTime,
      upload_source: 'local_upload',
      storage_path: requestData.storagePath,
      uploaded_by: requestData.userId,
      original_filename: requestData.filename,
      sync_status: 'active',
      last_synced_at: currentTime,
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .upsert(chunksToInsert, {
        onConflict: 'team_id,document_id,chunk_index',
      });

    if (insertError) {
      console.error("Database insertion error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save document chunks", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully inserted ${chunks.length} chunks`);

    const classifierWebhook = Deno.env.get("N8N_BACKGROUND_CLASSIFIER_WEBHOOK");
    if (classifierWebhook) {
      try {
        console.log("Triggering background classifier...");
        await fetch(classifierWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team_id: requestData.teamId,
            document_id: documentId,
            file_name: sanitizedFilename,
            trigger_source: "local_upload_pdf",
          }),
        });
        console.log("Background classifier triggered");
      } catch (webhookError) {
        console.error("Classifier webhook error (non-fatal):", webhookError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        chunkCount: chunks.length,
        characterCount: extractedText.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Processing error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});