/**
 * GymDeck CCTV Edge Gateway - ONVIF Core & Media Service SOAP Client
 * Implements standard ONVIF WS-Security UsernameToken authentication,
 * Profile T / Profile S discovery, media profile parsing, and RTSP stream extraction.
 */

import * as crypto from 'crypto';

export interface OnvifCredentials {
  username: string;
  password: string;
}

export interface OnvifDeviceInfo {
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  serialNumber: string;
  hardwareId: string;
}

export interface OnvifProfile {
  token: string;
  name: string;
  videoSourceToken?: string;
  encoding: 'H264' | 'H265' | 'JPEG';
  width: number;
  height: number;
  frameRate: number;
  bitrateKbps: number;
  rtspUri?: string;
}

export class OnvifClient {
  private serviceUrl: string;
  private credentials?: OnvifCredentials;
  private mediaServiceUrl?: string;

  constructor(deviceServiceUrl: string, credentials?: OnvifCredentials) {
    this.serviceUrl = deviceServiceUrl;
    this.credentials = credentials;
  }

  /**
   * Generates standard ONVIF WS-Security UsernameToken header.
   * PasswordDigest = Base64(SHA-1(nonce + created + password))
   */
  static buildSecurityHeader(username: string, password: string): string {
    const rawNonce = crypto.randomBytes(16);
    const nonceBase64 = rawNonce.toString('base64');
    const created = new Date().toISOString();

    const sha1 = crypto.createHash('sha1');
    sha1.update(rawNonce);
    sha1.update(Buffer.from(created, 'utf8'));
    sha1.update(Buffer.from(password, 'utf8'));
    const passwordDigest = sha1.digest('base64');

    return `<s:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
                   xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${username}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${passwordDigest}</wsse:Password>
        <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonceBase64}</wsse:Nonce>
        <wsu:Created>${created}</wsu:Created>
      </wsse:UsernameToken>
    </wsse:Security>
  </s:Header>`;
  }

