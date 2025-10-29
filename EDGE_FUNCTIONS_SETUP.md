# Supabase Edge Functions Setup Guide

This guide will help you deploy the Edge Functions for plant identification and disease diagnosis.

## Created Edge Functions

1. **identify-plant** - Identifies plants from images
2. **diagnose-disease** - Diagnoses plant diseases from images

## Prerequisites

- Node.js and npm installed
- Supabase account
- Supabase CLI installed (or we'll install it)
- Plant.id API key (optional, for real AI functionality)

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

Or using PowerShell:
```powershell
npm install -g supabase
```

Verify installation:
```bash

```

## Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window for authentication.

## Step 3: Link Your Project

```bash
supabase link --project-ref ggktiwtwudznpvgjcwyi
```

Enter your database password when prompted.

## Step 4: Set Environment Variables

Both functions use Google's Gemini API for AI-powered identification and diagnosis.

**Set Gemini API Key:**

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API Key"
3. Copy your API key
4. Set it in Supabase:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here --project-ref ggktiwtwudznpvgjcwyi
```

**Note**: The GEMINI_API_KEY is already configured in this project. Without the API key, the functions will return demo data, which is perfect for testing!

## Step 5: Deploy the Functions

Deploy both functions:

```bash
# Deploy plant identification
supabase functions deploy identify-plant --project-ref ggktiwtwudznpvgjcwyi

# Deploy disease diagnosis
supabase functions deploy diagnose-disease --project-ref ggktiwtwudznpvgjcwyi
```

## Step 6: Configure CORS (Optional)

If you need to allow requests from other domains, you may need to configure CORS in your Supabase project settings.

## Step 7: Test the Functions

### Test from the App
1. Start your dev server: `npm run dev`
2. Go to `localhost:8080/identify-plant`
3. Upload an image
4. Click "Identify Plant"

### Test with curl (Optional)

```bash
# Replace YOUR_FUNCTION_URL with your actual URL
curl -X POST "https://ggktiwtwudznpvgjcwyi.supabase.co/functions/v1/identify-plant" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"imageData":"data:image/jpeg;base64,..."}'
```

## How It Works

### Without API Key (Demo Mode)
- Functions return random demo data
- No external API calls
- Fast and free
- Perfect for development and testing

### With Gemini API Key (Production Mode)
- Functions use Google's Gemini 1.5 Flash model
- Real AI-powered identification and disease diagnosis
- Vision AI analyzes images directly
- Free tier available with generous rate limits
- More accurate and natural language responses

## Troubleshooting

### "Function not found" error
- Make sure you've deployed the functions
- Check that the function names match exactly

### "Unauthorized" error
- Verify your Supabase credentials are correct
- Check the .env file has the right anon key

### "API key not found" error
- The function will use demo data automatically
- This is normal if you haven't set the GEMINI_API_KEY
- To use real AI: Set the key with `supabase secrets set GEMINI_API_KEY=your_key --project-ref ggktiwtwudznpvgjcwyi`

### Function deployment fails
- Ensure Supabase CLI is up to date: `npm install -g supabase@latest`
- Try logging in again: `supabase login`
- Check your project reference ID is correct

## Alternative: Quick Deploy

If you just want to test immediately without deploying:

The frontend already has demo fallback built in! Just run your app and test it. The Edge Functions will return demo data until you deploy them.

## Update Functions

To update functions after making changes:

```bash
supabase functions deploy identify-plant --project-ref ggktiwtwudznpvgjcwyi
supabase functions deploy diagnose-disease --project-ref ggktiwtwudznpvgjcwyi
```

## Project Structure

```
supabase/
├── functions/
│   ├── identify-plant/
│   │   └── index.ts       # Plant identification logic
│   └── diagnose-disease/
│       └── index.ts       # Disease diagnosis logic
├── config.toml            # Supabase configuration
└── migrations/            # Database migrations
```

## Next Steps

1. ✅ Deploy the functions (already deployed)
2. ✅ Test in the app
3. ✅ GEMINI_API_KEY is already configured
4. ✅ Functions use Gemini AI for identification and diagnosis
5. ✅ Ready to use in production!

## Support

If you encounter issues:
1. Check the Supabase dashboard logs
2. Review the Edge Function logs
3. Check browser console for errors
4. Verify all environment variables are set

Good luck! 🚀

