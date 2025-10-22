# Memoria MVP

> Capture and share your event moments with friends and family

Memoria is a production-grade event photo sharing platform built as a monorepo with web and mobile applications. Users can create events, upload photos/videos, and share memories with public or private visibility.

## 🏗️ Architecture

This is a **Turborepo monorepo** with the following structure:

```
memoria-mvp/
├── apps/
│   ├── web/              # Next.js 14 (App Router) web application
│   └── mobile/           # Expo React Native mobile app
├── packages/
│   ├── ui/               # Shared types, schemas, utilities, Supabase client
│   └── config/           # Shared ESLint, Prettier, TypeScript, Tailwind configs
├── infra/
│   └── supabase/         # Database schema, RLS policies, seed data
└── [config files]
```

### Tech Stack

**Web App:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI components
- TanStack Query
- Supabase client

**Mobile App:**
- Expo (React Native)
- Expo Router
- TypeScript
- Expo Image Picker & Camera
- AsyncStorage for offline queue

**Backend:**
- Supabase (PostgreSQL, Auth, Storage, Realtime)
- Row Level Security (RLS) for data access control

**Build & Deploy:**
- pnpm workspaces
- Turborepo
- Vercel (web)
- EAS (mobile)

## ✨ Features

### MVP Features (Implemented)

- ✅ **Authentication**: Email + Google OAuth
- ✅ **User Profiles**: Display name, avatar
- ✅ **Events**: Create with title, description, date, location, visibility (public/private)
- ✅ **Event Membership**: Join events ("I was there")
- ✅ **Media Upload**: Photos & videos to Supabase Storage
- ✅ **Feed**: Browse recent public events and media
- ✅ **Media Viewer**: Full-screen viewer with navigation
- ✅ **Interactions**: Like and comment on media
- ✅ **Real-time Updates**: Live comments via Supabase Realtime
- ✅ **Sharing**: Public links for events (`/e/:id`)
- ✅ **Security**: RLS policies for public/private content
- ✅ **Mobile Upload Queue**: Offline-capable upload with retry
- ✅ **Responsive Design**: Dark mode, mobile-first

### TODO / Future Enhancements

- 🔜 **Apple Sign-In**: iOS authentication
- 🔜 **Push Notifications**: Event updates, new media
- 🔜 **Deep Links**: Universal links (`memoria://e/:id`)
- 🔜 **Signed URLs**: Strict private media access
- 🔜 **Thumbnail Generation**: Server-side image optimization
- 🔜 **Video Player**: Native video playback on mobile
- 🔜 **Search**: Find events and users
- 🔜 **Content Moderation**: Report inappropriate content
- 🔜 **Analytics**: Track engagement metrics

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **Supabase account** (free tier works)
- **Expo account** (for mobile development)

### 1. Clone and Install

```bash
git clone <your-repo-url> memoria-mvp
cd memoria-mvp
pnpm install
```

### 2. Set Up Supabase

#### Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for provisioning to complete
3. Note your **Project URL** and **Anon Key** from Settings > API

#### Run SQL Scripts

Navigate to SQL Editor in Supabase dashboard and run in order:

1. Copy and paste `infra/supabase/schema.sql` → Execute
2. Copy and paste `infra/supabase/policies.sql` → Execute
3. (Optional) `infra/supabase/seed.sql` for sample data

#### Create Storage Bucket

1. Go to Storage in Supabase dashboard
2. Create new bucket: `media`
3. Set to **Public**
4. Apply storage policies from `infra/supabase/README.md`

#### Enable Realtime (Optional)

1. Go to Database > Replication
2. Enable replication for: `media`, `comments`, `likes`

See `infra/supabase/README.md` for detailed instructions.

### 3. Configure Environment Variables

#### Web App

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Mobile App

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Servers

#### Web App

```bash
pnpm dev:web
# Runs Next.js at http://localhost:3000
```

#### Mobile App

```bash
pnpm dev:mobile
# Starts Expo - scan QR with Expo Go app
```

#### Both Together

```bash
pnpm dev
# Runs both web and mobile in parallel
```

## 📱 Mobile Development

### Running on Device

1. Install **Expo Go** app on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Run `pnpm dev:mobile`
3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### Building for Production

