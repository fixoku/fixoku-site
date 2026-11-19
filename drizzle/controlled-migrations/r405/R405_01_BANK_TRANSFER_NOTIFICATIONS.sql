-- R405: bank transfer notification is the atomic boundary for new bank orders.
-- Apply only through the reviewed R405 controlled migration procedure.

CREATE TABLE IF NOT EXISTS public.student_bank_transfer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  buyer_user_id uuid NOT NULL REFERENCES public.platform_users(id) ON DELETE RESTRICT,
  status public.bank_transfer_status NOT NULL DEFAULT 'SUBMITTED',
  payer_name text NOT NULL,
  bank_name text NOT NULL,
  reported_amount_minor integer NOT NULL,
  currency text NOT NULL,
  transfer_date date NOT NULL,
  reference text NOT NULL,
  review_note text,
  reviewed_by uuid REFERENCES public.platform_users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_bank_transfer_notifications_amount_chk CHECK (reported_amount_minor > 0),
  CONSTRAINT student_bank_transfer_notifications_currency_chk CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT student_bank_transfer_notifications_reference_chk CHECK (char_length(btrim(reference)) BETWEEN 3 AND 160)
);

CREATE INDEX IF NOT EXISTS student_bank_transfer_notifications_status_idx
  ON public.student_bank_transfer_notifications(status, submitted_at);

CREATE INDEX IF NOT EXISTS student_bank_transfer_notifications_buyer_idx
  ON public.student_bank_transfer_notifications(buyer_user_id, submitted_at DESC);

-- Receipt references remain historical data on trainer notifications. R405
-- does not copy, require, or expose that legacy field in new user forms.
