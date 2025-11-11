/*
  # Fix Security and Performance Issues
  
  This migration addresses multiple security and performance issues identified in the database:
  
  ## 1. Foreign Key Indexes
  - Creates indexes for all foreign key columns that don't have covering indexes
  - Improves query performance for JOIN operations and foreign key lookups
  
  ## 2. Auth RLS Performance
  - Optimizes RLS policies by wrapping auth functions in SELECT subqueries
  - Prevents re-evaluation of auth functions for each row
  
  ## 3. Multiple Permissive Policies
  - Consolidates duplicate policies to avoid conflicts
  
  ## 4. Function Search Path
  - Fixes search_path for function to be immutable
  
  ## 5. Unused Indexes
  - Removes unused indexes to reduce storage overhead and improve write performance
*/

-- =====================================================
-- 1. CREATE MISSING FOREIGN KEY INDEXES
-- =====================================================

-- admin_messages table
CREATE INDEX IF NOT EXISTS idx_admin_messages_client_id 
  ON public.admin_messages(client_id);

-- appointments table
CREATE INDEX IF NOT EXISTS idx_appointments_client_id 
  ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id 
  ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_request_id 
  ON public.appointments(request_id);

-- categories table
CREATE INDEX IF NOT EXISTS idx_categories_created_by 
  ON public.categories(created_by);

-- conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_client_id 
  ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_professional_id 
  ON public.conversations(professional_id);
CREATE INDEX IF NOT EXISTS idx_conversations_request_id 
  ON public.conversations(request_id);

-- messages table
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
  ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
  ON public.messages(sender_id);

-- plans table
CREATE INDEX IF NOT EXISTS idx_plans_created_by 
  ON public.plans(created_by);

-- professional_applications table
CREATE INDEX IF NOT EXISTS idx_professional_applications_reviewed_by 
  ON public.professional_applications(reviewed_by);

-- professionals table
CREATE INDEX IF NOT EXISTS idx_professionals_category_id 
  ON public.professionals(category_id);
CREATE INDEX IF NOT EXISTS idx_professionals_user_id 
  ON public.professionals(user_id);

-- profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
  ON public.profiles(user_id);

-- scheduled_appointments table
CREATE INDEX IF NOT EXISTS idx_scheduled_appointments_service_request_id 
  ON public.scheduled_appointments(service_request_id);

-- service_requests table
CREATE INDEX IF NOT EXISTS idx_service_requests_client_id 
  ON public.service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_professional_id 
  ON public.service_requests(professional_id);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_service_locations_timestamp;
DROP INDEX IF EXISTS idx_scheduled_appointments_client;
DROP INDEX IF EXISTS idx_scheduled_appointments_date;
DROP INDEX IF EXISTS idx_professional_services_active;
DROP INDEX IF EXISTS idx_service_locations_request_id;
DROP INDEX IF EXISTS idx_service_locations_user_id;
DROP INDEX IF EXISTS idx_service_locations_active;

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - scheduled_appointments
-- =====================================================

DROP POLICY IF EXISTS "Professional or client can update their scheduled appointments" 
  ON public.scheduled_appointments;

CREATE POLICY "Professional or client can update their scheduled appointments"
  ON public.scheduled_appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = scheduled_appointments.service_request_id
      AND (sr.client_id = (SELECT auth.uid()) OR sr.professional_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = scheduled_appointments.service_request_id
      AND (sr.client_id = (SELECT auth.uid()) OR sr.professional_id = (SELECT auth.uid()))
    )
  );

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - professional_services
-- =====================================================

-- Drop duplicate permissive policies
DROP POLICY IF EXISTS "Allow anon to read professional_services" 
  ON public.professional_services;

-- Recreate optimized policies
DROP POLICY IF EXISTS "Professionals can view own services" 
  ON public.professional_services;
DROP POLICY IF EXISTS "Professionals can create own services" 
  ON public.professional_services;
DROP POLICY IF EXISTS "Professionals can update own services" 
  ON public.professional_services;
DROP POLICY IF EXISTS "Professionals can delete own services" 
  ON public.professional_services;

CREATE POLICY "Professionals can view own services"
  ON public.professional_services
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = professional_services.professional_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Professionals can create own services"
  ON public.professional_services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = professional_services.professional_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Professionals can update own services"
  ON public.professional_services
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = professional_services.professional_id
      AND p.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = professional_services.professional_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Professionals can delete own services"
  ON public.professional_services
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = professional_services.professional_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- 5. FIX FUNCTION SEARCH PATH
-- =====================================================

DROP FUNCTION IF EXISTS public.update_service_locations_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_service_locations_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Recreate trigger if it existed
DROP TRIGGER IF EXISTS update_service_locations_updated_at_trigger 
  ON public.service_locations;

CREATE TRIGGER update_service_locations_updated_at_trigger
  BEFORE UPDATE ON public.service_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_service_locations_updated_at();