  /**
   * Wraps a SOAP action body with envelope and security header.
   */
  private wrapEnvelope(bodyXml: string): string {
    const headerXml = this.credentials
      ? OnvifClient.buildSecurityHeader(this.credentials.username, this.credentials.password)
      : '<s:Header/>';

    return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
            xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
            xmlns:tt="http://www.onvif.org/ver10/schema">
  ${headerXml}
  <s:Body>
    ${bodyXml}
  </s:Body>
</s:Envelope>`;
  }

  /**
   * Executes a SOAP request against the specified service endpoint.
   */
  private async executeSoap(url: string, bodyXml: string): Promise<string> {
    const envelope = this.wrapEnvelope(bodyXml);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
      },
      body: envelope,
    });

    const responseText = await res.text();
    if (!res.ok) {
      if (responseText.includes('NotAuthorized') || responseText.includes('Sender') || res.status === 401) {
        throw new Error('ONVIF Authentication Failed: Invalid device credentials.');
      }
      throw new Error(`ONVIF SOAP error (HTTP ${res.status}): ${responseText.substring(0, 120)}`);
    }

    return responseText;
  }

  /**
   * Retrieves Device Information: Manufacturer, Model, Firmware, Serial Number.
   */
  async getDeviceInformation(): Promise<OnvifDeviceInfo> {
    const bodyXml = `<tds:GetDeviceInformation/>`;
    const xml = await this.executeSoap(this.serviceUrl, bodyXml);

    const manufacturer = xml.match(/<(?:\w+:)?Manufacturer>([^<]+)<\/(?:\w+:)?Manufacturer>/i)?.[1]?.trim() || 'Generic';
    const model = xml.match(/<(?:\w+:)?Model>([^<]+)<\/(?:\w+:)?Model>/i)?.[1]?.trim() || 'Unknown Model';
    const firmwareVersion = xml.match(/<(?:\w+:)?FirmwareVersion>([^<]+)<\/(?:\w+:)?FirmwareVersion>/i)?.[1]?.trim() || '1.0';
    const serialNumber = xml.match(/<(?:\w+:)?SerialNumber>([^<]+)<\/(?:\w+:)?SerialNumber>/i)?.[1]?.trim() || 'N/A';
    const hardwareId = xml.match(/<(?:\w+:)?HardwareId>([^<]+)<\/(?:\w+:)?HardwareId>/i)?.[1]?.trim() || 'N/A';

    return { manufacturer, model, firmwareVersion, serialNumber, hardwareId };
  }

  /**
   * Discovers the Media Service endpoint and supported capabilities.
   */
  async getCapabilities(): Promise<{ mediaUrl: string; supportsPtz: boolean; supportsEvents: boolean }> {
    const bodyXml = `<tds:GetCapabilities><tds:Category>All</tds:Category></tds:GetCapabilities>`;
    const xml = await this.executeSoap(this.serviceUrl, bodyXml);

    // Extract Media XAddr
    const mediaMatch = xml.match(/<(?:\w+:)?Media>[^]*?<(?:\w+:)?XAddr>([^<]+)<\/(?:\w+:)?XAddr>/i);
    const mediaUrl = mediaMatch ? mediaMatch[1].trim() : `${new URL(this.serviceUrl).origin}/onvif/media_service`;
    this.mediaServiceUrl = mediaUrl;

    const supportsPtz = xml.includes('<tt:PTZ>') || xml.includes(':PTZ>');
    const supportsEvents = xml.includes('<tt:Events>') || xml.includes(':Events>');

    return { mediaUrl, supportsPtz, supportsEvents };
  }

  /**
   * Discovers video media profiles (Profile tokens, resolutions, codecs).
   */
  async getProfiles(): Promise<OnvifProfile[]> {
    if (!this.mediaServiceUrl) {
      await this.getCapabilities();
    }

    const bodyXml = `<trt:GetProfiles/>`;
    const xml = await this.executeSoap(this.mediaServiceUrl!, bodyXml);

    const profiles: OnvifProfile[] = [];
    // Match individual Profiles
    const profileBlocks = xml.split(/<(?:\w+:)?Profiles\s+/i).slice(1);

    for (const block of profileBlocks) {
      const tokenMatch = block.match(/token=["']([^"']+)["']/i);
      if (!tokenMatch) continue;
      const token = tokenMatch[1];

      const nameMatch = block.match(/<(?:\w+:)?Name>([^<]+)<\/(?:\w+:)?Name>/i);
      const name = nameMatch ? nameMatch[1].trim() : token;

      const widthMatch = block.match(/<(?:\w+:)?Width>(\d+)<\/(?:\w+:)?Width>/i);
      const heightMatch = block.match(/<(?:\w+:)?Height>(\d+)<\/(?:\w+:)?Height>/i);
      const width = widthMatch ? parseInt(widthMatch[1], 10) : 1920;
      const height = heightMatch ? parseInt(heightMatch[1], 10) : 1080;

      const encodingMatch = block.match(/<(?:\w+:)?Encoding>([^<]+)<\/(?:\w+:)?Encoding>/i);
      const rawEnc = (encodingMatch ? encodingMatch[1].trim() : 'H264').toUpperCase();
      const encoding: 'H264' | 'H265' | 'JPEG' = rawEnc.includes('H265') || rawEnc.includes('HEVC') ? 'H265' : 'H264';

      const fpsMatch = block.match(/<(?:\w+:)?FrameRateLimit>(\d+)<\/(?:\w+:)?FrameRateLimit>/i);
      const frameRate = fpsMatch ? parseInt(fpsMatch[1], 10) : 15;

      const bitrateMatch = block.match(/<(?:\w+:)?BitrateLimit>(\d+)<\/(?:\w+:)?BitrateLimit>/i);
      const bitrateKbps = bitrateMatch ? parseInt(bitrateMatch[1], 10) : 2048;

      profiles.push({
        token,
        name,
        encoding,
        width,
        height,
        frameRate,
        bitrateKbps,
      });
    }

    return profiles;
  }

  /**
   * Retrieves the live RTSP stream URI for a given media profile token.
   */
  async getStreamUri(profileToken: string): Promise<string> {
    if (!this.mediaServiceUrl) {
      await this.getCapabilities();
    }

    const bodyXml = `<trt:GetStreamUri>
      <trt:StreamSetup>
        <tt:Stream>RTP-Unicast</tt:Stream>
        <tt:Transport>
          <tt:Protocol>TCP</tt:Protocol>
        </tt:Transport>
      </trt:StreamSetup>
      <trt:ProfileToken>${profileToken}</trt:ProfileToken>
    </trt:GetStreamUri>`;

    const xml = await this.executeSoap(this.mediaServiceUrl!, bodyXml);
    const uriMatch = xml.match(/<(?:\w+:)?Uri>([^<]+)<\/(?:\w+:)?Uri>/i);
    if (!uriMatch) {
      throw new Error(`Failed to extract stream URI for profile ${profileToken}`);
    }

    return uriMatch[1].trim();
  }
}
