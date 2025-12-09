import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, action, text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (action === 'summarize') {
      // Summarize conversation notes
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "system", 
              content: `You are an assistant that summarizes conversation notes. Extract and organize:
1. Key professional information (role, company, projects, skills)
2. Personal information (family names, birthdays, hobbies, interests)
3. Action items or follow-ups mentioned
4. Important dates or events

Keep the summary concise but comprehensive. Format as bullet points.` 
            },
            { role: "user", content: `Please summarize this conversation note:\n\n${text}` }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === 'transcribe') {
      // Use Whisper-compatible transcription via Lovable AI
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "system", 
              content: "You are a transcription assistant. The user will provide audio content encoded as base64. Transcribe it accurately, preserving the speaker's intent and correcting obvious speech errors for clarity." 
            },
            { 
              role: "user", 
              content: [
                { type: "text", text: "Please transcribe this audio:" },
                { 
                  type: "input_audio", 
                  input_audio: { 
                    data: audio, 
                    format: "webm" 
                  } 
                }
              ]
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI transcription error:", response.status, errorText);
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      const transcription = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ transcription }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
