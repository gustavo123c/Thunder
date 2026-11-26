-- =============================================================================
-- Anatomical body map: more regions (trapezius, biceps, triceps, forearm,
-- obliques). Idempotent: safe to run more than once.
-- =============================================================================

alter table public.pain_logs drop constraint if exists pain_logs_region_check;

alter table public.pain_logs add constraint pain_logs_region_check check (region in (
  'neck', 'trapezius', 'shoulder', 'upper_back', 'chest', 'biceps', 'triceps', 'elbow',
  'forearm', 'wrist', 'lower_back', 'abdomen', 'obliques', 'hip', 'glute', 'groin',
  'quadriceps', 'hamstring', 'knee', 'shin', 'calf', 'ankle', 'achilles', 'foot'));
