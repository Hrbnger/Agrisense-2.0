import "https://deno.land/x/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageData } = await req.json();

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "OPENAI_API_KEY is not configured. Please set it in your Supabase project settings.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const openaiUrl = "https://openrouter.ai/api/v1/chat/completions";
    const primaryModel = "nvidia/nemotron-nano-12b-v2-vl:free";
    const fallbackModel = "mistralai/mixtral-8x7b";

    const prompt = `You are a plant identification expert. Analyze the provided plant image and return ONLY valid JSON with the following format:
{
  "plantName": "common name of the plant",
  "scientificName": "scientific name",
  "plantType": "type (e.g., tree, flower, herb, crop, houseplant, succulent)",
  "suitableEnvironment": "best growing conditions",
  "careInstructions": "brief care and maintenance guidelines"
}
If unsure, make your best possible identification and include confidence in accuracy.`;

    // Helper to call a model
    const callModel = async (model: string) => {
      return await fetch(openaiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "HTTP-Referer": "https://your-app-domain.vercel.app",
          "X-Title": "Plant Identifier",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a bot that identifies plants and responds strictly in JSON format.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageData } },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });
    };

    // Try main model first
    let aiResponse = await callModel(primaryModel);
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Primary model failed:", errorText);
      console.log("Retrying with fallback model...");
      aiResponse = await callModel(fallbackModel);
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`Both models failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON (handles markdown or plain)
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const codeBlockMatch = responseText.match(
        /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
      );
      if (codeBlockMatch) jsonMatch = [codeBlockMatch[1]];
    }

    if (!jsonMatch || !jsonMatch[0]) {
      console.error("Failed to extract JSON:", responseText);
      throw new Error("Failed to parse AI response - invalid format");
    }

    let plantInfo;
    try {
      plantInfo = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("JSON parse error:", err, "Response:", responseText);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Return structured plant info
    return new Response(
      JSON.stringify({
        plantName: plantInfo.plantName || "Unknown",
        scientificName: plantInfo.scientificName || "Unknown",
        plantType: plantInfo.plantType || "Unknown",
        suitableEnvironment:
          plantInfo.suitableEnvironment ||
          "No environment information provided",
        careInstructions:
          plantInfo.careInstructions || "No care information provided",
        confidence: plantInfo.confidence || 85,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error identifying plant:", error);
    return new Response(
      JSON.stringify({
        error:
          error.message ||
          "Failed to identify plant. Ensure the image clearly shows the entire plant.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
