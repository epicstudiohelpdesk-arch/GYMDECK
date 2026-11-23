-- 0011_scoped_webhook_event_uniqueness.sql
-- Additive: scope delivery-event dedupe to (provider, provider instance, event id).
-- Historical rows are PRESERVED: colliding legacy event ids are namespaced with
-- the row id before the narrower unique index is created.
ALTER TABLE email_delivery_events
  ADD COLUMN IF NOT EXISTS provider VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN';

UPDATE email_delivery_events
  SET provider_instance_id = 'default'
  WHERE provider_instance_id IS NULL;

-- Namespace duplicate historical ids within each scoped key, keeping every row.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY provider, COALESCE(provider_instance_id, 'default'), provider_event_id
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM email_delivery_events
)
UPDATE email_delivery_events e
  SET provider_event_id = substr(e.provider_event_id, 1, 110) || '_dup_' || e.id::text
  FROM ranked r
  WHERE e.id = r.id AND r.rn > 1;

ALTER TABLE email_delivery_events DROP CONSTRAINT IF EXISTS uq_provider_event_id;
DROP INDEX IF EXISTS uq_provider_event_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_scoped_provider_event_id
  ON email_delivery_events (provider, COALESCE(provider_instance_id, 'default'), provider_event_id);
