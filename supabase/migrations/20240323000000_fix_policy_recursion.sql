-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;

-- Remove the redundant foreign key from chat_members to profiles
ALTER TABLE public.chat_members
DROP CONSTRAINT IF EXISTS chat_members_user_id_fkey;

-- Fix chat policies to avoid recursion
CREATE POLICY "Users can view their chats"
ON chats FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM chat_members 
    WHERE chat_members.chat_id = chats.id 
    AND chat_members.user_id = auth.uid()
  )
);

-- Fix chat members policies to avoid recursion
CREATE POLICY "Users can view chat members"
ON chat_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM chats 
    WHERE chats.id = chat_members.chat_id 
    AND chats.created_by = auth.uid()
  )
);

-- Add a view to simplify chat member queries with profile information
CREATE OR REPLACE VIEW chat_members_with_profiles AS
SELECT 
  cm.*,
  p.full_name,
  p.avatar_url
FROM chat_members cm
JOIN profiles p ON p.id = cm.user_id;

-- Grant access to the view
GRANT SELECT ON chat_members_with_profiles TO authenticated;

-- Add comment explaining the view
COMMENT ON VIEW chat_members_with_profiles IS 'Provides chat member information with associated profile details'; 