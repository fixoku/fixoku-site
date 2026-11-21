-- R408 additive book packaging configuration.
-- No default measurements are inserted.
-- Existing orders and shipments remain untouched.

CREATE TABLE public.book_parcel_profiles_r408 (
    book_count smallint PRIMARY KEY
        CHECK (book_count BETWEEN 1 AND 10),

    package_count smallint NOT NULL DEFAULT 1
        CHECK (package_count = 1),

    width_cm numeric(10,3) NOT NULL
        CHECK (width_cm > 0 AND width_cm <= 1000),

    length_cm numeric(10,3) NOT NULL
        CHECK (length_cm > 0 AND length_cm <= 1000),

    height_cm numeric(10,3) NOT NULL
        CHECK (height_cm > 0 AND height_cm <= 1000),

    weight_kg numeric(10,3) NOT NULL
        CHECK (weight_kg > 0 AND weight_kg <= 1000),

    updated_by uuid NOT NULL
        REFERENCES public.platform_users(id)
        ON DELETE RESTRICT,

    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_dispatches
    ADD COLUMN parcel_plan_r408_json jsonb;

ALTER TABLE public.shipment_dispatches
    ADD CONSTRAINT shipment_parcel_plan_r408_object_chk
    CHECK (
        parcel_plan_r408_json IS NULL
        OR jsonb_typeof(parcel_plan_r408_json) = 'object'
    );