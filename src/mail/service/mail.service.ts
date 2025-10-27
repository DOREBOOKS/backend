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
  async sendCashoutRequest(payload: {
    userId: string;
    userEmail?: string;
    userName?: string;
    amount: number;
    bank: string;
    bankAccount: string;
    balanceBefore?: number;
    balanceAfter?: number;
    requestedAt?: Date | string;
  }) {
    const subject = `[현금전환 신청] ${payload.userId} / ${payload.amount}코인`;
    const requestedAt = payload.requestedAt
      ? new Date(payload.requestedAt)
      : new Date();

    const lines = [
      `사용자 ID: ${payload.userId}`,
      `이메일: ${payload.userEmail ?? '(미입력)'}`,
      `이름: ${payload.userName ?? '(미입력)'}`,
      `신청 코인: ${payload.amount}`,
      `은행:${payload.bank}`,
      `계좌 번호:${payload.bankAccount}`,
      `신청 시각: ${requestedAt.toISOString()}`,
      `잔액(전): ${payload.balanceBefore ?? '(미확인)'}`,
      `잔액(후): ${payload.balanceAfter ?? '(미확인)'}`,
    ];

    const text = lines.join('\n');
    const html = `
      <p><b>사용자 ID</b>: ${escapeHtml(payload.userId)}</p>
      <p><b>이메일</b>: ${escapeHtml(payload.userEmail ?? '(미입력)')}</p>
      <p><b>이름</b>: ${escapeHtml(payload.userName ?? '(미입력)')}</p>
      <p><b>신청 코인</b>: ${escapeHtml(String(payload.amount))}</p>
      <p><b>은행</b>: ${escapeHtml(String(payload.bank))}</p>
      <p><b>계좌 번호</b>: ${escapeHtml(String(payload.bankAccount))}</p>
      <p><b>신청 시각</b>: ${escapeHtml(requestedAt.toISOString())}</p>
      <p><b>잔액(전)</b>: ${escapeHtml(String(payload.balanceBefore ?? '(미확인)'))}</p>
      <p><b>잔액(후)</b>: ${escapeHtml(String(payload.balanceAfter ?? '(미확인)'))}</p>
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
      this.logger.error('현금전환 알림 메일 전송 실패', e?.stack || e);
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
