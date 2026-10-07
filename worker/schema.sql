-- Ballpark scores. One row per (day, client), so resubmits are no-ops.
CREATE TABLE IF NOT EXISTS scores (
  day         INTEGER NOT NULL,
  client_hash TEXT    NOT NULL,
  ip_hash     TEXT,
  score       INTEGER NOT NULL,
  hits        INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (day, client_hash)
);

CREATE INDEX IF NOT EXISTS idx_scores_day ON scores (day);
CREATE INDEX IF NOT EXISTS idx_scores_day_ip ON scores (day, ip_hash);
