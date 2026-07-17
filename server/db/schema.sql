CREATE TABLE IF NOT EXISTS bots (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  weapon_class TEXT NOT NULL,
  weight_lb    INTEGER,
  wins         INTEGER DEFAULT 0,
  losses       INTEGER DEFAULT 0,
  ko_wins      INTEGER DEFAULT 0,
  seasons      TEXT,
  url          TEXT
);

CREATE TABLE IF NOT EXISTS fights (
  id      SERIAL PRIMARY KEY,
  season  TEXT,
  bot_a   TEXT NOT NULL,
  bot_b   TEXT NOT NULL,
  winner  TEXT,
  method  TEXT
);

CREATE TABLE IF NOT EXISTS weapon_meta (
  weapon_class TEXT PRIMARY KEY,
  bot_count    INTEGER,
  win_rate     REAL,
  ko_rate      REAL,
  avg_wins     REAL
);
