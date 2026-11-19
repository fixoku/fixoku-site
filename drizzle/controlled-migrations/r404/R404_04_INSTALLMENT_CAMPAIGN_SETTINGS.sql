BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE IF NOT EXISTS public.installment_campaign_settings (
  id integer PRIMARY KEY DEFAULT 1,
  campaign_text text NOT NULL DEFAULT 'Tüm Kredi Kartlarınıza Vade Farksız 2 Taksit',
  active boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT 'green',
  updated_by uuid REFERENCES public.platform_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT installment_campaign_singleton_chk CHECK (id=1),
  CONSTRAINT installment_campaign_text_chk CHECK (char_length(btrim(campaign_text)) BETWEEN 3 AND 180 AND campaign_text !~ '[<>[:cntrl:]]'),
  CONSTRAINT installment_campaign_color_chk CHECK (color IN ('green','blue','peach','purple'))
);

INSERT INTO public.installment_campaign_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
COMMIT;

-- Forward-only/data-preserving. Disable the feature flag or correct the row on
-- an approved target; never delete campaign history or payment records.
