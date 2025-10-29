# AgriSense - Smart Farming Companion

A modern web application for plant identification, disease detection, and farmer community support.

## Features

- 🌱 **AI Plant Identification** - Instantly identify any plant species using advanced AI technology
- 🔬 **Disease Detection** - Diagnose plant diseases early and get treatment recommendations
- 👥 **Farmer Community** - Connect with farmers, share knowledge, and get expert advice
- 🌤️ **Weather & Tips** - Get localized farming advice based on weather conditions
- 📊 **Dashboard** - Track your farming activities and history

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Database, Authentication, Storage)
- **Routing**: React Router v6
- **State Management**: React Context API
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase account ([sign up here](https://supabase.com))

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Agri-sense
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the Supabase database:
- Follow the instructions in `SUPABASE_SETUP.md` to create the database tables and enable authentication

5. Start the development server:
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:8080`

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   └── ThemeProvider.tsx
├── hooks/           # Custom React hooks
│   ├── useAuth.tsx  # Authentication hook
│   └── use-mobile.tsx
├── integrations/    # Third-party integrations
│   └── supabase/    # Supabase client and utilities
├── lib/             # Utility functions
├── pages/           # Page components
│   ├── Index.tsx    # Landing page
│   ├── Auth.tsx     # Authentication page
│   ├── Dashboard.tsx
│   ├── Profile.tsx
│   ├── Settings.tsx
│   ├── IdentifyPlant.tsx
│   ├── DiagnoseDisease.tsx
│   ├── Forum.tsx
│   └── Weather.tsx
├── main.tsx         # App entry point
└── index.css        # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Authentication

The app uses Supabase Authentication with support for:
- Email/Password authentication
- Google OAuth
- Session management
- Protected routes

## Database Schema

The app uses the following Supabase tables:
- `profiles` - User profile information
- `plants` - Plant identification results
- `diseases` - Disease detection results  
- `forum_posts` - Community forum posts
- `comments` - Forum post comments

See `SUPABASE_SETUP.md` for detailed schema and setup instructions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Complete Supabase integration guide
- [Integration Summary](./INTEGRATION_SUMMARY.md) - Summary of implemented features

## Support

For issues and questions, please open an issue on GitHub.

