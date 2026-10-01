-- Migration: add source and verdict columns to scans table
-- Run this against your Supabase project if it was created before this migration.

ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'text'
    CHECK (source IN ('text', 'document')),
  ADD COLUMN IF NOT EXISTS verdict text
    CHECK (verdict IN ('safe', 'redact_first', 'do_not_upload'));
