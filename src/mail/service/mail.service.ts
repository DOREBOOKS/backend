import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async sendComplainNotice(payload: {
    id: string;
    type: string;
    writer?: string;
    text: string;
    fromEmail?: string;
  }) {
    const subject = `[문의 접수] ${payload.type}`;
    const text = [
      `ID:${payload.id}`,
      `유형:${payload.type}`,
      `회신 이메일:${payload.fromEmail ?? '(미입력)'}`,
      '',
      payload.text,
    ].join('\n');

    const html = `<p><b>ID:</b> ${payload.id}</p>
      <p><b>유형:</b> ${escapeHtml(payload.type)}</p>
      <p><b>작성자:</b> ${escapeHtml(payload.writer ?? '(미입력)')}</p>
      <p><b>회신 이메일:</b> ${escapeHtml(payload.fromEmail ?? '(미입력)')}</p>
      <hr/>
      <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(payload.text)}</pre>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.SUPPORT_TO,
        subject,
        text,
        html,
      });
    } catch (e) {
      this.logger.error('메일 전송 실패', e?.stack || e);
    }
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
