-- Grant schema USAGE and table SELECT to authenticated role
-- RLS policies already restrict access to is_admin=true users only
-- anon gets nothing

GRANT USAGE ON SCHEMA breath_manager_v5 TO authenticated;

-- Grant SELECT on all BM5 tables to authenticated (RLS gates actual row access)
GRANT SELECT ON ALL TABLES IN SCHEMA breath_manager_v5 TO authenticated;

-- Grant UPDATE on acceptance_tests for test result recording (RLS gates to admin only)
GRANT UPDATE ON breath_manager_v5.bm5_acceptance_tests TO authenticated;

-- Do NOT grant anything to anon
REVOKE ALL ON SCHEMA breath_manager_v5 FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA breath_manager_v5 FROM anon;
