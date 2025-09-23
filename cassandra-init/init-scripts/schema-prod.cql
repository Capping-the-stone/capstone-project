-- Keyspace for production (single DC, RF=3)
CREATE KEYSPACE IF NOT EXISTS capstone
WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 3
} AND durable_writes = true;

-- Single table to store all logs (no day buckets)
CREATE TABLE IF NOT EXISTS capstone.logs_by_student_question (
  srn text,
  question_id int,
  ts_ms bigint,
  event_id text,
  type text,
  content text,
  code text,
  offset int,
  num_characters int,
  is_paste boolean,
  PRIMARY KEY ((srn, question_id), ts_ms, event_id)
) WITH CLUSTERING ORDER BY (ts_ms ASC, event_id ASC)
  AND compaction = {
    'class': 'SizeTieredCompactionStrategy'
  }
  AND compression = {'sstable_compression': 'LZ4Compressor'};




