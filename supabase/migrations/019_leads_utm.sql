-- 019: Campos UTM nos leads (rastreamento de campanhas)
-- utm_campaign = Campanha, utm_medium = Conjunto,
-- utm_content  = Anúncio,  utm_source = Site de origem

alter table leads
  add column if not exists utm_campaign text,
  add column if not exists utm_medium   text,
  add column if not exists utm_content  text,
  add column if not exists utm_source   text;
