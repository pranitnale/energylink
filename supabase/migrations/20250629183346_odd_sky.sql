/*
  # Create queries and query_matches tables

  1. New Tables
    - `queries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `query_text` (text, the natural language query)
      - `structured_payload` (jsonb, parsed query fields)
      - `created_at` (timestamp)
    
    - `query_matches`
      - `id` (uuid, primary key)
      - `query_id` (uuid, foreign key to queries, unique)
      - `matches` (jsonb, array of match objects with scores)
      - `top_scores` (int[], parallel array of scores for quick sorting)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own queries
*/

-- Create queries table
CREATE TABLE IF NOT EXISTS queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query_text text NOT NULL,
  structured_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create query_matches table
CREATE TABLE IF NOT EXISTS query_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid REFERENCES queries(id) ON DELETE CASCADE UNIQUE NOT NULL,
  matches jsonb NOT NULL DEFAULT '[]',
  top_scores int[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_matches ENABLE ROW LEVEL SECURITY;

-- Policies for queries table
CREATE POLICY "Users can create their own queries"
  ON queries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own queries"
  ON queries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own queries"
  ON queries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queries"
  ON queries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for query_matches table
CREATE POLICY "Users can read query matches for their queries"
  ON query_matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM queries 
      WHERE queries.id = query_matches.query_id 
      AND queries.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage query matches"
  ON query_matches
  FOR ALL
  TO service_role
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_matches_query_id ON query_matches(query_id);
CREATE INDEX IF NOT EXISTS idx_query_matches_top_scores ON query_matches USING GIN(top_scores);