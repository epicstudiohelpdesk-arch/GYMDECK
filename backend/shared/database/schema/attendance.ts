/**
 * GymDeck Cloud Database Schema - Member Attendance Logs
 */

import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

export const attendanceLogs = pgTable(
  'attendance_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    checkInTime: timestamp('check_in_time', { withTimezone: true }).notNull().defaultNow(),
    checkOutTime: timestamp('check_out_time', { withTimezone: true }),
    entryMethod: varchar('entry_method', { length: 32 }).notNull().default('QR_DYNAMIC'), // QR_DYNAMIC, MANUAL, RFID, BIOMETRIC
    deviceMetadata: text('device_metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberAttendanceIdx: index('idx_attendance_gym_member').on(table.gymId, table.memberId, table.checkInTime),
    gymTimeIdx: index('idx_attendance_gym_time').on(table.gymId, table.checkInTime),
  })
);

export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type NewAttendanceLog = typeof attendanceLogs.$inferInsert;
