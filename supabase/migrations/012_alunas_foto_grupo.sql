-- Migration 012: foto_url e nome_grupo em alunas

ALTER TABLE alunas ADD COLUMN IF NOT EXISTS foto_url   text;
ALTER TABLE alunas ADD COLUMN IF NOT EXISTS nome_grupo text;

-- Bucket público para fotos das alunas
INSERT INTO storage.buckets (id, name, public)
VALUES ('alunas-fotos', 'alunas-fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read alunas-fotos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'alunas-fotos');

CREATE POLICY "Auth upload alunas-fotos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'alunas-fotos');

CREATE POLICY "Auth delete alunas-fotos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'alunas-fotos');
