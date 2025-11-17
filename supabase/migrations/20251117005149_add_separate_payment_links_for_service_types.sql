/*
  # Add Separate Payment Links for Service Types
  
  Adds individual payment link columns for each service type (message, video, local).
  This allows administrators to configure different payment links for each modality
  since they have different prices.
  
  ## Changes
  - Add payment_link_message column to professional_services
  - Add payment_link_video column to professional_services
  - Add payment_link_local column to professional_services
  - Remove old single payment_link column
*/

-- Add individual payment link columns
ALTER TABLE public.professional_services 
ADD COLUMN IF NOT EXISTS payment_link_message text,
ADD COLUMN IF NOT EXISTS payment_link_video text,
ADD COLUMN IF NOT EXISTS payment_link_local text;

-- Migrate existing data from old payment_link column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professional_services' 
    AND column_name = 'payment_link'
  ) THEN
    -- Copy old payment_link to all three new columns for backward compatibility
    UPDATE public.professional_services 
    SET 
      payment_link_message = COALESCE(payment_link_message, payment_link),
      payment_link_video = COALESCE(payment_link_video, payment_link),
      payment_link_local = COALESCE(payment_link_local, payment_link)
    WHERE payment_link IS NOT NULL;
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_professional_services_payment_link_message 
  ON public.professional_services(id) 
  WHERE payment_link_message IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_professional_services_payment_link_video 
  ON public.professional_services(id) 
  WHERE payment_link_video IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_professional_services_payment_link_local 
  ON public.professional_services(id) 
  WHERE payment_link_local IS NOT NULL;
