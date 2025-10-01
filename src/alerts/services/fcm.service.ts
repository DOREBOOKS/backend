import { Injectable, Logger } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import * as fs from 'fs';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private projectId: string;
  private auth: GoogleAuth;

  constructor() {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    let key: any;
    if (keyJson) {
      key = JSON.parse(keyJson);
    } else if (keyFile) {
      key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    } else {
      throw new Error('No Firebase credentials provided');
    }

    this.projectId = key.project_id;
    this.auth = new GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  }

  private async getAccessToken() {
    const client = await this.auth.getClient();
    const t = await client.getAccessToken();
    return t.token!;
  }

  async sendToToken(
    token: string,
    payload: { title: string; body: string; route?: string; id?: string },
  ) {
    const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
    const accessToken = await this.getAccessToken();

    const body = {
      message: {
        token,
        notification: { title: payload.title, body: payload.body },
        data: {
          route: payload.route ?? 'BookDetail',
          ...(payload.id ? { id: payload.id } : {}),
        },
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
      },
    };

    try {
      await axios.post(url, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      this.logger.log(`FCM sent to ${token}`);
    } catch (err: any) {
      this.logger.error(
        `FCM send failed: ${JSON.stringify(err.response?.data || err.message)}`,
      );
    }
  }
}
