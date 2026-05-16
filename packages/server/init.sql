CREATE TABLE IF NOT EXISTS candles_1m (
  time   TIMESTAMPTZ NOT NULL PRIMARY KEY,
  open   NUMERIC     NOT NULL,
  high   NUMERIC     NOT NULL,
  low    NUMERIC     NOT NULL,
  close  NUMERIC     NOT NULL,
  volume NUMERIC     NOT NULL
);

CREATE INDEX IF NOT EXISTS candles_1m_time_idx ON candles_1m (time DESC);
