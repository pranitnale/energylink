/*
  # Create saved_profiles table

  1. New Tables
    - `saved_profiles`
      - `id` (uuid, primary key)
      - `seeker_id` (uuid, foreign key to auth.users - who saved)
      - `candidate_id` (uuid, foreign key to profiles - saved profile)
      - `query_match_id` (uuid, foreign key to query_matches - snapshot source)
      - `snapshot_score` (int, frozen total score)
      - `snapshot_rationale` (text, frozen rationale)
      - `saved_at` (timestamp)

  2. Security
    - Enable RLS on saved_profiles table
    - Add policies for authenticated users to manage their own saved profiles
*/

-- Create saved_profiles table
CREATE TABLE IF NOT EXISTS saved_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  candidate_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  query_match_id uuid REFERENCES query_matches(id) ON DELETE CASCADE NOT NULL,
  snapshot_score int NOT NULL,
  snapshot_rationale text NOT NULL,
  saved_at timestamptz DEFAULT now(),
  
  -- Ensure a user can't save the same profile multiple times
  UNIQUE(seeker_id, candidate_id)
);

-- Enable RLS
ALTER TABLE saved_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for saved_profiles table
CREATE POLICY "Users can create their own saved profiles"
  ON saved_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seeker_id);

CREATE POLICY "Users can read their own saved profiles"
  ON saved_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = seeker_id);

CREATE POLICY "Users can delete their own saved profiles"
  ON saved_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seeker_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_profiles_seeker_id ON saved_profiles(seeker_id);
CREATE INDEX IF NOT EXISTS idx_saved_profiles_candidate_id ON saved_profiles(candidate_id);
CREATE INDEX IF NOT EXISTS idx_saved_profiles_saved_at ON saved_profiles(saved_at DESC);