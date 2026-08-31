/**
 * GymDeck Cloud Backend - Abstract Transactional Email Service
 */

import { config, isProduction } from '../../../shared/config';
import { logger } from '../../../shared/logging';
import { EmailTemplatePayload, renderVerificationOtpEmail, renderPasswordResetEmail } from './emailTemplates';
import { ResendEmailClient } from './resendClient';
import { ConsoleEmailProvider } from './consoleEmailProvider';

export interface IEmailService {
  sendEmail(payload: EmailTemplatePayload): Promise<{ id: string; success: boolean }>;
  sendVerificationOtp(email: string, otp: string): Promise<boolean>;
  sendPasswordReset(email: string, resetToken: string): Promise<boolean>;
}

export class EmailService implements IEmailService {
  private readonly provider: { sendEmail: (payload: EmailTemplatePayload) => Promise<{ id: string; success: boolean }> };

  constructor() {
    if (isProduction) {
      if (!config.RESEND_API_KEY || config.RESEND_API_KEY.startsWith('re_dev_')) {
        logger.error('[EmailService] FATAL: Production environment requires a valid RESEND_API_KEY');
      }
      this.provider = new ResendEmailClient();
    } else {
      // In development or test, use Console provider unless live Resend key is configured
      if (config.RESEND_API_KEY && !config.RESEND_API_KEY.startsWith('re_dev_')) {
        this.provider = new ResendEmailClient();
      } else {
        this.provider = new ConsoleEmailProvider();
      }
    }
  }

  public async sendEmail(payload: EmailTemplatePayload): Promise<{ id: string; success: boolean }> {
    return this.provider.sendEmail(payload);
  }

  public async sendVerificationOtp(email: string, otp: string): Promise<boolean> {
    const template = renderVerificationOtpEmail(email, otp);
    const result = await this.provider.sendEmail(template);
    return result.success;
  }

  public async sendPasswordReset(email: string, resetToken: string): Promise<boolean> {
    const template = renderPasswordResetEmail(email, resetToken);
    const result = await this.provider.sendEmail(template);
    return result.success;
  }
}

export const emailService: IEmailService = new EmailService();
export default emailService;
