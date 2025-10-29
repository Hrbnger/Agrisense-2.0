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

    const prompt = `You are an expert plant pathologist. Analyze the provided plant image for ANY type of disease, pest damage, or health issues. 

Return ONLY valid JSON in this exact format:
{
  "diseaseName": "disease name or 'Healthy' if no issues detected",
  "plantName": "identified plant name (if known)",
  "severity": "Mild/Moderate/Severe/None",
  "symptoms": "detailed description of visible symptoms and signs",
  "treatment": "specific treatment steps and remedies",
  "prevention": "prevention tips and best practices"
}

If the plant appears healthy, set:
"diseaseName": "Healthy"
"severity": "None"
"symptoms": "No visible signs of disease or stress"
"treatment": "No treatment required"
"prevention": "Continue proper care and regular monitoring"`;


    const callModel = async (model: string) => {
      return await fetch(openaiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "HTTP-Referer": "https://your-app-domain.vercel.app",
          "X-Title": "Plant Doctor",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a plant health AI that diagnoses diseases strictly in valid JSON format.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageData } },
              ],
            },
          ],
          max_tokens: 600,
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

    // Extract JSON
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

    let diagnosis;
    try {
      diagnosis = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("JSON parse error:", err, "Response:", responseText);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Normalize severity
    const normalize = (val: string) => {
      const lower = val?.toLowerCase() || "";
      if (["mild", "low"].includes(lower)) return "Mild";
      if (["moderate", "medium"].includes(lower)) return "Moderate";
      if (["severe", "high"].includes(lower)) return "Severe";
      return "None";
    };

    return new Response(
      JSON.stringify({
        diseaseName: diagnosis.diseaseName || "Unknown",
        plantName: diagnosis.plantName || "Unknown",
        severity: normalize(diagnosis.severity),
        symptoms:
          diagnosis.symptoms ||
          diagnosis.description ||
          "No symptoms provided",
        treatment: diagnosis.treatment || "Treatment not specified",
        prevention: diagnosis.prevention || "No prevention info provided",
        confidence: diagnosis.confidence || 85,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error diagnosing disease:", error);
    return new Response(
      JSON.stringify({
        error:
          error.message ||
          "Failed to diagnose plant. Ensure the image clearly shows affected areas.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
