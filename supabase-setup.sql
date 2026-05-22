-- ============================================
-- FIVE A SIDE MANAGER — Supabase Setup
-- Run this in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- ============================================

-- Players table
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '⚽',
  rank INTEGER NOT NULL,
  pin TEXT DEFAULT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weeks table
CREATE TABLE weeks (
  id SERIAL PRIMARY KEY,
  week_number INTEGER NOT NULL,
  label TEXT,
  phase TEXT DEFAULT 'open' CHECK (phase IN ('open', 'locked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Confirmations table
CREATE TABLE confirmations (
  id SERIAL PRIMARY KEY,
  week_id INTEGER REFERENCES weeks(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in', 'out')),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, player_id)
);

-- Indexes
CREATE INDEX idx_confirmations_week ON confirmations(week_id);
CREATE INDEX idx_confirmations_player ON confirmations(player_id);
CREATE INDEX idx_players_rank ON players(rank);

-- ============================================
-- SEED DATA — All 18 players from the group
-- Priority order based on actual attendance
-- ============================================

INSERT INTO players (name, emoji, rank) VALUES
  ('Kyle',     '⚡', 1),
  ('Niek',     '🇳🇱', 2),
  ('Chris B',  '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 3),
  ('Nobs',     '🦉', 4),
  ('Pete',     '🎯', 5),
  ('Damion',   '💨', 6),
  ('Ethan',    '🔥', 7),
  ('Kurt',     '🎩', 8),
  ('Jr',       '👟', 9),
  ('Zolani',   '🦁', 10),
  ('Steve',    '🍔', 11),
  ('Ryan',     '🏃', 12),
  ('Mark',     '✊', 13),
  ('Danx',     '🎲', 14),
  ('Duncan',   '🤙', 15),
  ('Benito',   '🇮🇹', 16),
  ('Matthew',  '🌙', 17),
  ('Craig',    '⚽', 18);

-- Create Week 1
INSERT INTO weeks (week_number, label, phase) VALUES
  (1, 'Week 1', 'open');

-- ============================================
-- DISABLE RLS (using service role key only)
-- ============================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON weeks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON confirmations FOR ALL USING (true) WITH CHECK (true);
