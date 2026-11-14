CREATE TABLE IF NOT EXISTS trainer_curriculum_progress (
    trainer_user_id uuid NOT NULL
        REFERENCES platform_users(id) ON DELETE RESTRICT,
    package_id uuid NOT NULL
        REFERENCES packages(id) ON DELETE RESTRICT,
    manifest_sha256 text NOT NULL,
    item_count integer NOT NULL CHECK(item_count > 0),
    completed_items integer NOT NULL DEFAULT 0,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (
        trainer_user_id,
        package_id,
        manifest_sha256
    ),
    CHECK (
        completed_items BETWEEN 0 AND item_count
    ),
    CHECK (
        completed_at IS NULL
        OR completed_items = item_count
    )
);