ALTER TABLE flows ADD COLUMN quota_id TEXT NOT NULL DEFAULT '';
UPDATE flows SET quota_id = lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-8' || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)));
CREATE UNIQUE INDEX flows_quota_id ON flows(quota_id);
-- Only a hash identifies the license here. Credentials are never written to this ledger.
-- pending=1 is a durable release intent; pid protects an in-flight create from another manager process.
CREATE TABLE rpa_licenses (resource TEXT NOT NULL, license TEXT NOT NULL, pending INTEGER NOT NULL, pid INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(resource, license));
