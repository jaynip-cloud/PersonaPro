/*
  # Add Website Data Column to Clients

  1. Changes
    - Add `website_data` JSONB column to `clients` table to store scraped website information
    - Add index for JSONB queries for better performance

  2. Purpose
    - Store structured data scraped from client websites including:
      - Company information (name, tagline, description)
      - Contact details (email, phone, address)
      - Social media links (LinkedIn, Twitter, Facebook, Instagram)
      - Detected technologies
      - Key headings and content
    - Enable quick access to client website data without re-scraping
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'website_data'
  ) THEN
    ALTER TABLE clients ADD COLUMN website_data JSONB DEFAULT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_clients_website_data 
    ON clients USING gin(website_data);
  END IF;
END $$;
