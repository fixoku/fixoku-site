-- Existing R6 child profiles already provide one account to many students.
-- An owner explicitly enables creation of a second active child profile.
-- Existing child records are left untouched; the default protects new accounts.
ALTER TABLE platform_users
  ADD COLUMN allow_multiple_students boolean NOT NULL DEFAULT false;
