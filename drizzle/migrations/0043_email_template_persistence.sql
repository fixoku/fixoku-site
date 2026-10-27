-- R97E-2: Owner-managed email template drafts, immutable published revisions,
-- revision audit history, and outbox render snapshots.

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  published_revision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  CONSTRAINT email_templates_key_chk CHECK (template_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT email_templates_category_chk CHECK (length(category) between 1 and 40)
);

CREATE TABLE IF NOT EXISTS email_template_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE RESTRICT,
  revision_number integer NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  display_name text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text NOT NULL,
  variable_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  published_at timestamptz,
  CONSTRAINT email_template_revisions_status_chk CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  CONSTRAINT email_template_revisions_number_chk CHECK (revision_number > 0),
  CONSTRAINT email_template_revisions_subject_chk CHECK (length(trim(subject)) between 1 and 240),
  CONSTRAINT email_template_revisions_text_chk CHECK (length(text_body) between 1 and 20000),
  CONSTRAINT email_template_revisions_unique_number UNIQUE (template_id, revision_number)
);

ALTER TABLE email_templates
  ADD CONSTRAINT email_templates_published_revision_fk
  FOREIGN KEY (published_revision_id) REFERENCES email_template_revisions(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS email_template_revisions_one_published
  ON email_template_revisions(template_id) WHERE status = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS email_template_revisions_history_idx
  ON email_template_revisions(template_id, revision_number DESC);

CREATE TABLE IF NOT EXISTS email_template_revision_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE RESTRICT,
  revision_id uuid NOT NULL REFERENCES email_template_revisions(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  previous_status text,
  next_status text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_template_revision_events_action_chk CHECK (action IN ('SEEDED','DRAFT_CREATED','DRAFT_SAVED','PUBLISHED','ACTIVATED','DEACTIVATED','REVERTED'))
);
CREATE INDEX IF NOT EXISTS email_template_revision_events_history_idx
  ON email_template_revision_events(template_id, created_at DESC, id);

ALTER TABLE notification_email_outbox
  ADD COLUMN IF NOT EXISTS template_revision_id uuid REFERENCES email_template_revisions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS render_snapshot_json jsonb;
CREATE INDEX IF NOT EXISTS notification_email_outbox_template_revision_idx
  ON notification_email_outbox(template_revision_id);
