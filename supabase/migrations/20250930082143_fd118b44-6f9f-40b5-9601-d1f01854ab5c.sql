-- Add updated_at column to conversation_analysis table if it doesn't exist
ALTER TABLE conversation_analysis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create or replace the trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_conversation_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_conversation_analysis_updated_at_trigger ON conversation_analysis;
CREATE TRIGGER update_conversation_analysis_updated_at_trigger
  BEFORE UPDATE ON conversation_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_analysis_updated_at();