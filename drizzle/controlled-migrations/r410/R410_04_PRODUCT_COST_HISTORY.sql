BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE TABLE public.r410_product_cost_versions (
 product_id uuid NOT NULL REFERENCES public.physical_products(id) ON DELETE RESTRICT,
 version integer NOT NULL CHECK(version>0),
 unit_cost_minor bigint NOT NULL CHECK(unit_cost_minor>=0 AND unit_cost_minor<=2147483647),
 currency text NOT NULL CHECK(currency='TRY'),
 zero_cost_confirmed boolean NOT NULL DEFAULT false,
 note text CHECK(char_length(note)<=500),
 created_by uuid NOT NULL REFERENCES public.platform_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(product_id,version),
 CHECK(unit_cost_minor>0 OR zero_cost_confirmed)
);
CREATE TABLE public.r410_order_product_cost_snapshots (
 order_kind text NOT NULL CHECK(order_kind IN ('STUDENT_ORDER','TRAINER_PACKAGE_ORDER')),
 order_id uuid NOT NULL,
 order_item_id uuid NOT NULL,
 product_id uuid NOT NULL REFERENCES public.physical_products(id) ON DELETE RESTRICT,
 cost_version integer NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99),
 unit_cost_minor bigint NOT NULL CHECK(unit_cost_minor>=0),
 total_cost_minor bigint NOT NULL CHECK(total_cost_minor=quantity*unit_cost_minor),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(order_kind,order_item_id,product_id),
 FOREIGN KEY(product_id,cost_version) REFERENCES public.r410_product_cost_versions(product_id,version) ON DELETE RESTRICT
);
CREATE OR REPLACE FUNCTION public.r410_cost_append_only_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'R410_COST_HISTORY_IMMUTABLE' USING ERRCODE='P0001'; END;$$;
CREATE TRIGGER r410_cost_versions_no_change BEFORE UPDATE OR DELETE ON public.r410_product_cost_versions FOR EACH ROW EXECUTE FUNCTION public.r410_cost_append_only_guard();
CREATE TRIGGER r410_cost_snapshots_no_change BEFORE UPDATE OR DELETE ON public.r410_order_product_cost_snapshots FOR EACH ROW EXECUTE FUNCTION public.r410_cost_append_only_guard();
COMMIT;
