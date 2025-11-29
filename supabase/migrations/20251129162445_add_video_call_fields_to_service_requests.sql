/*
  # Add Video Call Fields to Service Requests

  1. Changes
    - Add `video_call_room_id` column to store unique video call room identifier
    - Add `video_call_status` column to track video call state (pending, active, ended)
    - Add `video_call_started_at` column to track when video call started
  
  2. Notes
    - video_call_room_id: Unique identifier for Jitsi Meet room
    - video_call_status: null (no call), 'pending' (waiting client), 'active' (in call), 'ended' (finished)
    - Only used for service_type = 'Chamada de Vídeo'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'video_call_room_id'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN video_call_room_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'video_call_status'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN video_call_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'video_call_started_at'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN video_call_started_at timestamptz;
  END IF;
END $$;