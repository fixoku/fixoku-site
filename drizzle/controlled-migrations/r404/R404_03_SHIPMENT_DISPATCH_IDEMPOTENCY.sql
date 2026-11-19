BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE public.trainer_order_shipments
  ADD COLUMN IF NOT EXISTS tracking_url text;

CREATE TABLE IF NOT EXISTS public.shipment_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_kind text NOT NULL,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE RESTRICT,
  trainer_order_shipment_id uuid REFERENCES public.trainer_order_shipments(id) ON DELETE RESTRICT,
  order_kind text NOT NULL,
  order_id uuid NOT NULL,
  provider_name text NOT NULL DEFAULT 'KOLAYGELSIN',
  reference_no text NOT NULL UNIQUE,
  dispatch_status text NOT NULL DEFAULT 'NOT_READY',
  package_count integer,
  physical_items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  sender_address_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  receiver_address_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_reference text,
  provider_tracking_number text,
  provider_tracking_url text,
  barcode_reference text,
  barcode_payload text,
  provider_result_json jsonb,
  provider_status_code integer,
  last_provider_query_at timestamptz,
  cancellation_requested_at timestamptz,
  cancelled_at timestamptz,
  review_reason text,
  attempt_count integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipment_dispatches_source_chk CHECK (
    (shipment_kind='STUDENT' AND shipment_id IS NOT NULL AND trainer_order_shipment_id IS NULL AND order_kind='STUDENT_ORDER') OR
    (shipment_kind='TRAINER' AND trainer_order_shipment_id IS NOT NULL AND shipment_id IS NULL AND order_kind='TRAINER_PACKAGE_ORDER')
  ),
  CONSTRAINT shipment_dispatches_status_chk CHECK (dispatch_status IN ('NOT_READY','READY','CREATING','CREATED','HANDED_OVER','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNING','REVIEW_REQUIRED')),
  CONSTRAINT shipment_dispatches_package_count_chk CHECK (package_count IS NULL OR (package_count BETWEEN 1 AND 999)),
  CONSTRAINT shipment_dispatches_provider_chk CHECK (provider_name IN ('KOLAYGELSIN','MOCK')),
  CONSTRAINT shipment_dispatches_reference_chk CHECK (reference_no ~ '^[A-Za-z0-9._-]{1,50}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS shipment_dispatches_student_source_uq
  ON public.shipment_dispatches(shipment_id) WHERE shipment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS shipment_dispatches_trainer_source_uq
  ON public.shipment_dispatches(trainer_order_shipment_id) WHERE trainer_order_shipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS shipment_dispatches_status_idx
  ON public.shipment_dispatches(dispatch_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS shipment_dispatches_order_idx
  ON public.shipment_dispatches(order_kind, order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.shipment_dispatch_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES public.shipment_dispatches(id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL,
  operation text NOT NULL,
  result_status text NOT NULL,
  provider_status_code integer,
  provider_result_json jsonb,
  error_code text,
  idempotency_key text NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT shipment_dispatch_attempts_operation_chk CHECK (operation IN ('CREATE','TRACK','CANCEL','BARCODE','RECONCILE')),
  CONSTRAINT shipment_dispatch_attempts_result_chk CHECK (result_status IN ('SUCCEEDED','REVIEW_REQUIRED','REJECTED','REPLAYED')),
  CONSTRAINT shipment_dispatch_attempts_number_chk CHECK (attempt_number > 0)
);
CREATE INDEX IF NOT EXISTS shipment_dispatch_attempts_dispatch_idx
  ON public.shipment_dispatch_attempts(dispatch_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.shipment_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES public.shipment_dispatches(id) ON DELETE RESTRICT,
  event_key text NOT NULL,
  dispatch_status text NOT NULL,
  provider_status_id text,
  provider_status_text text,
  event_at timestamptz,
  source text NOT NULL DEFAULT 'OWNER',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipment_status_events_source_chk CHECK (source IN ('OWNER','PROVIDER','RECONCILIATION','SYSTEM')),
  CONSTRAINT shipment_status_events_status_chk CHECK (dispatch_status IN ('NOT_READY','READY','CREATING','CREATED','HANDED_OVER','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNING','REVIEW_REQUIRED')),
  CONSTRAINT shipment_status_events_unique_event UNIQUE (dispatch_id, event_key)
);

CREATE OR REPLACE FUNCTION public.shipment_dispatch_source_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE source_order uuid;
BEGIN
  IF NEW.shipment_kind='STUDENT' THEN
    SELECT s.order_id INTO source_order FROM public.shipments s WHERE s.id=NEW.shipment_id;
  ELSE
    SELECT s.order_id INTO source_order FROM public.trainer_order_shipments s WHERE s.id=NEW.trainer_order_shipment_id;
  END IF;
  IF source_order IS NULL OR source_order <> NEW.order_id THEN
    RAISE EXCEPTION 'SHIPMENT_DISPATCH_ORDER_REFERENCE_INVALID';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS shipment_dispatch_source_guard ON public.shipment_dispatches;
CREATE TRIGGER shipment_dispatch_source_guard
BEFORE INSERT OR UPDATE OF shipment_kind,shipment_id,trainer_order_shipment_id,order_id ON public.shipment_dispatches
FOR EACH ROW EXECUTE FUNCTION public.shipment_dispatch_source_guard();

COMMIT;

-- Forward-only/data-preserving repair. On an approved disposable target only,
-- disable the trigger or add a corrective index; do not delete dispatch history.
