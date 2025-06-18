-- Add message deletion policy
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Add comment explaining the policy
COMMENT ON POLICY "Users can delete their own messages" ON messages IS 'Allows users to delete only their own messages'; 