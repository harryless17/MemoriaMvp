# Memoria Supabase Infrastructure

This directory contains SQL scripts to set up the Memoria database schema, Row Level Security policies, and optional seed data.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be provisioned
4. Note your project URL and anon key from Settings > API

### 2. Run SQL Scripts

Navigate to the SQL Editor in your Supabase dashboard and run the scripts in this order:

#### Step 1: Create Schema
```sql
-- Copy and paste contents of schema.sql
-- This creates all tables and indexes
```

#### Step 2: Enable RLS and Create Policies
```sql
-- Copy and paste contents of policies.sql
-- This enables Row Level Security and creates all policies
```

#### Step 3: (Optional) Seed Data
```sql
-- Copy and paste contents of seed.sql
-- This adds sample data for testing
```

### 3. Create Storage Bucket

1. Navigate to Storage in Supabase dashboard
2. Create a new bucket named `media`
3. Set it to **Public** (or manage access via policies)
4. Configure the following policies:

**Public Read Access:**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');
```

**Authenticated Upload to Own Folder:**
```sql
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Update Own Files:**
```sql
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Delete Own Files:**
```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. Enable Realtime (Optional but Recommended)

For live updates on comments and likes:

1. Navigate to Database > Replication
2. Enable replication for these tables:
   - `media`
   - `comments`
   - `likes`

### 5. Configure Authentication

1. Navigate to Authentication > Settings
2. Enable Email provider
3. Enable Google OAuth (optional):
   - Add Google OAuth credentials
   - Configure redirect URLs

### 6. Environment Variables

Copy these values to your app `.env` files:

**For Web (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Mobile (`apps/mobile/.env`):**
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

### Tables

- **profiles**: User profiles (1:1 with auth.users)
- **events**: Event information with visibility settings
- **event_attendees**: Event membership (many-to-many)
- **media**: Photos and videos with references to events
- **likes**: User likes on media
- **comments**: User comments on media

### Key Features

- **Row Level Security (RLS)**: All tables have RLS enabled
- **Public/Private Events**: Events can be public or private
- **Membership-based Access**: Private events only accessible to members
- **Cascading Deletes**: Related data is cleaned up automatically
- **Indexes**: Optimized for common query patterns

## Troubleshooting

### Issue: "permission denied for table"
- Ensure RLS policies are created correctly
- Check if user is authenticated
- Verify the policy logic matches your use case

### Issue: "relation does not exist"
- Run schema.sql first
- Check if migrations completed successfully

### Issue: Storage upload fails
- Verify bucket "media" exists
- Check storage policies are created
- Ensure file size is within limits

### Issue: Realtime not working
- Enable replication for tables in Database > Replication
- Check that client is subscribed to the correct channel
- Verify RLS policies allow reading the data

## Security Notes

- Never commit `.env` files with real credentials
- Use service role key only for admin operations (not in client apps)
- Review RLS policies before production deployment
- Consider implementing rate limiting for uploads
- Add file type validation for media uploads
- Implement content moderation for user-generated content

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Documentation](https://supabase.com/docs/guides/storage)
- [Realtime Documentation](https://supabase.com/docs/guides/realtime)

