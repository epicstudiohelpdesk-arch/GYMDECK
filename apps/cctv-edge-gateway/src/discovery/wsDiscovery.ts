/**
 * GymDeck CCTV Edge Gateway - ONVIF WS-Discovery Protocol Engine
 * Implements OASIS WS-Discovery over UDP Multicast (239.255.255.250:3702).
 * Automatically discovers cameras, DVRs, and NVRs on the local physical network.
 */

import * as dgram from 'dgram';
import * as crypto from 'crypto';

export interface DiscoveredDevice {
  urn: string;
  ipAddress: string;
  xaddrs: string[];
  types: string[];
  scopes: string[];
  brand: string;
  model: string | null;
  name: string | null;
  hardware: string | null;
  discoveredAt: string;
}

export class WsDiscoveryEngine {
  private static MULTICAST_ADDRESS = '239.255.255.250';
  private static MULTICAST_PORT = 3702;

  /**
   * Generates a standard SOAP WS-Discovery Probe message.
   */
  static buildProbeMessage(messageId?: string): string {
    const msgId = messageId || `uuid:${crypto.randomUUID()}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
            xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>${msgId}</w:MessageID>
    <w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>`;
  }

  /**
   * Extracts device metadata from a ProbeMatches XML response.
   */
  static parseProbeMatch(xml: string, remoteIp: string): DiscoveredDevice | null {
    if (!xml.includes('ProbeMatches') && !xml.includes('ProbeMatch')) {
      return null;
    }

    // Extract Endpoint Reference (URN)
    const urnMatch = xml.match(/<(?:\w+:)?Address[^>]*>(urn:uuid:[^<]+)<\/(?:\w+:)?Address>/i) ||
                     xml.match(/<(?:\w+:)?Address[^>]*>([^<]+)<\/(?:\w+:)?Address>/i);
    const urn = urnMatch ? urnMatch[1].trim() : `urn:ip:${remoteIp}`;

    // Extract XAddrs (Device service URL)
    const xaddrMatch = xml.match(/<(?:\w+:)?XAddrs[^>]*>([^<]+)<\/(?:\w+:)?XAddrs>/i);
    const xaddrs = xaddrMatch ? xaddrMatch[1].trim().split(/\s+/) : [];

    // Extract Scopes
    const scopeMatch = xml.match(/<(?:\w+:)?Scopes[^>]*>([^<]+)<\/(?:\w+:)?Scopes>/i);
    const scopes = scopeMatch ? scopeMatch[1].trim().split(/\s+/) : [];

    // Extract Types
    const typeMatch = xml.match(/<(?:\w+:)?Types[^>]*>([^<]+)<\/(?:\w+:)?Types>/i);
    const types = typeMatch ? typeMatch[1].trim().split(/\s+/) : [];

    // Derive Brand, Model, and Hardware from ONVIF Scopes
    let brand = 'GENERIC_ONVIF';
    let model: string | null = null;
    let name: string | null = null;
    let hardware: string | null = null;

    for (const scope of scopes) {
      const lower = scope.toLowerCase();
      if (lower.includes('hikvision')) brand = 'HIKVISION';
      else if (lower.includes('dahua')) brand = 'DAHUA';
      else if (lower.includes('cpplus') || lower.includes('cp plus') || lower.includes('cp-plus')) brand = 'CP_PLUS';
      else if (lower.includes('uniview') || lower.includes('univ')) brand = 'UNIVIEW';
      else if (lower.includes('axis')) brand = 'AXIS';

      if (scope.includes('onvif://www.onvif.org/hardware/')) {
        hardware = decodeURIComponent(scope.replace('onvif://www.onvif.org/hardware/', ''));
      }
      if (scope.includes('onvif://www.onvif.org/name/')) {
        name = decodeURIComponent(scope.replace('onvif://www.onvif.org/name/', ''));
      }
      if (scope.includes('onvif://www.onvif.org/model/')) {
        model = decodeURIComponent(scope.replace('onvif://www.onvif.org/model/', ''));
      }
    }

    if (!model && hardware) model = hardware;
    if (!name && model) name = `${brand} ${model}`;
    if (!name) name = `${brand} Recorder`;

    return {
      urn,
      ipAddress: remoteIp,
      xaddrs,
      types,
      scopes,
      brand,
      model,
      name,
      hardware,
      discoveredAt: new Date().toISOString(),
    };
  }

  /**
   * Performs an asynchronous active network scan for ONVIF devices.
   */
  async probe(timeoutMs = 4000): Promise<DiscoveredDevice[]> {
    return new Promise((resolve) => {
      const discovered = new Map<string, DiscoveredDevice>();
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      const cleanup = () => {
        try {
          socket.close();
        } catch {}
        resolve(Array.from(discovered.values()));
      };

      socket.on('error', () => {
        cleanup();
      });

      socket.on('message', (msg, rinfo) => {
        try {
          const xml = msg.toString('utf8');
          const device = WsDiscoveryEngine.parseProbeMatch(xml, rinfo.address);
          if (device && !discovered.has(device.ipAddress)) {
            discovered.set(device.ipAddress, device);
          }
        } catch {}
      });

      socket.bind(0, () => {
        try {
          socket.setBroadcast(true);
          socket.setMulticastTTL(2);

          const probeMessage = Buffer.from(WsDiscoveryEngine.buildProbeMessage());
          socket.send(
            probeMessage,
            0,
            probeMessage.length,
            WsDiscoveryEngine.MULTICAST_PORT,
            WsDiscoveryEngine.MULTICAST_ADDRESS
          );
        } catch {
          cleanup();
        }
      });

      setTimeout(cleanup, timeoutMs);
    });
  }
}

export const wsDiscoveryEngine = new WsDiscoveryEngine();
