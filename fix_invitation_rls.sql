-- Fix RLS policy to allow reading event_members by invitation token
-- This is needed for the invitation page to work

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Allow public read by invitation token" ON event_members;

-- Create policy to allow reading event_members by invitation token (unauthenticated)
CREATE POLICY "Allow public read by invitation token"
ON event_members
FOR SELECT
TO public
USING (invitation_token IS NOT NULL);

-- This allows anyone with a valid invitation token URL to see their invitation
-- They can only see the row that matches their token

