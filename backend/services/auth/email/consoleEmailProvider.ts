/**
 * GymDeck Cloud Backend - Console Email Provider (Development & Test Fallback)
 */

import { logger } from '../../../shared/logging';
import { isDevelopment } from '../../../shared/config';
import { EmailTemplatePayload } from './emailTemplates';

export class ConsoleEmailProvider {
  public async sendEmail(payload: EmailTemplatePayload): Promise<{ id: string; success: boolean }> {
    const messageId = `console_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    logger.info('[EmailDelivery:Console] Transactional email queued', {
      messageId,
      recipient: payload.to,
      subject: payload.subject,
    });

    if (isDevelopment) {
      // In development only, log the notification for dev testing convenience
      console.log(`\n======================================================`);
      console.log(`✉️ [DEV EMAIL DISPATCH] To: ${payload.to}`);
      console.log(`Subject: ${payload.subject}`);
      console.log(`Text Body:\n${payload.text}`);
      console.log(`======================================================\n`);
    }

    return { id: messageId, success: true };
  }
}

export default ConsoleEmailProvider;
