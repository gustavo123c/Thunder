-- -----------------------------------------------------------------------------
-- Deleting saved workouts: a post-run feedback keeps existing (it describes the
-- run), it just loses the link to the adapted workout that was generated from it.
-- Without this, deleting such a workout failed with a foreign key violation.
-- -----------------------------------------------------------------------------
alter table public.run_feedback
  drop constraint if exists run_feedback_generated_workout_id_fkey;
alter table public.run_feedback
  add constraint run_feedback_generated_workout_id_fkey
  foreign key (generated_workout_id) references public.generated_workouts (id) on delete set null;
