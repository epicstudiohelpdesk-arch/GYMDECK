/**
 * GymDeck Cloud Database Schema - Member Document Vault (Metadata Only)
 */

import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

export const memberDocuments = pgTable(
  'member_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    documentType: varchar('document_type', { length: 64 }).notNull(), // LIABILITY_WAIVER, MEMBERSHIP_AGREEMENT, TAX_INVOICE, ID_PROOF
    displayName: varchar('display_name', { length: 255 }).notNull(),
    objectKey: text('object_key').notNull(), // Private S3 / Cloudflare R2 bucket storage key
    mimeType: varchar('mime_type', { length: 128 }).notNull().default('application/pdf'),
    fileSizeBytes: integer('file_size_bytes'),
    status: varchar('status', { length: 32 }).notNull().default('VERIFIED'), // VERIFIED, PENDING, REJECTED
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberDocsIdx: index('idx_member_documents_gym_member').on(table.gymId, table.memberId),
  })
);

export type MemberDocument = typeof memberDocuments.$inferSelect;
export type NewMemberDocument = typeof memberDocuments.$inferInsert;
