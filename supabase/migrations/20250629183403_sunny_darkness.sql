/*
  # Create chat system tables

  1. New Tables
    - `chats`
      - `id` (uuid, primary key)
      - `is_group` (boolean, true for group chats, false for direct)
      - `created_by` (uuid, foreign key to auth.users)
      - `name` (text, optional name for group chats)
      - `created_at` (timestamp)
    
    - `chat_members`
      - `chat_id` (uuid, foreign key to chats)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - Primary key: (chat_id, user_id)
    
    - `messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key to chats)
      - `sender_id` (uuid, foreign key to auth.users, SET NULL on delete)
      - `body` (text, message content)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for chat access control
*/

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

-- Create chat_members table
CREATE TABLE IF NOT EXISTS chat_members (
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for chats table
CREATE POLICY "Users can create chats"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can read chats they are members of"
  ON chats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = chats.id 
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Chat creators can update their chats"
  ON chats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Chat creators can delete their chats"
  ON chats
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Policies for chat_members table
CREATE POLICY "Users can join chats"
  ON chat_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Anyone can be added to a chat

CREATE POLICY "Users can read chat memberships for chats they're in"
  ON chat_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members cm 
      WHERE cm.chat_id = chat_members.chat_id 
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave chats"
  ON chat_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for messages table
CREATE POLICY "Users can send messages to chats they're members of"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = messages.chat_id 
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read messages from chats they're members of"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = messages.chat_id 
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_created_by ON chats(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);