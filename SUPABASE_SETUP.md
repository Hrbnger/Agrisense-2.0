# Supabase Integration Setup Guide

Your AgriSense project has been integrated with Supabase! Here's what was set up and what you need to do next.

## What's Already Configured

### 1. Supabase Client
- **File**: `src/integrations/supabase/client.ts`
- Initializes the Supabase client with environment variables
- Throws an error if environment variables are missing

### 2. TypeScript Types
- **File**: `src/integrations/supabase/types.ts`
- Database schema types for:
  - `profiles` - User profile information
  - `plants` - Plant identification results
  - `diseases` - Disease detection results
  - `forum_posts` - Community forum posts
  - `comments` - Forum post comments

### 3. Authentication Hook
- **File**: `src/hooks/useAuth.tsx`
- Provides `AuthProvider` component and `useAuth()` hook
- Manages user session state
- Handles authentication state changes

### 4. Middleware Utilities
- **File**: `src/integrations/supabase/middleware.ts`
- Helper functions for authentication checks
- Current user utilities

## Required Setup Steps

### 1. Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Create a new project (or use existing one)
4. Project ID: `ggktiwtwudznpvgjcwyi` (already configured in `supabase/config.toml`)

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://ggktiwtwudznpvgjcwyi.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

To find your anon key:
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy the "anon public" key

**Note**: The `.env` file is gitignored for security. Never commit it to version control.

### 3. Create Database Tables

Run these SQL commands in your Supabase SQL Editor to create the necessary tables:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Plants table
CREATE TABLE plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_name TEXT NOT NULL,
 дисциплина image_url TEXT,
  confidence DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Diseases table
CREATE TABLE diseases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disease_name TEXT NOT NULL,
  plant_name TEXT NOT NULL,
  image_url TEXT,
  confidence DECIMAL NOT NULL,
  treatment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Forum posts table
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all authenticated users to read, only owners to write)
CREATE POLICY "Anyone can view plants" ON plants FOR SELECT USING (true);
CREATE POLICY "Users can insert own plants" ON plants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own plants" ON plants FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view diseases" ON diseases FOR SELECT USING (true);
CREATE POLICY "Users can insert own diseases" ON diseases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own diseases" ON diseases FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON forum_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON forum_posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);
```

### 4. Enable Email Authentication

In your Supabase dashboard:
1. Go to "Authentication" → "Providers"
2. Enable "Email" provider
3. Configure email settings (SMTP) if needed

### 5. Enable Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth credentials
5. Add your redirect URL (from Supabase auth settings)
6. Copy Client ID and Secret to Supabase → Authentication → Providers → Google

## Using Supabase in Your App

### Authentication

The app is already set up with authentication in these pages:
- `src/pages/Auth.tsx` - Login and signup
- `src/pages/Dashboard.tsx` - Protected dashboard
- `src/pages/Profile.tsx` - User profile
- `src/pages/Settings.tsx` - User settings

### Example: Using the Supabase Client

```typescript
import { supabase } from '@/integrations/supabase/client';

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Query data
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id);
```

### Example: Using the Auth Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, session, loading, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;
  
  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## Testing the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/auth` and try creating an account

3. Check your Supabase dashboard to see the new user in "Authentication" → "Users"

4. The user will be automatically redirected to the dashboard after successful authentication

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure you've created the `.env` file
- Verify the environment variable names are correct
- Restart your development server after creating/modifying `.env`

### Authentication not working
- Check that email provider is enabled in Supabase
- Verify your project URL and anon key are correct
- Check browser console for specific error messages

### Database queries failing
- Ensure RLS policies are created
- Check that tables exist in your Supabase database
- Verify column names match your TypeScript types

## Next Steps

1. Customize the database schema for your specific needs
2. Add more authentication providers (GitHub, Apple, etc.)
3. Set up email templates in Supabase
4. Configure storage buckets for image uploads
5. Set up real-time subscriptions for forum posts

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

