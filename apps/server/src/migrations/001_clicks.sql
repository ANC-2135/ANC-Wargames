CREATE TABLE IF NOT EXISTS clicks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id    TEXT    NOT NULL,
  q          INTEGER NOT NULL,
  r          INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks(created_at);
