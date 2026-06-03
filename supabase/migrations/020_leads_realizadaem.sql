-- 020: Campo realizadaem — timestamp em que a call foi marcada como realizada
alter table leads
  add column if not exists realizadaem timestamptz;
