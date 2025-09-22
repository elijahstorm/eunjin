const { createClient } = require("@supabase/supabase-js");
const { generateText } = require("ai");
const { openai } = require("@ai-sdk/openai");
const dotenv = require("dotenv");

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function handleMessage(msg) {
  try {
    // 1. Get chat session
    const { data: session, error: sessionErr } = await supabase
      .from("chat_sessions")
      .select("id,document_id")
      .eq("id", msg.session_id)
      .single();

    if (sessionErr || !session) {
      console.error("Failed to fetch session for message", msg.id, sessionErr);
      return;
    }

    let documentContent = "";

    if (session.document_id) {
      // 2. Fetch document info
      const { data: doc, error: docErr } = await supabase
        .from("documents")
        .select("storage_bucket,storage_path")
        .eq("id", session.document_id)
        .single();

      if (docErr || !doc) {
        console.error("Failed to fetch document", session.document_id, docErr);
      } else {
        // 3. Download document file from Supabase Storage
        const { data: fileData, error: fileErr } = await supabase
          .storage
          .from(doc.storage_bucket)
          .download(doc.storage_path);

        if (fileErr) {
          console.error("Failed to download file", doc.storage_path, fileErr);
        } else {
          documentContent = (await fileData.text()) || "";
        }
      }
    }

    // --- LLM call ---
    const llmResponse = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: "system", content: "You are a helpful assistant replying to user messages and can reference the attached document." },
        { role: "system", content: `Document content:\n${documentContent}` },
        { role: "user", content: msg.content }
      ],
      maxRetries: 2
    });

    const assistantText = llmResponse.text;

    // Insert assistant message
    const { data: inserted, error: insertErr } = await supabase
      .from("chat_messages")
      .insert({
        session_id: msg.session_id,
        user_id: msg.user_id,
        role: "assistant",
        content: assistantText,
        tokens_in: msg.tokens_in || 0,
        tokens_out: 0,
        processed: true,
      })
      .select("*")
      .single();

    if (insertErr) console.error("Error inserting assistant message:", insertErr);

    // Mark original message as processed
    await supabase
      .from("chat_messages")
      .update({ processed: true })
      .eq("id", msg.id);

  } catch (e) {
    console.error("Error processing message", msg.id, e);
  }
}

// Real-time subscription
const channel = supabase
  .channel("chat_worker")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "chat_messages", filter: "processed=eq.false" },
    async (payload) => {
      const newMessage = payload.new;
      handleMessage(newMessage);
    }
  )
  .subscribe((status) => console.log("Subscription status:", status));

console.log("Worker subscription running...");
