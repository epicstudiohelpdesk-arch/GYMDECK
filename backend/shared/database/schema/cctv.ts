/**
 * GymDeck Cloud Database Schema - Security & CCTV Subsystem
 * Enforces strict multi-tenant isolation via mandatory gym_id on all tenant entities.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  decimal,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { gyms } from './gyms';

// 1. CCTV EDGE GATEWAYS (Local edge appliance/daemon bound to a gym)
export const cctvGateways = pgTable(
  'cctv_gateways',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull().default('Primary Edge Gateway'),
    hostOs: varchar('host_os', { length: 64 }), // WINDOWS, LINUX, MACOS
    hostLocalIp: varchar('host_local_ip', { length: 64 }),
    version: varchar('version', { length: 32 }).notNull().default('1.0.0'),
    status: varchar('status', { length: 32 }).notNull().default('ENROLLING'), // ONLINE, OFFLINE, ENROLLING, REVOKED
    enrollmentTokenHash: varchar('enrollment_token_hash', { length: 64 }),
    publicKey: text('public_key'),
    deviceAuthTokenHash: varchar('device_auth_token_hash', { length: 64 }),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymIdx: index('idx_cctv_gateways_gym').on(table.gymId),
    statusIdx: index('idx_cctv_gateways_status').on(table.status),
    enrollmentHashIdx: index('idx_cctv_gateways_enroll_hash').on(table.enrollmentTokenHash),
  })
);

// 2. CCTV RECORDERS (DVR / NVR or standalone IP camera appliances)
export const cctvRecorders = pgTable(
  'cctv_recorders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gatewayId: uuid('gateway_id').notNull().references(() => cctvGateways.id, { onDelete: 'cascade' }),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    brand: varchar('brand', { length: 64 }).notNull(), // HIKVISION, DAHUA, CP_PLUS, UNIVIEW, GENERIC_ONVIF
    model: varchar('model', { length: 128 }),
    serialNumber: varchar('serial_number', { length: 128 }),
    firmwareVersion: varchar('firmware_version', { length: 128 }),
    ipAddress: varchar('ip_address', { length: 64 }).notNull(),
    onvifPort: integer('onvif_port').notNull().default(80),
    rtspPort: integer('rtsp_port').notNull().default(554),
    httpPort: integer('http_port').notNull().default(80),
    macAddress: varchar('mac_address', { length: 32 }),
    status: varchar('status', { length: 32 }).notNull().default('ONLINE'), // ONLINE, OFFLINE, AUTH_FAILED
    totalChannels: integer('total_channels').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymIdx: index('idx_cctv_recorders_gym').on(table.gymId),
    gatewayIdx: index('idx_cctv_recorders_gateway').on(table.gatewayId),
  })
);

// 3. CCTV CAMERAS (Individual camera channels)
export const cctvCameras = pgTable(
  'cctv_cameras',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recorderId: uuid('recorder_id').references(() => cctvRecorders.id, { onDelete: 'cascade' }),
    gatewayId: uuid('gateway_id').notNull().references(() => cctvGateways.id, { onDelete: 'cascade' }),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    channelNumber: integer('channel_number').notNull(),
    name: varchar('name', { length: 128 }).notNull(), // e.g. "Reception", "Weight Floor"
    locationZone: varchar('location_zone', { length: 64 }).notNull().default('GENERAL'), // ENTRANCE, RECEPTION, WORKOUT_FLOOR, CARDIO, WEIGHTS, BILLING, EXTERIOR
    ipAddress: varchar('ip_address', { length: 64 }),
    onvifToken: varchar('onvif_token', { length: 128 }),
    mainRtspUrlEncrypted: text('main_rtsp_url_encrypted'), // AES-256-GCM encrypted
    subRtspUrlEncrypted: text('sub_rtsp_url_encrypted'),   // AES-256-GCM encrypted
    codec: varchar('codec', { length: 16 }).notNull().default('H264'), // H264, H265
    resolutionMain: varchar('resolution_main', { length: 32 }).default('1920x1080'),
    resolutionSub: varchar('resolution_sub', { length: 32 }).default('640x360'),
    fps: integer('fps').default(15),
    isActive: boolean('is_active').notNull().default(true),
    status: varchar('status', { length: 32 }).notNull().default('IDLE'), // STREAMING, IDLE, OFFLINE, ERROR
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymIdx: index('idx_cctv_cameras_gym').on(table.gymId),
    recorderChannelIdx: uniqueIndex('idx_cctv_rec_chan').on(table.recorderId, table.channelNumber),
    gatewayIdx: index('idx_cctv_cameras_gateway').on(table.gatewayId),
  })
);

// 4. CCTV CAMERA CAPABILITIES
export const cctvCameraCapabilities = pgTable(
  'cctv_camera_capabilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cameraId: uuid('camera_id').notNull().references(() => cctvCameras.id, { onDelete: 'cascade' }),
    supportsOnvifT: boolean('supports_onvif_t').notNull().default(true),
    supportsOnvifG: boolean('supports_onvif_g').notNull().default(false),
    supportsPtz: boolean('supports_ptz').notNull().default(false),
    supportsAudio: boolean('supports_audio').notNull().default(false),
    supportsMotionEvents: boolean('supports_motion_events').notNull().default(false),
    supportsSubstream: boolean('supports_substream').notNull().default(true),
    supportedCodecs: varchar('supported_codecs', { length: 64 }).notNull().default('H264'),
    maxFramerate: integer('max_framerate').notNull().default(30),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cameraIdx: uniqueIndex('idx_cctv_capabilities_cam').on(table.cameraId),
  })
);

// 5. CCTV CREDENTIALS (Securely encrypted DVR/NVR/Camera credentials)
export const cctvCredentials = pgTable(
  'cctv_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    recorderId: uuid('recorder_id').references(() => cctvRecorders.id, { onDelete: 'cascade' }),
    cameraId: uuid('camera_id').references(() => cctvCameras.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 128 }).notNull(),
    encryptedPassword: text('encrypted_password').notNull(), // AES-256-GCM
    credentialType: varchar('credential_type', { length: 32 }).notNull().default('ONVIF'), // ONVIF, RTSP, HTTP_API
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymIdx: index('idx_cctv_creds_gym').on(table.gymId),
    recorderIdx: index('idx_cctv_creds_recorder').on(table.recorderId),
  })
);

// 6. CCTV STREAM SESSIONS (Live WebRTC viewing sessions)
export const cctvStreamSessions = pgTable(
  'cctv_stream_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    cameraId: uuid('camera_id').notNull().references(() => cctvCameras.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    clientType: varchar('client_type', { length: 32 }).notNull().default('DESKTOP'), // DESKTOP, OWNER_MOBILE
    connectionType: varchar('connection_type', { length: 32 }).notNull().default('LOCAL_LAN'), // LOCAL_LAN, DIRECT_P2P, TURN_RELAY
    streamProfile: varchar('stream_profile', { length: 16 }).notNull().default('SUB'), // MAIN, SUB
    status: varchar('status', { length: 32 }).notNull().default('INITIALIZING'), // INITIALIZING, CONNECTED, CLOSED, EXPIRED
    bytesTransferred: bigint('bytes_transferred', { mode: 'number' }).default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    gymIdx: index('idx_cctv_sessions_gym').on(table.gymId),
    cameraIdx: index('idx_cctv_sessions_camera').on(table.cameraId),
    statusIdx: index('idx_cctv_sessions_status').on(table.status),
  })
);

// 7. CCTV RECORDING SEGMENTS (Index of footage stored on DVR/NVR)
export const cctvRecordingSegments = pgTable(
  'cctv_recording_segments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    cameraId: uuid('camera_id').notNull().references(() => cctvCameras.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    storageLocation: varchar('storage_location', { length: 32 }).notNull().default('ON_DEVICE_NVR'), // ON_DEVICE_NVR, LOCAL_GATEWAY_CACHE
    fileFormat: varchar('file_format', { length: 16 }).notNull().default('MP4'),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).default(0),
    recordingType: varchar('recording_type', { length: 32 }).notNull().default('CONTINUOUS'), // CONTINUOUS, MOTION, MANUAL
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymCameraTimeIdx: index('idx_cctv_segments_time').on(table.gymId, table.cameraId, table.startTime, table.endTime),
  })
);

// 8. CCTV EXPORT JOBS (Video clip extraction jobs)
export const cctvExportJobs = pgTable(
  'cctv_export_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    cameraId: uuid('camera_id').notNull().references(() => cctvCameras.id, { onDelete: 'cascade' }),
    requestedByUserId: uuid('requested_by_user_id').notNull(),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('QUEUED'), // QUEUED, PROCESSING, COMPLETED, FAILED
    progressPercent: integer('progress_percent').notNull().default(0),
    outputFilePath: text('output_file_path'),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).default(0),
    downloadUrl: text('download_url'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymIdx: index('idx_cctv_exports_gym').on(table.gymId),
    statusIdx: index('idx_cctv_exports_status').on(table.status),
  })
);

// 9. CCTV AUDIT LOGS (Security & privacy audit trail)
export const cctvAuditLogs = pgTable(
  'cctv_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    action: varchar('action', { length: 64 }).notNull(), // VIEW_START, VIEW_STOP, EXPORT_CLIP, CREDENTIAL_UPDATE, DISCOVERY, GATEWAY_ENROLL
    entityType: varchar('entity_type', { length: 32 }).notNull(), // CAMERA, RECORDER, GATEWAY, EXPORT
    entityId: varchar('entity_id', { length: 64 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    details: text('details'), // JSON string
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymActionIdx: index('idx_cctv_audit_gym_action').on(table.gymId, table.action, table.createdAt),
  })
);

// 10. CCTV GATEWAY HEARTBEATS (Edge telemetry)
export const cctvGatewayHeartbeats = pgTable(
  'cctv_gateway_heartbeats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gatewayId: uuid('gateway_id').notNull().references(() => cctvGateways.id, { onDelete: 'cascade' }),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    cpuUsagePercent: decimal('cpu_usage_percent', { precision: 5, scale: 2 }).default('0.00'),
    memoryUsageMb: integer('memory_usage_mb').default(0),
    diskFreeGb: integer('disk_free_gb').default(0),
    activeStreamsCount: integer('active_streams_count').default(0),
    networkInKbps: integer('network_in_kbps').default(0),
    networkOutKbps: integer('network_out_kbps').default(0),
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gatewayReportIdx: index('idx_cctv_heartbeats_gw').on(table.gatewayId, table.reportedAt),
  })
);

// 11. CCTV USER PERMISSIONS (Role-based viewing & export controls)
export const cctvUserPermissions = pgTable(
  'cctv_user_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    canViewLive: boolean('can_view_live').notNull().default(true),
    canViewRecordings: boolean('can_view_recordings').notNull().default(false),
    canExportClips: boolean('can_export_clips').notNull().default(false),
    canManageDevices: boolean('can_manage_devices').notNull().default(false),
    allowedCameraIds: text('allowed_camera_ids').default('*'), // '*' or JSON array of camera UUIDs
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymUserIdx: uniqueIndex('idx_cctv_user_perm_gym_user').on(table.gymId, table.userId),
  })
);

// 12. CCTV DEVICE COMPATIBILITY (Pre-tested compatibility catalogue)
export const cctvDeviceCompatibility = pgTable(
  'cctv_device_compatibility',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brand: varchar('brand', { length: 64 }).notNull(),
    modelPattern: varchar('model_pattern', { length: 128 }).notNull(),
    firmwareRange: varchar('firmware_range', { length: 128 }),
    testedProfile: varchar('tested_profile', { length: 32 }).notNull().default('PROFILE_T'), // PROFILE_T, PROFILE_S, PROFILE_G
    liveStreamOk: boolean('live_stream_ok').notNull().default(true),
    recordingOk: boolean('recording_ok').notNull().default(false),
    ptzOk: boolean('ptz_ok').notNull().default(false),
    notes: text('notes'),
    verifiedDate: timestamp('verified_date', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    brandIdx: index('idx_cctv_compat_brand').on(table.brand),
  })
);

// Type definitions inferred from schema
export type CctvGateway = typeof cctvGateways.$inferSelect;
export type NewCctvGateway = typeof cctvGateways.$inferInsert;

export type CctvRecorder = typeof cctvRecorders.$inferSelect;
export type NewCctvRecorder = typeof cctvRecorders.$inferInsert;

export type CctvCamera = typeof cctvCameras.$inferSelect;
export type NewCctvCamera = typeof cctvCameras.$inferInsert;

export type CctvCameraCapability = typeof cctvCameraCapabilities.$inferSelect;
export type CctvCredential = typeof cctvCredentials.$inferSelect;
export type CctvStreamSession = typeof cctvStreamSessions.$inferSelect;
export type CctvExportJob = typeof cctvExportJobs.$inferSelect;
export type CctvAuditLog = typeof cctvAuditLogs.$inferSelect;
export type CctvUserPermission = typeof cctvUserPermissions.$inferSelect;
