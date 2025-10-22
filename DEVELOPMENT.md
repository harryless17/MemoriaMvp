# Development Guide

This guide covers development workflows, architecture decisions, and best practices for the Memoria project.

## Architecture Overview

### Monorepo Structure

Memoria uses **Turborepo** to manage a monorepo with shared dependencies:

- **Apps**: Independently deployable applications (web, mobile)
- **Packages**: Shared code libraries (ui, config)
- **Infrastructure**: Database schema and configuration

### Key Architectural Decisions

**1. Shared Types & Utilities (`packages/ui`)**
- Single source of truth for data types
- Zod schemas for runtime validation
- Shared utilities reduce duplication

**2. Supabase for Backend**
- PostgreSQL with Row Level Security
- Built-in auth, storage, and realtime
- Reduces backend complexity

**3. App Router (Next.js 14)**
- React Server Components where beneficial
- Client components for interactivity
- Streaming and suspense support

**4. Expo Router (Mobile)**
- File-based routing like Next.js
- Deep linking support
- Type-safe navigation

## Development Workflows

### Starting Development

```bash
# Install all dependencies
pnpm install

# Start both web and mobile
pnpm dev

# Or individually
pnpm dev:web
pnpm dev:mobile
```

### Making Changes

**To shared types:**
1. Edit `packages/ui/src/types.ts`
2. Changes automatically available in both apps
3. Run `pnpm type-check` to verify

**To database schema:**
1. Update `infra/supabase/schema.sql`
2. Update `infra/supabase/policies.sql` if needed
3. Run SQL in Supabase dashboard
4. Update types in `packages/ui/src/supabase/database.types.ts`

**To UI components:**
1. Web: Add to `apps/web/src/components/`
2. Mobile: Add to `apps/mobile/src/components/` (if needed)
3. Shared logic goes in `packages/ui/src/utils/`

### Adding Dependencies

```bash
# Add to specific app
pnpm add <package> --filter=web
pnpm add <package> --filter=mobile

# Add to shared package
pnpm add <package> --filter=@memoria/ui

# Add to workspace root (build tools)
pnpm add -w <package>
```

### Running Builds

```bash
# Build all apps
pnpm build

# Build specific app
pnpm build --filter=web
```

## Code Organization

### File Naming

- **Components**: PascalCase (`MediaGrid.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Pages/Routes**: kebab-case or dynamic (`[id].tsx`)
- **Types**: Match component name or descriptive

### Component Structure

```tsx
// 1. Imports
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Media } from '@memoria/ui';

// 2. Types/Interfaces
interface MediaGridProps {
  media: Media[];
}

// 3. Component
export function MediaGrid({ media }: MediaGridProps) {
  // Hooks
  const [selected, setSelected] = useState<Media | null>(null);

  // Event handlers
  const handleSelect = (item: Media) => {
    setSelected(item);
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// 4. Styles (if using styled-components or CSS modules)
```

### State Management

**Current approach:**
- React `useState` and `useEffect` for component state
- Supabase client for data fetching
- No global state management (yet)

**Future considerations:**
- TanStack Query for server state caching
- Zustand/Jotai for client state if needed

## Database Development

### Schema Changes

1. **Write migration** in `infra/supabase/schema.sql`
2. **Update policies** in `infra/supabase/policies.sql`
3. **Test locally** in Supabase dashboard
4. **Update types** in `packages/ui/src/supabase/database.types.ts`
5. **Document** in code comments

### RLS Policy Testing

Test policies in SQL Editor:

```sql
-- Test as specific user
SELECT auth.uid(); -- Check current user

-- Test read access
SELECT * FROM public.events WHERE id = 'some-uuid';

-- Test write access
INSERT INTO public.events (...) VALUES (...);
```

### Realtime Setup

Enable realtime for tables:
1. Database > Replication
2. Enable for specific tables
3. Subscribe in client code

```tsx
const channel = supabase
  .channel('my-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'media',
  }, handleChange)
  .subscribe();
```

## Mobile-Specific Development

### Testing on Device

**iOS:**
1. Install Expo Go from App Store
2. Scan QR with Camera app
3. Or use iOS Simulator

**Android:**
1. Install Expo Go from Play Store
2. Scan QR with Expo Go app
3. Or use Android Emulator

### Upload Queue

Located in `apps/mobile/src/features/upload/queue.ts`:

- Persists uploads to AsyncStorage
- Retries on failure (max 3 times)
- TODO: Background upload task

### Deep Linking

Configured in `apps/mobile/app.json`:

```json
{
  "scheme": "memoria",
  "associatedDomains": ["applinks:memoria.app"]
}
```

Test deep links:
```bash
# iOS Simulator
xcrun simctl openurl booted memoria://e/event-id

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "memoria://e/event-id"
```

## Performance Optimization

### Web

- Use Next.js Image component for optimization
- Lazy load components with `next/dynamic`
- Use React Suspense for loading states
- Optimize bundle size with `next/bundle-analyzer`

### Mobile

- Use `FlatList` for long lists (virtualization)
- Optimize images with `expo-image`
- Lazy load screens with Expo Router
- Profile with React DevTools Profiler

## Security Best Practices

### Never Commit

- `.env` files with real credentials
- Service role keys
- API secrets

### Always

- Use environment variables for secrets
- Validate user input with Zod
- Check RLS policies thoroughly
- Sanitize user-generated content
- Use HTTPS in production

## Testing Strategy

### Current State

- Manual testing on web and mobile
- Type checking with TypeScript
- Linting with ESLint

### TODO: Add Automated Tests

- Unit tests with Vitest
- Component tests with Testing Library
- E2E tests with Playwright (web) / Detox (mobile)
- Visual regression with Chromatic

## Deployment

### Web (Vercel)

1. Push to GitHub
2. Vercel auto-deploys from `main`
3. Preview deployments for PRs
4. Set env vars in Vercel dashboard

### Mobile (EAS)

1. Configure `eas.json`
2. Run `eas build --platform ios/android`
3. Submit with `eas submit`
4. Manage with EAS dashboard

## Common Tasks

### Add a new page (Web)

```bash
# Create file
touch apps/web/app/my-page/page.tsx

# Add content
export default function MyPage() {
  return <div>My Page</div>;
}
```

### Add a new screen (Mobile)

```bash
# Create file
touch apps/mobile/app/my-screen.tsx

# Add content
export default function MyScreen() {
  return <View><Text>My Screen</Text></View>;
}
```

### Add a new shared utility

```bash
# Create file
touch packages/ui/src/utils/myUtil.ts

# Export from index
# Add to packages/ui/src/index.ts
export * from './utils/myUtil';
```

## Troubleshooting

### "Module not found" errors

```bash
pnpm clean
rm -rf node_modules
pnpm install
```

### Turborepo cache issues

```bash
rm -rf .turbo
pnpm build
```

### Type errors after schema change

1. Update `packages/ui/src/supabase/database.types.ts`
2. Run `pnpm type-check`
3. Fix any breaking changes

## Resources

- [Turborepo Handbook](https://turbo.build/repo/docs/handbook)
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## Getting Help

- Check existing issues on GitHub
- Search Supabase Discord
- Read official documentation
- Ask in team chat (if applicable)

---

Happy developing! 🚀

