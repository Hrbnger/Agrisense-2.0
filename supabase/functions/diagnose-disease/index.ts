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
    const prompt = `Analyze this plant image for diseases and return ONLY valid JSON:
{
  "diseaseName": "disease name or 'Healthy'",
  "plantName": "plant name",
  "severity": "Low/Medium/High/None",
  "description": "detailed description",
  "treatment": "specific treatment steps",
  "prevention": "prevention tips"
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
            content: 'You are a plant pathologist expert. Analyze plant images for diseases and return disease information in the exact JSON format requested.'
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
    const diagnosis = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!diagnosis) {
      console.error('Failed to parse OpenAI response')
      throw new Error('Failed to parse AI response')
    }
    
    console.log('Parsed diagnosis:', diagnosis)
    
    return new Response(
      JSON.stringify({
        ...diagnosis,
        confidence: diagnosis.confidence || 85
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error diagnosing disease:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to diagnose disease' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

