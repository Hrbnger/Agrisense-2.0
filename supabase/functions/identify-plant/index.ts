import "https://deno.land/x/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageData } = await req.json()

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    
    console.log('OPENAI_API_KEY found:', !!OPENAI_API_KEY)
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured')
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openaiUrl = 'https://api.openai.com/v1/chat/completions'
    const prompt = `Identify this plant and return ONLY valid JSON:
{
  "plantName": "common name",
  "scientificName": "scientific name",
  "plantType": "type",
  "suitableEnvironment": "growing conditions",
  "careInstructions": "care instructions"
}`

    const openaiResponse = await fetch(openaiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a plant identification expert. Analyze images and return plant information in the exact JSON format requested.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ],
        max_tokens: 500
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI API error:', errorText)
      console.error('Status:', openaiResponse.status)
      throw new Error(`OpenAI API request failed: ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    console.log('OpenAI API response received')
    const responseText = openaiData.choices?.[0]?.message?.content || ''
    
    console.log('OpenAI response text:', responseText.substring(0, 200))
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const plantInfo = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!plantInfo) {
      console.error('Failed to parse OpenAI response')
      throw new Error('Failed to parse AI response')
    }
    
    console.log('Parsed plant info:', plantInfo)
    
    return new Response(
      JSON.stringify({
        ...plantInfo,
        confidence: plantInfo.confidence || 90
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error identifying plant:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to identify plant' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
