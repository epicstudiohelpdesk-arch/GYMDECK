/**
 * GymDeck Owner Mobile - Migration Registry
 */

import { Migration } from './types';
import { v1InitialSchema } from './v1_initial_schema';
import { v2OutboxAndSyncMetadata } from './v2_outbox_and_sync_metadata';
import { v3TrainerAssignments } from './v3_trainer_assignments';

export * from './types';
export * from './runner';
export { v1InitialSchema, v2OutboxAndSyncMetadata, v3TrainerAssignments };

export const ALL_MIGRATIONS: Migration[] = [
  v1InitialSchema,
  v2OutboxAndSyncMetadata,
  v3TrainerAssignments,
];

