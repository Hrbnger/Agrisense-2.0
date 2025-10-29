# Step-by-Step Guide: Fixing "Edge Function returned a non-2xx status code" Error

## Problem
The application is trying to call a Supabase Edge Function named `identify-plant` that doesn't exist yet, causing the read error.

## Solution Options

You have two options:

### Option 1: Quick Fix - Use Demo Data (Recommended for now)
This will make the app work immediately without setting up Edge Functions.

### Option 2: Create Real Edge Function
This requires setting up an AI service for plant identification.

---

## Option 1: Quick Fix with Demo Data (Easiest)

### Step 1: Update the IdentifyPlant component
The frontend will now generate demo plant identification results instead of calling the Edge Function.

### Step 2: Test it
Try identifying a plant - it should work immediately with demo data.

### Step 3: Later Setup (Optional)
When you're ready, you can set up real Edge Functions as described in Option 2.

---

## Option 2: Create Real Supabase Edge Function (Advanced)

### Prerequisites
- Supabase CLI installed
- An AI service API key (like Plant.id, Google Vision, or similar)

### Steps:

#### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

#### Step 2: Login to Supabase
```bash
supabase login
```

#### Step 3: Link your project
```bash
supabase link --project-ref ggktiwtwudznpvgjcwyi
```

#### Step 4: Create the Edge Function
```bash
supabase functions new identify-plant
```

#### Step 5: Write the function code
Edit `supabase/functions/identify-plant/index.ts` with your API integration code.

#### Step 6: Deploy the function
```bash
supabase functions deploy identify-plant
```

---

## Recommendation
Start with **Option 1** to get the app working, then implement Option 2 when you're ready for production.


