-- ============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) SETUP FOR HOSPITAL DASHBOARD
-- ============================================================================
-- 
-- This script sets up all necessary RLS policies for the reports and case_requests tables.
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it.
--
-- WARNING: If policies with these names already exist, they will be recreated.
-- ============================================================================

-- ============================================================================
-- PART 1: ENABLE RLS ON REPORTS TABLE
-- ============================================================================

-- Check current RLS statu