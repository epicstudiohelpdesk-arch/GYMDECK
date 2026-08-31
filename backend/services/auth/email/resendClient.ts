/**
 * GymDeck Cloud Backend - Server-Side Resend Client Wrapper
 */

import { config } from '../../../shared/config';
import { logger } from '../../../shared/logging';
import { EmailTemplatePayload } from './emailTemplates';

export class ResendEmailClient {
  private readonly apiKey: string;
  private readonly fromEmail: string;

  constructor(apiKey: string = config.RESEND_API_KEY, fromEmail: string = config.RESEND_FROM_EMAIL) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  public async sendEmail(payload: EmailTemplatePayload): Promise<{ id: string; success: boolean }> {
    if (!this.apiKey || this.apiKey.startsWith('re_dev_')) {
      logger.warn('[Resend] Development API key detected. Email will not be delivered to live inbox.');
      return { id: `dev_mock_${Date.now()}`, success: true };
    }

    try {
      // Use standard fetch to communicate directly with Resend REST API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[Resend] Transactional email delivery failed', undefined, {
          statusCode: response.status,
          recipient: payload.to,
          error: errorData,
        });
        return { id: '', success: false };
      }

      const responseData = (await response.json()) as { id: string };
      logger.info('[Resend] Transactional email dispatched successfully', {
        messageId: responseData.id,
        recipient: payload.to,
      });

      return { id: responseData.id, success: true };
    } catch (err) {
      logger.error('[Resend] Network exception while dispatching email', err, {
        recipient: payload.to,
      });
      return { id: '', success: false };
    }
  }
}

export default ResendEmailClient;
