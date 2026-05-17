CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE candles_1m (
  time   TIMESTAMPTZ      NOT NULL PRIMARY KEY,
  open   DOUBLE PRECISION NOT NULL,
  high   DOUBLE PRECISION NOT NULL,
  low    DOUBLE PRECISION NOT NULL,
  close  DOUBLE PRECISION NOT NULL,
  volume DOUBLE PRECISION NOT NULL
);

SELECT create_hypertable('candles_1m', by_range('time'));

-- 1-hour rollup, refreshes hourly, keeps 2 days of coverage
CREATE MATERIALIZED VIEW candles_1h
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS time,
  first(open, time)           AS open,
  max(high)                   AS high,
  min(low)                    AS low,
  last(close, time)           AS close,
  sum(volume)                 AS volume
FROM candles_1m
GROUP BY time_bucket('1 hour', time);

SELECT add_continuous_aggregate_policy('candles_1h',
  start_offset      => INTERVAL '2 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);

-- 1-day rollup built from hourly, refreshes daily, keeps 14 days of coverage
CREATE MATERIALIZED VIEW candles_1d
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', time) AS time,
  first(open, time)          AS open,
  max(high)                  AS high,
  min(low)                   AS low,
  last(close, time)          AS close,
  sum(volume)                AS volume
FROM candles_1h
GROUP BY time_bucket('1 day', time);

SELECT add_continuous_aggregate_policy('candles_1d',
  start_offset      => INTERVAL '14 days',
  end_offset        => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'
);
