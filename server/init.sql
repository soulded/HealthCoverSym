-- HealthCoverSim database
-- Stores raw quote INPUTS only. 
-- The premium  is  recalculatedon display
CREATE TABLE IF NOT EXISTS quotes (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name             TEXT    NOT NULL,
  cover_type                TEXT    NOT NULL,  -- Single | Couple | Family
  applicant1_age            INTEGER NOT NULL,  -- 18..100
  applicant1_cover_history  TEXT    NOT NULL,  -- Yes | No | Not sure
  applicant2_age            INTEGER,           -- NULL for Single cover
  applicant2_cover_history  TEXT,              -- NULL for Single cover
  hospital_cover            TEXT    NOT NULL,  -- None | Basic | Bronze | Silver | Gold
  extras_cover              TEXT    NOT NULL,  -- None | Basic | Standard | Premium
  payment_frequency         TEXT    NOT NULL,  -- Monthly | Yearly
  annual_discount           REAL    NOT NULL DEFAULT 0,  -- 0..10 (%), used only when Yearly
  notes                     TEXT,
  created_at                TEXT    NOT NULL DEFAULT (datetime('now'))
);