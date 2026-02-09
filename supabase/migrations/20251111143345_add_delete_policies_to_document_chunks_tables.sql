/*
  # Add DELETE policies to document_chunks tables

  1. Purpose
    - Add DELETE policies to allow team members to delete their team's document chunks
    - Required for document deletion functionality in the UI
    
  2. Changes
    - Add DELETE policy to document_chunks_strategy
    - Add DELETE policy to document_chunks_meetings
    - Add DELETE policy to document_chunks_financial
    
  3. Security
    - Users can only delete chunks belonging to their team
    - Requires authentication
    - Team membership is verified via user_metadata.team_id
*/

-- Add DELETE policy for document_chunks_strategy
CREATE POLICY "Team members can delete team strategy documents"
  ON document_chunks_strategy
  FOR DELETE
  TO authenticated
  USING (team_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'team_id'::text)::uuid);

-- Add DELETE policy for document_chunks_meetings
CREATE POLICY "Team members can delete team meeting documents"
  ON document_chunks_meetings
  FOR DELETE
  TO authenticated
  USING (team_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'team_id'::text)::uuid);

-- Add DELETE policy for document_chunks_financial
CREATE POLICY "Team members can delete team financial documents"
  ON document_chunks_financial
  FOR DELETE
  TO authenticated
  USING (team_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'team_id'::text)::uuid);
