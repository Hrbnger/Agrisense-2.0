# GitHub Pages Deployment Guide

This guide will help you deploy AgriSense to GitHub Pages.

## Prerequisites

1. A GitHub repository (can be public or private)
2. GitHub Pages enabled in your repository settings

## Setup Instructions

### 1. Configure Repository Name

If your repository is named `username.github.io`:
- The site will be available at `https://username.github.io`
- **No changes needed** - the base path is already set to `/`

If your repository has a different name (e.g., `Agri-sense`):
- The site will be available at `https://username.github.io/Agri-sense`
- You need to update `vite.config.ts` to set the base path:
  ```typescript
  base: '/Agri-sense/',
  ```
  Or set an environment variable:
  ```bash
  VITE_BASE_PATH=/Agri-sense/
  ```

### 2. Add GitHub Secrets (Required)

Your app needs Supabase and OpenAI API keys. Add them as GitHub Secrets:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `VITE_OPENAI_API_KEY` - Your OpenAI API key

### 3. Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select:
   - **Source**: GitHub Actions
3. Click **Save**

### 4. Deploy

#### Option A: Automatic Deployment (Recommended)

The GitHub Actions workflow will automatically deploy when you:
- Push to the `main` branch
- Manually trigger via **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

#### Option B: Manual Deployment

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

2. The deployment will start automatically. Check the **Actions** tab to monitor progress.

## Post-Deployment

1. **Wait for deployment**: The first deployment may take a few minutes
2. **Check the Actions tab**: Ensure the deployment workflow completed successfully
3. **Visit your site**: Go to `https://username.github.io` or `https://username.github.io/repo-name`

## Client-Side Routing

The app uses React Router with client-side routing. A `404.html` file has been added to handle GitHub Pages routing correctly. All routes should work properly after deployment.

## Troubleshooting

### Build Fails

- Check that all environment variables are set in GitHub Secrets
- Verify your `package.json` dependencies are correct
- Check the Actions logs for specific error messages

### 404 Errors on Routes

- Ensure `404.html` is in the `public` folder (it's already there)
- Verify the base path in `vite.config.ts` matches your repository structure

### API Errors

- Verify Supabase URL and keys are correct in GitHub Secrets
- Check Supabase project settings and RLS policies
- Ensure OpenAI API key has sufficient credits

### Assets Not Loading

- Check that the base path is correctly configured
- Verify file paths use relative paths (starting with `/`)

## Updating Your Deployment

Simply push changes to the `main` branch, and the workflow will automatically rebuild and redeploy:

```bash
git add .
git commit -m "Update deployment"
git push origin main
```

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to the `public` folder with your domain:
   ```
   example.com
   ```

2. Update your DNS settings to point to GitHub Pages:
   - Add a CNAME record pointing to `username.github.io`

3. The GitHub Actions workflow will handle the CNAME file automatically

