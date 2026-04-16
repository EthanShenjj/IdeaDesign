# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IdeaDesign is an AI-powered visual style extraction platform with a Flask backend and Next.js 14 frontend. Users upload images to extract color palettes, style analysis, and generate AI prompts.

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Flask, Python, Pillow + extcolors for color extraction
- **Database**: MySQL (via docker-compose) or SQLite (local dev)
- **AI Integration**: OpenAI-compatible API (supports OpenAI, DeepSeek, OneAPI, local LLMs)

### Project Structure

```
/Users/ethan/Desktop/ethan_product/IdeaDesign/
├── frontapp/              # Next.js frontend (port 3001)
│   ├── src/app/          # App Router pages
│   ├── src/components/   # React components
│   ├── src/lib/          # API services & utilities
│   │   ├── api.ts        # All backend API calls
│   │   └── i18n/         # Translation (zh/en)
│   └── src/types/        # TypeScript types
├── backend/              # Flask API (port 5001)
│   ├── app.py            # Main Flask application
│   ├── utils/            # Color extraction, vision analyzer
│   └── database/         # DB models and manager
├── docker-compose.yml    # MySQL + Backend + Frontend orchestration
└── vercel.json           # Vercel deployment config (references old frontweb/)
```

### Data Flow
1. User uploads image → Frontend sends to `/api/extract-colors` and `/api/analyze`
2. Backend extracts colors using Pillow/extcolors
3. Backend sends image to AI model (OpenAI-compatible API) for style analysis
4. Results saved to MySQL via `/api/history` endpoints
5. Frontend displays color palette, style tags, and generated prompt

### State Management
- **Frontend**: React hooks + localStorage for model configs (`ai_models` key)
- **Backend**: MySQL for persistent storage (history, assets, users)
- **Auth**: LocalStorage-based (`user`, `currentUser`, `isLoggedIn` keys)

## Development Commands

### Frontend (frontapp/)
```bash
cd frontapp

# Install dependencies
npm install

# Development server (runs on port 3001)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm run build
npm start
```

### Backend (backend/)
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run Flask server (port 5001)
python app.py

# Or with gunicorn (production)
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### Full Stack (Docker)
```bash
# Start all services (MySQL + Backend + Frontend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all
docker-compose down
```

## Environment Configuration

### Frontend (.env.local in frontapp/)
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### Backend (.env in backend/)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=aiuser
DB_PASSWORD=aipassword
DB_NAME=ideaDesign
```

## Key Implementation Details

### API Layer (frontapp/src/lib/api.ts)
All API calls go through this file. Base URL is `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'`.

Key functions:
- `extractColors()` - Extract color palette from image
- `analyzeImage()` - AI analysis of visual style
- `getHistory()` / `saveToHistory()` - Persist analysis results
- `getStoredModels()` / `saveModels()` - LocalStorage model config

### Color Extraction Backend (backend/utils/color_extractor.py)
Uses `extcolors` library on Pillow images. Returns array of `{hex, rgb, percentage, pixel_count}`.

### AI Analysis Backend (backend/utils/vision_analyzer.py)
Sends image to OpenAI-compatible API with structured prompt to extract:
- composition, art_style, lighting, mood, medium, technical, elements
- color_palette, color_classification (primary, secondary, tertiary, neutral)
- ai_prompt, style_tags, style_name

### i18n System (frontapp/src/lib/i18n/)
Bilingual support (Chinese/English) via React Context. Translations in `translations.ts`. Access via `useLanguage()` hook:
```typescript
const { t, language, setLanguage } = useLanguage();
t('analyze.title') // Returns translation based on current language
```

### Custom Design System (Tailwind)
Custom colors in tailwind.config.js:
- `canvas` (#FBFBF9) - Background
- `ink` (#1A1C1B) - Text
- `accent` (#FDE047) - Primary actions
- `tertiary` (#895200) - Secondary accent

Custom font families:
- `font-headline` - Plus Jakarta Sans
- `font-handwriting` - Gochi Hand
- `font-mono` - JetBrains Mono
- `font-label` - Space Grotesk

## Common Tasks

### Adding a New Page
1. Create folder in `frontapp/src/app/[page-name]/`
2. Add `page.tsx` with `'use client'` if using React hooks
3. Add translation keys to `frontapp/src/lib/i18n/translations.ts`
4. Add nav link in `frontapp/src/components/Header.tsx`

### Adding an API Endpoint
1. Add function to `frontapp/src/lib/api.ts`
2. Add corresponding route in `backend/app.py`
3. Update TypeScript types in `frontapp/src/types/index.ts` if needed

### Adding Translations
1. Edit `frontapp/src/lib/i18n/translations.ts`
2. Add key to both `zh` and `en` objects
3. Use `t('your.key')` in components

## Important Notes

- **Image Handling**: Frontend uses raw `<img>` tags (not Next.js Image) due to dynamic external URLs. Configured in `next.config.js` with `remotePatterns`.
- **Model Config**: Stored in localStorage under `ai_models` key. Never sent to backend except during analysis requests.
- **Uploads**: Backend saves uploaded images to `backend/uploads/` folder.
- **Inspiration Page**: Exists at `frontapp/src/app/inspiration/` but not yet fully integrated (git shows as untracked).
- **Database**: First run creates tables automatically. SQLite used for simple dev, MySQL for Docker/full deployment.
- **CORS**: Flask backend has CORS enabled for frontend origin.

## Database Schema

Key tables managed in `backend/database/db_manager.py`:
- `assets` - Saved analysis results
- `history` - Analysis history with `is_saved` flag
- `users` - Authentication (bcrypt hashed passwords)

See `DATABASE_SCHEMA.md` for full schema documentation.
