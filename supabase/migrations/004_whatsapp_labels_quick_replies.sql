-- Migration 004: labels, lead_labels, quick_replies

-- Labels (etiquetas de conversa/lead)
CREATE TABLE IF NOT EXISTS labels (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      TEXT NOT NULL,
  cor       TEXT NOT NULL DEFAULT '#CE9221',
  criadoem  TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: lead ↔ label (many-to-many)
CREATE TABLE IF NOT EXISTS lead_labels (
  lead_id   UUID REFERENCES leads(id) ON DELETE CASCADE,
  label_id  UUID REFERENCES labels(id) ON DELETE CASCADE,
  criadoem  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lead_id, label_id)
);

-- Respostas rápidas (/ trigger no chat)
CREATE TABLE IF NOT EXISTS quick_replies (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo    TEXT NOT NULL,
  texto     TEXT NOT NULL,
  criadoem  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE labels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_labels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- service_role bypass (app usa service_role key)
CREATE POLICY "labels_service_all"        ON labels        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "lead_labels_service_all"   ON lead_labels   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "quick_replies_service_all" ON quick_replies FOR ALL TO service_role USING (true) WITH CHECK (true);
