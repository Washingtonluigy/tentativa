/*
  # Add Flexible Working Hours for Professionals
  
  Adds flexible working hours to professionals, allowing them to set a general
  availability window (e.g., 8:00 - 18:00) in addition to specific scheduled slots.
  
  ## Changes
  - Add flexible_schedule_enabled boolean to professionals table
  - Add flexible_start_time time field to professionals table
  - Add flexible_end_time time field to professionals table
  - These fields allow professionals to be available within a time range without
    specific appointments
*/

-- Add flexible schedule columns to professionals table
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS flexible_schedule_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flexible_start_time time DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS flexible_end_time time DEFAULT '18:00:00';

-- Create index for faster availability queries
CREATE INDEX IF NOT EXISTS idx_professionals_flexible_schedule 
  ON public.professionals(id, flexible_schedule_enabled) 
  WHERE flexible_schedule_enabled = true;
