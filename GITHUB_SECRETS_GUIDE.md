# How to Add GitHub Secrets - Step by Step Guide

GitHub Secrets allow you to store sensitive information (like API keys) securely without exposing them in your code. This guide will walk you through adding the required secrets for AgriSense.

## Why GitHub Secrets?

Your app needs API keys and credentials to work, but you should **never** commit these to your repository. GitHub Secrets encrypt and store them securely, making them available only to GitHub Actions workflows.

## Required Secrets for AgriSense

You need to add these three secrets:

1. **VITE_SUPABASE_URL** - Your Supabase project URL
2. **VITE_SUPABASE_ANON_KEY** - Your Supabase anonymous/public key
3. **VITE_OPENAI_API_KEY** - Your OpenAI API key

---

## Step-by-Step Instructions

### Step 1: Open Your Repository

1. Go to [GitHub.com](https://github.com)
2. Navigate to your AgriSense repository
3. Make sure you're logged in and have admin/owner access

### Step 2: Navigate to Secrets Settings

1. Click on the **Settings** tab at the top of your repository
   - It's located next to "Insights" and "Security"
   - If you don't see "Settings", you may not have admin access to the repository

2. In the left sidebar, scroll down to find **"Secrets and variables"**
   - It's under the **"Security"** section

3. Click on **"Actions"** under "Secrets and variables"
   - You'll see options like "Actions secrets" and "Dependencies"

### Step 3: Add Each Secret

For each secret, follow these steps:

#### Adding VITE_SUPABASE_URL

1. Click the **"New repository secret"** button (green button, top right)

2. Fill in the form:
   - **Name**: Enter exactly `VITE_SUPABASE_URL`
     - ⚠️ **Important**: The name must match exactly (case-sensitive)
   
   - **Secret**: Paste your Supabase project URL
     - Format: `https://xxxxxxxxxxxxx.supabase.co`
     - Where to find it:
       - Go to your [Supabase Dashboard](https://app.supabase.com)
       - Select your project
       - Go to **Settings** → **API**
       - Copy the **Project URL** (under "Project API keys")

3. Click **"Add secret"**

#### Adding VITE_SUPABASE_ANON_KEY

1. Click **"New repository secret"** again

2. Fill in:
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   
   - **Secret**: Your Supabase anonymous key
     - Where to find it:
       - Same location: Supabase Dashboard → Settings → API
       - Copy the **anon/public** key (starts with `eyJhbGc...`)
       - ⚠️ **Important**: Use the "anon" key, NOT the "service_role" key

3. Click **"Add secret"**

#### Adding VITE_OPENAI_API_KEY

1. Click **"New repository secret"** again

2. Fill in:
   - **Name**: `VITE_OPENAI_API_KEY`
   
   - **Secret**: Your OpenAI API key
     - Where to find it:
       - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
       - Sign in to your OpenAI account
       - Click **"Create new secret key"**
       - Give it a name (e.g., "AgriSense GitHub Pages")
       - **Copy the key immediately** - you won't be able to see it again!

3. Click **"Add secret"**

### Step 4: Verify Your Secrets

After adding all three secrets, you should see:

```
VITE_OPENAI_API_KEY           ••••••••••••••••••
VITE_SUPABASE_ANON_KEY        ••••••••••••••••••
VITE_SUPABASE_URL             ••••••••••••••••••
```

- The values are hidden with dots (`•••`) for security
- You can click on a secret to update it or delete it
- The "Updated" column shows when each secret was last modified

---

## Visual Guide

```
Repository Page
    │
    ├── Code (tab)
    ├── Issues (tab)
    ├── Pull requests (tab)
    ├── Actions (tab)
    ├── Projects (tab)
    ├── Wiki (tab)
    └── Settings (tab) ← Click here
           │
           ├── General
           ├── Access
           ├── Secrets and variables ← Click here
           │        │
           │        └── Actions ← Click here
           │              │
           │              └── [New repository secret] button ← Click here
           │                     │
           │                     ├── Name: VITE_SUPABASE_URL
           │                     ├── Secret: [paste your key]
           │                     └── [Add secret] button
```

---

## Important Notes

### ✅ Do's

- ✅ Use the exact secret names shown above (case-sensitive)
- ✅ Copy secrets carefully to avoid extra spaces or line breaks
- ✅ Use the "anon/public" key for Supabase, not the service role key
- ✅ Store your secrets securely on your local machine if needed
- ✅ Update secrets if you regenerate API keys

### ❌ Don'ts

- ❌ Never commit secrets to your repository
- ❌ Never share your secrets in issues or pull requests
- ❌ Never use the service_role key for client-side code
- ❌ Don't include quotes or extra characters when pasting secrets

---

## Troubleshooting

### Can't See "Settings" Tab?

- Make sure you're logged in to GitHub
- Verify you have **admin or owner** permissions on the repository
- If you forked the repository, you need to work on your fork, not the original

### Secret Not Working?

- Double-check the secret name matches exactly (case-sensitive)
- Verify the secret value is correct (no extra spaces)
- Make sure you committed and pushed the workflow file (`.github/workflows/deploy.yml`)
- Check the GitHub Actions logs to see specific error messages

### Finding Your Supabase Keys

1. Go to https://app.supabase.com
2. Select your project
3. Click **Settings** (gear icon, bottom left)
4. Click **API** under "Project Settings"
5. You'll see:
   - **Project URL**: Use for `VITE_SUPABASE_URL`
   - **anon public**: Use for `VITE_SUPABASE_ANON_KEY`
   - **service_role**: ❌ Don't use this for client-side apps!

### Finding Your OpenAI Key

1. Go to https://platform.openai.com/api-keys
2. Sign in with your OpenAI account
3. Click **"Create new secret key"**
4. Name it (e.g., "GitHub Pages")
5. Click **"Create secret key"**
6. **Copy it immediately** - it won't be shown again!
7. If you lose it, delete the old one and create a new key

---

## Testing Your Secrets

After adding secrets:

1. Go to the **Actions** tab in your repository
2. Click on **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** → **"Run workflow"**
4. Watch the build process
5. If secrets are missing or incorrect, you'll see errors in the logs

---

## Security Best Practices

1. **Limit Access**: Only give admin access to trusted collaborators
2. **Rotate Keys**: Regenerate API keys periodically
3. **Monitor Usage**: Check your OpenAI and Supabase dashboards for unusual activity
4. **Use Environment-Specific Keys**: Consider separate keys for development and production
5. **Never Share**: Secrets are encrypted, but only share repository access with trusted people

---

## Need Help?

If you're still having issues:

1. Check the GitHub Actions workflow logs for specific error messages
2. Verify each secret name and value carefully
3. Make sure the secrets are added to the correct repository
4. Ensure the workflow file (`.github/workflows/deploy.yml`) exists in your repository

---

## Summary Checklist

- [ ] Repository Settings → Secrets and variables → Actions
- [ ] Added `VITE_SUPABASE_URL` with your Supabase project URL
- [ ] Added `VITE_SUPABASE_ANON_KEY` with your Supabase anon key
- [ ] Added `VITE_OPENAI_API_KEY` with your OpenAI API key
- [ ] Verified all three secrets are listed (values hidden)
- [ ] Enabled GitHub Pages (Settings → Pages → Source: GitHub Actions)
- [ ] Pushed code to trigger deployment

Once all secrets are added, your GitHub Actions workflow can access them during the build process, and your deployed app will work correctly!

