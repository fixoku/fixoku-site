-- FIXOKU RELEASE-017P2: Keep demo indices 1..6, permit real lessons 1001..1099.
-- No progress, payment or entitlement rows are inserted, updated or deleted.
DO $fixoku_017p2$
DECLARE
  old_count integer;
  old_name text;
  old_definition text;
BEGIN
  SELECT count(*)::integer, min(conname::text), min(pg_get_constraintdef(oid))
    INTO old_count, old_name, old_definition
  FROM pg_constraint
  WHERE conrelid = to_regclass('public.trainer_video_progress')
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ~* 'video_index';

  IF old_count <> 1 OR old_definition IS NULL THEN
    RAISE EXCEPTION 'VIDEO_INDEX_CONSTRAINT_COUNT_CHANGED: %', old_count;
  END IF;
  IF old_definition !~* 'video_index\s*>=\s*1'
     OR old_definition !~* 'video_index\s*<=\s*6' THEN
    RAISE EXCEPTION 'VIDEO_INDEX_CONSTRAINT_CHANGED: %', old_definition;
  END IF;

  EXECUTE format('ALTER TABLE public.trainer_video_progress DROP CONSTRAINT %I', old_name);
  EXECUTE format('ALTER TABLE public.trainer_video_progress ADD CONSTRAINT %I CHECK ((video_index BETWEEN 1 AND 6) OR (video_index BETWEEN 1001 AND 1099))', old_name);
END
$fixoku_017p2$;
