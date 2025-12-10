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
    const { query, contacts } = await req.json();
    
    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          matchedIds: [], 
          message: "You don't have any contacts yet. Add some contacts first!" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const contactsContext = contacts.map((c: any) => 
      `ID: ${c.id} | Name: ${c.name} | Company: ${c.company || 'N/A'} | Role: ${c.role || 'N/A'} | Notes: ${c.notes || 'N/A'} | Tags: ${c.tags?.join(', ') || 'N/A'} | Layer: ${c.layer}`
    ).join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that searches through a user's contact list based on their description.

Given a list of contacts and a user query, identify which contacts match the description.

CONTACTS:
${contactsContext}

Respond with a JSON object containing:
1. "matchedIds": an array of contact IDs that match the query (can be empty if no matches)
2. "message": a brief, friendly message explaining your findings

Be flexible with matching - consider partial matches, similar roles, related companies, etc.
If the query is vague, try to find the most likely matches.
Only return the JSON object, no other text.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let result;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      result = {
        matchedIds: [],
        message: "I had trouble understanding that. Could you describe them differently?"
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-contacts:', error);
    return new Response(
      JSON.stringify({ 
        matchedIds: [], 
        message: "Sorry, I encountered an error. Please try again." 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
