/*
  # Fix Anonymous Access Policies

  1. Changes
    - Drop and recreate all anon policies with explicit permissions
    - Ensure anon role can read all necessary tables for authentication and admin panel

  2. Security
    - Maintains RLS enabled
    - Allows read access for authentication flow
    - Allows write access for registration
*/

-- Drop existing anon policies
DROP POLICY IF EXISTS "Allow anon to read users" ON users;
DROP POLICY IF EXISTS "Allow anon to insert users" ON users;
DROP POLICY IF EXISTS "Allow anon to read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow anon to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow anon to update profiles" ON profiles;
DROP POLICY IF EXISTS "Allow anon to read categories" ON categories;
DROP POLICY IF EXISTS "Allow anon to insert categories" ON categories;
DROP POLICY IF EXISTS "Allow anon to update categories" ON categories;
DROP POLICY IF EXISTS "Allow anon to delete categories" ON categories;
DROP POLICY IF EXISTS "Allow anon to read professionals" ON professionals;
DROP POLICY IF EXISTS "Allow anon to insert professionals" ON professionals;
DROP POLICY IF EXISTS "Allow anon to update professionals" ON professionals;
DROP POLICY IF EXISTS "Allow anon to delete professionals" ON professionals;

-- Recreate policies with explicit access
CREATE POLICY "Enable read access for anon users"
  ON users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Enable insert access for anon users"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable read access for anon profiles"
  ON profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Enable insert access for anon profiles"
  ON profiles FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable update access for anon profiles"
  ON profiles FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for anon categories"
  ON categories FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Enable insert access for anon categories"
  ON categories FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable update access for anon categories"
  ON categories FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for anon categories"
  ON categories FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Enable read access for anon professionals"
  ON professionals FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Enable insert access for anon professionals"
  ON professionals FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable update access for anon professionals"
  ON professionals FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for anon professionals"
  ON professionals FOR DELETE
  TO anon
  USING (true);
