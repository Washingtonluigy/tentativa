/*
  # Add Payment Links to Professional Services
  
  Adds payment link functionality to professional services, allowing administrators
  to add payment links for each service. When a professional accepts a service request,
  the payment link is automatically provided to the client.
  
  ## Changes
  - Add payment_link column to professional_services table
  - Add payment_link to service_requests table (copied when request is accepted)
  - Add payment_completed flag to service_requests table
*/

-- Add payment_link to professional_services
ALTER TABLE public.professional_services 
ADD COLUMN IF NOT EXISTS payment_link text;

-- Add payment tracking to service_requests
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS payment_link text;

ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS payment_completed boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_professional_services_payment_link 
  ON public.professional_services(id) 
  WHERE payment_link IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_payment 
  ON public.service_requests(id, payment_completed);
