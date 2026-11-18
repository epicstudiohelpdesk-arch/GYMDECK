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
    rtspPort = 8554,
    bindHost = ''
  ): string {
    const hostPrefix = bindHost ? `${bindHost}:` : ':';
    const lines: string[] = [
      '# GymDeck CCTV Edge Gateway - Media Engine Configuration',
      '# Generated dynamically based on enrolled CCTV cameras',
      '',
      'logLevel: info',
      'logDestinations: [stdout]',
      '',
      `rtspAddress: ${hostPrefix}${rtspPort}`,
      'rtspTransports: [tcp]',
      '',
      '# Disable unused protocols to optimize CPU & memory footprint',
      'rtmp: no',
      'hls: no',
      'srt: no',
      '',
      '# WebRTC / WHEP Engine',
      'webrtc: yes',
      `webrtcAddress: ${hostPrefix}${whepPort}`,
      `webrtcLocalUDPAddress: ${hostPrefix}8189`,
      `webrtcLocalTCPAddress: ${hostPrefix}8189`,
      'webrtcHandshakeTimeout: 10s',
      '',
      'paths:',
    ];

    lines.push('  all_others:');

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
  static writeConfigFile(
    targetPath: string,
    routes: CameraStreamRoute[],
    whepPort = 8889,
    rtspPort = 8554
  ): void {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const yaml = MediaEngine.generateConfig(routes, whepPort, rtspPort);
    fs.writeFileSync(targetPath, yaml, 'utf8');
  }
}
