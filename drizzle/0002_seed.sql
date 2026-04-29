-- Campaign templates -----------------------------------------------------------

insert into campaign_templates (id, name_i18n, description_i18n, default_reward_type, config_schema)
values
  ('passport',
   '{"pt-BR":"Passaporte","es-UY":"Pasaporte","en":"Passport"}'::jsonb,
   '{"pt-BR":"Selos em várias lojas, sorteio no fim","es-UY":"Sellos en varias tiendas, sorteo al final","en":"Stamps across multiple stores, raffle at end"}'::jsonb,
   'raffle',
   '{"type":"object","required":["stamps_required","prize"],"properties":{"stamps_required":{"type":"integer","minimum":1},"prize":{"type":"string"}}}'::jsonb),
  ('cartao_fidelidade',
   '{"pt-BR":"Cartão Fidelidade","es-UY":"Tarjeta Fidelidad","en":"Loyalty Card"}'::jsonb,
   '{"pt-BR":"Cartão de visitas com prêmio individual","es-UY":"Tarjeta de visitas con premio individual","en":"Visit-based card with individual reward"}'::jsonb,
   'individual',
   '{"type":"object","required":["threshold","prize"],"properties":{"threshold":{"type":"integer","minimum":2},"prize":{"type":"string"},"auto_renew":{"type":"boolean","default":true}}}'::jsonb),
  ('sorteio',
   '{"pt-BR":"Sorteio","es-UY":"Sorteo","en":"Raffle"}'::jsonb,
   '{"pt-BR":"Compre & ganhe — uma entrada por visita","es-UY":"Compre y gane — una entrada por visita","en":"Visit-based raffle"}'::jsonb,
   'raffle',
   '{"type":"object","required":["entries_per_day","prize"],"properties":{"entries_per_day":{"type":"integer","minimum":1,"default":1},"prize":{"type":"string"}}}'::jsonb)
on conflict (id) do update set
  name_i18n = excluded.name_i18n,
  description_i18n = excluded.description_i18n,
  default_reward_type = excluded.default_reward_type,
  config_schema = excluded.config_schema;

-- Launch tenant: CDL Jaguarão ---------------------------------------------------

insert into associations (slug, name, city, state, country, locale_default, locales_enabled, brand)
values (
  'cdljaguarao',
  'CDL Jaguarão',
  'Jaguarão',
  'RS',
  'BR',
  'pt-BR',
  ARRAY['pt-BR','es-UY']::text[],
  '{"primary_color":"#1d3a8c","accent_color":"#f59e0b","logo_url":null}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  city = excluded.city,
  state = excluded.state,
  brand = excluded.brand;
