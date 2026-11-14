-- GymDeck CCTV Subsystem Migration (0003_cctv_subsystem.sql)
-- Additive, forward-only PostgreSQL schema for multi-tenant CCTV surveillance.
-- Every tenant record references gyms(id) with ON DELETE CASCADE.

-- 1. CCTV EDGE GATEWAYS
CREATE TABLE IF NOT EXISTS cctv_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Primary Edge Gateway',
  host_os VARCHAR(64),
  host_local_ip VARCHAR(64),
  version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(32) NOT NULL DEFAULT 'ENROLLING',
  enrollment_token_hash VARCHAR(64),
  public_key TEXT,
  device_auth_token_hash VARCHAR(64),
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cctv_gateways_status_chk CHECK (status IN ('ONLINE', 'OFFLINE', 'ENROLLING', 'REVOKED'))
);

CREATE INDEX IF NOT EXISTS idx_cctv_gateways_gym ON cctv_gateways (gym_id);
CREATE INDEX IF NOT EXISTS idx_cctv_gateways_status ON cctv_gateways (status);
CREATE INDEX IF NOT EXISTS idx_cctv_gateways_enroll_hash ON cctv_gateways (enrollment_token_hash);

-- 2. CCTV RECORDERS (DVR/NVR)
CREATE TABLE IF NOT EXISTS cctv_recorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID NOT NULL REFERENCES cctv_gateways(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  brand VARCHAR(64) NOT NULL,
  model VARCHAR(128),
  serial_number VARCHAR(128),
  firmware_version VARCHAR(128),
  ip_address VARCHAR(64) NOT NULL,
  onvif_port INTEGER NOT NULL DEFAULT 80,
  rtsp_port INTEGER NOT NULL DEFAULT 554,
  http_port INTEGER NOT NULL DEFAULT 80,
  mac_address VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'ONLINE',
  total_channels INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cctv_recorders_status_chk CHECK (status IN ('ONLINE', 'OFFLINE', 'AUTH_FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_cctv_recorders_gym ON cctv_recorders (gym_id);
CREATE INDEX IF NOT EXISTS idx_cctv_recorders_gateway ON cctv_recorders (gateway_id);

-- 3. CCTV CAMERAS
CREATE TABLE IF NOT EXISTS cctv_cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorder_id UUID REFERENCES cctv_recorders(id) ON DELETE CASCADE,
  gateway_id UUID NOT NULL REFERENCES cctv_gateways(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  channel_number INTEGER NOT NULL,
  name VARCHAR(128) NOT NULL,
  location_zone VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
  ip_address VARCHAR(64),
  onvif_token VARCHAR(128),
  main_rtsp_url_encrypted TEXT,
  sub_rtsp_url_encrypted TEXT,
  codec VARCHAR(16) NOT NULL DEFAULT 'H264',
  resolution_main VARCHAR(32) DEFAULT '1920x1080',
  resolution_sub VARCHAR(32) DEFAULT '640x360',
  fps INTEGER DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cctv_cameras_status_chk CHECK (status IN ('STREAMING', 'IDLE', 'OFFLINE', 'ERROR'))
);

CREATE INDEX IF NOT EXISTS idx_cctv_cameras_gym ON cctv_cameras (gym_id);
CREATE INDEX IF NOT EXISTS idx_cctv_cameras_gateway ON cctv_cameras (gateway_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cctv_rec_chan ON cctv_cameras (recorder_id, channel_number);

-- 4. CCTV CAMERA CAPABILITIES
CREATE TABLE IF NOT EXISTS cctv_camera_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES cctv_cameras(id) ON DELETE CASCADE,
  supports_onvif_t BOOLEAN NOT NULL DEFAULT TRUE,
  supports_onvif_g BOOLEAN NOT NULL DEFAULT FALSE,
  supports_ptz BOOLEAN NOT NULL DEFAULT FALSE,
  supports_audio BOOLEAN NOT NULL DEFAULT FALSE,
  supports_motion_events BOOLEAN NOT NULL DEFAULT FALSE,
  supports_substream BOOLEAN NOT NULL DEFAULT TRUE,
  supported_codecs VARCHAR(64) NOT NULL DEFAULT 'H264',
  max_framerate INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cctv_capabilities_cam ON cctv_camera_capabilities (camera_id);

-- 5. CCTV CREDENTIALS
CREATE TABLE IF NOT EXISTS cctv_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  recorder_id UUID REFERENCES cctv_recorders(id) ON DELETE CASCADE,
  camera_id UUID REFERENCES cctv_cameras(id) ON DELETE CASCADE,
  username VARCHAR(128) NOT NULL,
  encrypted_password TEXT NOT NULL,
  credential_type VARCHAR(32) NOT NULL DEFAULT 'ONVIF',
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cctv_creds_gym ON cctv_credentials (gym_id);
CREATE INDEX IF NOT EXISTS idx_cctv_creds_recorder ON cctv_credentials (recorder_id);

-- 6. CCTV STREAM SESSIONS
CREATE TABLE IF NOT EXISTS cctv_stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES cctv_cameras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  client_type VARCHAR(32) NOT NULL DEFAULT 'DESKTOP',
  connection_type VARCHAR(32) NOT NULL DEFAULT 'LOCAL_LAN',
  stream_profile VARCHAR(16) NOT NULL DEFAULT 'SUB',
  status VARCHAR(32) NOT NULL DEFAULT 'INITIALIZING',
  bytes_transferred BIGINT DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT cctv_sessions_status_chk CHECK (status IN ('INITIALIZING', 'CONNECTED', 'CLOSED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_cctv_sessions_gym ON cctv_stream_sessions (gym_id);
CREATE INDEX IF NOT EXISTS idx_cctv_sessions_camera ON cctv_stream_sessions (camera_id);
CREATE INDEX IF NOT EXISTS idx_cctv_sessions_status ON cctv_stream_sessions (status);

-- 7. CCTV RECORDING SEGMENTS
CREATE TABLE IF NOT EXISTS cctv_recording_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES cctv_cameras(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  storage_location VARCHAR(32) NOT NULL DEFAULT 'ON_DEVICE_NVR',
  file_format VARCHAR(16) NOT NULL DEFAULT 'MP4',
  file_size_bytes BIGINT DEFAULT 0,
  recording_type VARCHAR(32) NOT NULL DEFAULT 'CONTINUOUS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cctv_segments_time ON cctv_recording_segments (gym_id, camera_id, start_time, end_time);

-- 8. CCTV EXPORT JOBS
CREATE TABLE IF NOT EXISTS cctv_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES cctv_cameras(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  output_file_path TEXT,
  file_size_bytes BIGINT DEFAULT 0,
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cctv_exports_status_chk CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_cctv_exports_gym ON cctv_export_jobs (gym_id);
CREATE INDEX IF NOT EXISTS idx_cctv_exports_status ON cctv_export_jobs (status);

-- 9. CCTV AUDIT LOGS
CREATE TABLE IF NOT EXISTS cctv_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(64),
  ip_address VARCHAR(64),
  user_agent TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cctv_audit_gym_action ON cctv_audit_logs (gym_id, action, created_at);

-- 10. CCTV GATEWAY HEARTBEATS
CREATE TABLE IF NOT EXISTS cctv_gateway_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID NOT NULL REFERENCES cctv_gateways(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  cpu_usage_percent DECIMAL(5, 2) DEFAULT 0.00,
  memory_usage_mb INTEGER DEFAULT 0,
  disk_free_gb INTEGER DEFAULT 0,
  active_streams_count INTEGER DEFAULT 0,
  network_in_kbps INTEGER DEFAULT 0,
  network_out_kbps INTEGER DEFAULT 0,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cctv_heartbeats_gw ON cctv_gateway_heartbeats (gateway_id, reported_at);

-- 11. CCTV USER PERMISSIONS
CREATE TABLE IF NOT EXISTS cctv_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  can_view_live BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_recordings BOOLEAN NOT NULL DEFAULT FALSE,
  can_export_clips BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_devices BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_camera_ids TEXT DEFAULT '*',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cctv_user_perm_gym_user ON cctv_user_permissions (gym_id, user_id);

-- 12. CCTV DEVICE COMPATIBILITY
CREATE TABLE IF NOT EXISTS cctv_device_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(64) NOT NULL,
  model_pattern VARCHAR(128) NOT NULL,
  firmware_range VARCHAR(128),
  tested_profile VARCHAR(32) NOT NULL DEFAULT 'PROFILE_T',
  live_stream_ok BOOLEAN NOT NULL DEFAULT TRUE,
  recording_ok BOOLEAN NOT NULL DEFAULT FALSE,
  ptz_ok BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  verified_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cctv_compat_brand ON cctv_device_compatibility (brand);
