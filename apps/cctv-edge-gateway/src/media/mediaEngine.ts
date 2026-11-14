/**
 * GymDeck CCTV Edge Gateway - Media Engine Configuration Generator
 * Produces MediaMTX routing profiles, on-demand RTSP pipelines, and WebRTC (WHEP) bridges.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CameraStreamRoute {
  streamId: string;
  cameraId: string;
  channelNumber: number;
  profile: 'MAIN' | 'SUB';
  rtspUrl: string;
}

export class MediaEngine {
  /**
   * Generates a declarative MediaMTX configuration YAML.
   * Leverages runOnDemand so RTSP streams from the physical NVR are ingested ONLY when watched.
   */
  static generateConfig(
    routes: CameraStreamRoute[],
    whepPort = 8889,
    rtspPort = 8554
  ): string {
    const lines: string[] = [
      '# GymDeck CCTV Edge Gateway - Media Engine Configuration',
      '# Generated dynamically based on enrolled CCTV cameras',
      '',
      'logLevel: info',
      'logDestinations: [stdout]',
      '',
      `rtspAddress: :${rtspPort}`,
      'rtspTransports: [tcp]',
      '',
      'webrtc: yes',
      `webrtcAddress: :${whepPort}`,
      'webrtcAllowCrossOrigin: yes',
      'webrtcLocalUDPAddress: :8189',
      'webrtcLocalTCPAddress: :8189',
      'webrtcHandshakeTimeout: 10s',
      '',
      'paths:',
    ];

    for (const r of routes) {
      lines.push(`  ${r.streamId}:`);
      lines.push(`    source: ${r.rtspUrl}`);
      lines.push('    sourceOnDemand: yes');
      lines.push('    sourceOnDemandStartTimeout: 10s');
      lines.push('    sourceOnDemandCloseAfter: 30s');
      lines.push('    rtspTransport: tcp');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Writes the generated configuration to disk.
   */
  static writeConfigFile(targetPath: string, routes: CameraStreamRoute[]): void {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const yaml = MediaEngine.generateConfig(routes);
    fs.writeFileSync(targetPath, yaml, 'utf8');
  }
}
