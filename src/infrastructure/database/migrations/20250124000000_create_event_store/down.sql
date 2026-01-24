-- Rollback: Drop indexes
DROP INDEX IF EXISTS idx_event_store_aggregate_type;
DROP INDEX IF EXISTS idx_event_store_event_type;
DROP INDEX IF EXISTS idx_event_store_created_at;
DROP INDEX IF EXISTS idx_event_store_aggregate_id;

-- Rollback: Drop table
DROP TABLE IF EXISTS event_store;
