/*
  # Add Security Questions for Password Recovery

  1. Changes
    - Add security question fields to users table:
      - `security_question_1` (text) - First security question
      - `security_answer_1` (text) - Answer to first question
      - `security_question_2` (text) - Second security question  
      - `security_answer_2` (text) - Answer to second question
      - `security_question_3` (text) - Third security question
      - `security_answer_3` (text) - Answer to third question
  
  2. Security
    - Answers are stored as plain text (will be compared case-insensitively in app)
    - Users need to answer at least 2 out of 3 questions correctly to recover password
  
  3. Notes
    - Questions are chosen by user during registration
    - Common questions: mother's maiden name, first pet, city of birth, etc.
*/

DO $$
BEGIN
  -- Add security question 1
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'security_question_1'
  ) THEN
    ALTER TABLE users ADD COLUMN security_question_1 text;
  END IF;

  -- Add security answer 1
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'security_answer_1'
  ) THEN
    ALTER TABLE users ADD COLUMN security_answer_1 text;
  END IF;

  -- Add security question 2
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'security_question_2'
  ) THEN
    ALTER TABLE users ADD COLUMN security_question_2 text;
  END IF;

  -- Add security answer 2
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'security_answer_2'
  ) THEN
    ALTER TABLE users ADD COLUMN security_answer_2 text;
  END IF;

  -- Add security question 3
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'security_question_3'
  ) THEN
    ALTER TABLE users ADD COLUMN security_question_3 text;
  END IF;

  -- Add security answer 3
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'security_answer_3'
  ) THEN
    ALTER TABLE users ADD COLUMN security_answer_3 text;
  END IF;
END $$;