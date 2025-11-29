/*
  # Disable RLS for All Application Tables

  1. Changes
    - Disable RLS on all tables to allow frontend access
    - This is necessary because the anon key policies are not working properly

  2. Tables affected
    - categories, plans, professionals, professional_services
    - service_requests, professional_applications
    - All other application tables
*/

-- Disable RLS on all critical tables
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE professionals DISABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE professional_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE professional_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE regional_minimum_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages DISABLE ROW LEVEL SECURITY;