#### iOS

```bash
cd apps/mobile
eas build --platform ios
```

#### Android

```bash
cd apps/mobile
eas build --platform android
```

See [Expo EAS Build docs](https://docs.expo.dev/build/introduction/) for setup.

## 🌐 Web Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set framework preset to **Next.js**
3. Set root directory to `apps/web`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
5. Deploy

### Manual Build

```bash
cd apps/web
pnpm build
pnpm start
```

## 🧪 Testing

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
```

## 📂 Project Structure

### Apps

**`apps/web/`** - Next.js web application
- `app/` - App Router pages
  - `page.tsx` - Public feed
  - `login/` - Authentication
  - `e/[id]/` - Event detail page
  - `u/[id]/` - User profile
  - `upload/` - Media upload
- `src/components/` - React components
- `src/lib/` - Utilities and Supabase client

**`apps/mobile/`** - Expo mobile application
- `app/` - Expo Router screens
  - `(auth)/` - Login flow
  - `(tabs)/` - Main tab navigation
  - `event/[id].tsx` - Event detail
  - `viewer/[mediaId].tsx` - Media viewer
  - `upload.tsx` - Upload flow
- `src/features/` - Feature modules (upload queue)
- `src/lib/` - Utilities and Supabase client

### Packages

**`packages/ui/`** - Shared code
- `src/types.ts` - TypeScript interfaces
- `src/schemas.ts` - Zod validation schemas
- `src/supabase/` - Supabase client factory
- `src/utils/` - Date, format, permissions utilities

**`packages/config/`** - Shared configuration
- ESLint, Prettier, TypeScript, Tailwind presets

### Infrastructure

**`infra/supabase/`** - Database setup
- `schema.sql` - Table definitions
- `policies.sql` - Row Level Security
- `seed.sql` - Sample data
- `README.md` - Setup guide

## 🔒 Security

### Row Level Security (RLS)

All tables have RLS enabled with policies:

- **Public Events**: Readable by anyone
- **Private Events**: Only members can read
- **Media**: Inherits event visibility
- **Profiles**: Public read, own update
- **Likes/Comments**: Public read, authenticated write

### Storage Policies

- Public read access to media bucket
- Users can only upload to their own folder (`{userId}/*`)
- Users can only delete their own files

### Best Practices

- Never commit `.env` files
- Use `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` for client-safe variables
- Service role key should NEVER be in client code
- Review all RLS policies before production
- Implement rate limiting for uploads
- Add content moderation for UGC

## 🐛 Troubleshooting

### Common Issues

**Build fails with "Module not found"**
```bash
pnpm clean
pnpm install
```

**Supabase "permission denied"**
- Check RLS policies in `infra/supabase/policies.sql`
- Verify you're authenticated
- Check if user is event member for private content

**Mobile app won't connect to Supabase**
- Verify `.env` file exists in `apps/mobile/`
- Restart Expo dev server
- Check Supabase URL/key are correct

**Images not uploading**
- Verify storage bucket "media" exists
- Check storage policies are applied
- Ensure file size < 50MB

**Realtime not working**
- Enable replication in Database > Replication
- Check client is subscribed to correct channel
- Verify RLS allows reading the data

## 📝 Development Workflow

### Adding a New Feature

1. **Define types** in `packages/ui/src/types.ts`
2. **Create schema** in `packages/ui/src/schemas.ts`
3. **Update database** in `infra/supabase/schema.sql`
4. **Add RLS policies** in `infra/supabase/policies.sql`
5. **Implement in web** (`apps/web/`)
6. **Implement in mobile** (`apps/mobile/`)
7. **Test both platforms**

### Code Style

- Use TypeScript strictly
- Follow existing file structure
- Keep components small and focused
- Use shared utilities from `@memoria/ui`
- Document complex logic with comments

## 🤝 Contributing

This is an MVP. Contributions are welcome but please:

1. Open an issue first to discuss changes
2. Follow the existing code style
3. Add tests if adding features
4. Update documentation

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Expo](https://expo.dev/)
- [Supabase](https://supabase.com/)
- [Turborepo](https://turbo.build/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Happy coding! 🎉**

For questions or issues, please open a GitHub issue.

