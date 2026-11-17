# MediaMTX Binary Directory

This directory holds the platform-specific `mediamtx` executable used by `@gymdeck/cctv-edge-gateway`.

### Binary Resolution Precedence
1. `apps/cctv-edge-gateway/bin/mediamtx` (Darwin/Linux executable)
2. System `PATH` (`which mediamtx`)
3. Automatic download by `MediaMtxManager` from official GitHub releases (v1.21.4+) into this directory.

The binary itself is excluded from git version control via `.gitignore` to prevent repository bloat (>50MB).
