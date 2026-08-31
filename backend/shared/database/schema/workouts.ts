/**
 * GymDeck Cloud Database Schema - Workouts, Routines, Sessions & Sets
 */

import { pgTable, uuid, varchar, text, integer, numeric, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

export const workoutRoutines = pgTable(
  'workout_routines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    assignedMemberId: uuid('assigned_member_id').references(() => gymMembers.id, { onDelete: 'cascade' }),
    trainerId: uuid('trainer_id'),
    title: varchar('title', { length: 255 }).notNull(),
    dayOfWeek: varchar('day_of_week', { length: 32 }), // e.g. "Monday", "Push Day"
    estimatedDurationMinutes: integer('estimated_duration_minutes').notNull().default(45),
    targetMuscleGroups: text('target_muscle_groups'), // JSON array string e.g. ["Chest", "Triceps"]
    isTemplate: boolean('is_template').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberRoutinesIdx: index('idx_routines_gym_member').on(table.gymId, table.assignedMemberId),
  })
);

export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    routineId: uuid('routine_id')
      .notNull()
      .references(() => workoutRoutines.id, { onDelete: 'cascade' }),
    exerciseOrder: integer('exercise_order').notNull().default(1),
    name: varchar('name', { length: 255 }).notNull(),
    targetMuscle: varchar('target_muscle', { length: 128 }).notNull(),
    targetSets: integer('target_sets').notNull().default(3),
    targetReps: varchar('target_reps', { length: 64 }).notNull().default('10-12'),
    suggestedWeightKg: numeric('suggested_weight_kg', { precision: 6, scale: 2 }),
    restSeconds: integer('rest_seconds').notNull().default(60),
    instructions: text('instructions'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    routineExerciseIdx: index('idx_exercises_routine_order').on(table.routineId, table.exerciseOrder),
  })
);

export const workoutSessions = pgTable(
  'workout_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    routineId: uuid('routine_id').references(() => workoutRoutines.id, { onDelete: 'set null' }),
    sessionName: varchar('session_name', { length: 255 }).notNull(),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }),
    durationMinutes: integer('duration_minutes'),
    totalVolumeKg: numeric('total_volume_kg', { precision: 10, scale: 2 }).default('0'),
    completedSetsCount: integer('completed_sets_count').default(0),
    status: varchar('status', { length: 32 }).notNull().default('IN_PROGRESS'), // IN_PROGRESS, COMPLETED, ABANDONED
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberSessionIdx: index('idx_sessions_gym_member').on(table.gymId, table.memberId, table.startTime),
    idempotencyIdx: uniqueIndex('idx_sessions_idempotency').on(table.idempotencyKey),
  })
);

export const workoutLoggedSets = pgTable(
  'workout_logged_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id'),
    exerciseName: varchar('exercise_name', { length: 255 }).notNull(),
    setNumber: integer('set_number').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2 }).notNull().default('0'),
    repsCompleted: integer('reps_completed').notNull().default(0),
    isCompleted: boolean('is_completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionSetsIdx: index('idx_logged_sets_session').on(table.sessionId, table.setNumber),
  })
);

export type WorkoutRoutine = typeof workoutRoutines.$inferSelect;
export type NewWorkoutRoutine = typeof workoutRoutines.$inferInsert;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;
export type WorkoutLoggedSet = typeof workoutLoggedSets.$inferSelect;
export type NewWorkoutLoggedSet = typeof workoutLoggedSets.$inferInsert;
