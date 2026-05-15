-- 0001_init.down.sql
-- Reverse of 0001_init.up.sql — drop tables then extensions.

DROP TABLE IF EXISTS connected_accounts;
DROP TABLE IF EXISTS users;

DROP EXTENSION IF EXISTS postgis;
DROP EXTENSION IF EXISTS pgcrypto;
