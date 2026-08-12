import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  relatedType: 'CHALLAN' | 'INVOICE' | 'PO';
  relatedId: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT || 587);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    const isTest = process.env.NODE_ENV === 'test';

    if (isTest) {
      this.transporter = {
        sendMail: async (mailOptions: any) => {
          console.log('📧 [Mock Email Sent (Test Mode)]:', mailOptions.to);
          // If we intentionally want it to fail for simulated ports
          if (process.env.EMAIL_PORT === '9999') {
            throw new Error('Connection failed on port 9999');
          }
          return { messageId: 'mock-test-id-' + Date.now() };
        },
      } as any;
    } else if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      // Local dev/test fallback using Ethereal fake SMTP
      console.log('✉️ [EmailService] SMTP credentials missing. Setting up Ethereal fake account...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (err) {
        console.error('❌ [EmailService] Failed to create Ethereal account, falling back to console log:', err);
        // Minimal mock transporter that just logs
        this.transporter = {
          sendMail: async (mailOptions: any) => {
            console.log('📧 [Mock Email Sent]:', JSON.stringify(mailOptions, null, 2));
            return { messageId: 'mock-id-' + Date.now() };
          },
        } as any;
      }
    }

    return this.transporter!;
  }

  /**
   * Sends an email asynchronously and logs the status to the database (EmailLog).
   * Does NOT block the request cycle. Any failures are caught and logged inside the function.
   */
  static sendEmail(options: SendEmailOptions): void {
    // Non-blocking fire-and-forget execution
    Promise.resolve().then(async () => {
      let logStatus: 'SENT' | 'FAILED' = 'SENT';
      let errorMessage: string | null = null;

      try {
        const transporter = await this.getTransporter();
        const from = process.env.EMAIL_FROM || 'NexusFlow Portal <no-reply@nexusflow.com>';

        const info = await transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html || options.text,
          attachments: options.attachments,
        });

        // If Ethereal test account is used, log the preview URL
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`✉️ [EmailService] Ethereal email preview URL: ${previewUrl}`);
        } else {
          console.log(`✉️ [EmailService] Email sent successfully. Message ID: ${info.messageId}`);
        }
      } catch (error: any) {
        logStatus = 'FAILED';
        errorMessage = error?.message || String(error);
        console.error(`❌ [EmailService] Failed to send email to ${options.to}:`, error);
      } finally {
        // Record log entry in DB
        try {
          await prisma.emailLog.create({
            data: {
              recipientEmail: options.to,
              subject: options.subject,
              relatedType: options.relatedType,
              relatedId: options.relatedId,
              status: logStatus,
              errorMessage,
            },
          });
        } catch (dbError) {
          console.error('❌ [EmailService] Failed to save EmailLog in database:', dbError);
        }
      }
    });
  }
}
