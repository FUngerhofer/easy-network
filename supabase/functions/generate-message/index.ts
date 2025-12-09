import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Tone guidance based on relationship layer
const toneGuidance: Record<string, string> = {
  vip: "Use a very casual, warm, and friendly tone like you're texting your best friend. Use informal language, can include emojis, and be playful.",
  inner: "Use a friendly and warm tone, somewhat casual but still thoughtful. Like texting a good friend you see regularly.",
  regular: "Use a balanced tone that's friendly but not too casual. Professional yet personable.",
  occasional: "Use a polite and professional tone. Friendly but more formal, suitable for acquaintances or professional contacts.",
  distant: "Use a professional and courteous tone. Formal but not cold, appropriate for business contacts or people you don't know well.",
};

const opportunityPrompts: Record<string, string> = {
  birthday: "Write a birthday message",
  follow_up: "Write a follow-up message based on a previous conversation",
  milestone: "Write a congratulatory message for an important milestone or achievement",
  check_in: "Write a casual check-in message to see how they're doing",
  manual: "Write a thoughtful message to reach out",
  'contact-reminder': "Write a friendly message to reconnect after not being in touch for a while",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactName, contactLayer, opportunityType, opportunityTitle, opportunityDescription } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const tone = toneGuidance[contactLayer] || toneGuidance.regular;
    const typePrompt = opportunityPrompts[opportunityType] || opportunityPrompts.manual;

    const systemPrompt = `You are a helpful assistant that generates short, personalized messages for maintaining relationships. 
    
${tone}

Generate messages that are:
- Short and concise (2-3 sentences max)
- Genuine and not generic
- Easy to copy and send via text or email
- Appropriate for the relationship level

Do not include greetings like "Hey" at the start if the tone is very casual - just get to the point.
Do not include sign-offs or your name at the end.`;

    const userPrompt = `${typePrompt} for ${contactName}.

Context:
- Title/Reason: ${opportunityTitle}
${opportunityDescription ? `- Additional details: ${opportunityDescription}` : ''}

Generate just the message text, nothing else.`;

    console.log(`Generating message for ${contactName}, layer: ${contactLayer}, type: ${opportunityType}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();

    if (!message) {
      throw new Error('No message generated');
    }

    console.log(`Generated message: ${message}`);

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating message:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
