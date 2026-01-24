-- =============================================================================
-- CBAHI Clinical Privileges - Database Initialization Script
-- This script runs when the PostgreSQL container is first created
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges to the application user
-- (The database and user are created automatically by the postgres image)

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'CBAHI Database initialized at %', NOW();
END
$$;
