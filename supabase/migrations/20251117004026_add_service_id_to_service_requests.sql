/*
  # Add Service ID to Service Requests
  
  Links service requests to the specific professional service that was requested.
  This allows us to retrieve the payment link when the request is accepted.
  
  ## Changes
  - Add professional_service_id column to service_requests
  - Add foreign key constraint to professional_services
*/

-- Add professional_service_id to service_requests
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS professional_service_id uuid;

-- Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'service_requests_professional_service_id_fkey'
    AND table_name = 'service_requests'
  ) THEN
    ALTER TABLE public.service_requests
    ADD CONSTRAINT service_requests_professional_service_id_fkey
    FOREIGN KEY (professional_service_id)
    REFERENCES public.professional_services(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_requests_professional_service_id 
  ON public.service_requests(professional_service_id);
