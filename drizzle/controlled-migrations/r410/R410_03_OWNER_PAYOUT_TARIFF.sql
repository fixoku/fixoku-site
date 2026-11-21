BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- Append-only global Owner tariff versions; never silently rewrite historical amounts.
CREATE TABLE public.r410_owner_payout_tariffs (
    version integer PRIMARY KEY CHECK (version>0),
    individual_minor bigint NOT NULL CHECK(individual_minor>0 AND individual_minor<=2147483647),
    group_1_minor bigint NOT NULL CHECK(group_1_minor>0 AND group_1_minor<=2147483647),
    group_2_minor bigint NOT NULL CHECK(group_2_minor>0 AND group_2_minor<=2147483647),
    group_3_minor bigint NOT NULL CHECK(group_3_minor>0 AND group_3_minor<=2147483647),
    group_4_minor bigint NOT NULL CHECK(group_4_minor>0 AND group_4_minor<=2147483647),
    group_5_minor bigint NOT NULL CHECK(group_5_minor>0 AND group_5_minor<=2147483647),
    currency text NOT NULL DEFAULT 'TRY' CHECK(currency='TRY'),
    created_by uuid NOT NULL REFERENCES public.platform_users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.r410_payout_tariff_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
    RAISE EXCEPTION 'R410_PAYOUT_TARIFF_IMMUTABLE' USING ERRCODE='P0001';
END $$;
CREATE TRIGGER r410_payout_tariff_no_update_delete
BEFORE UPDATE OR DELETE ON public.r410_owner_payout_tariffs
FOR EACH ROW EXECUTE FUNCTION public.r410_payout_tariff_immutable();

COMMIT;
