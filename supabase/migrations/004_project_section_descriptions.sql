-- Migration 004: Add description fields to projects and sections

-- Project descriptions
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS description text;

-- Section descriptions
ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS description text;
