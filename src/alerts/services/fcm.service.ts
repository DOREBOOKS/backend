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
    //const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    // const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const key = {
      type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE as string,
      project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID as string,
      private_key_id: process.env
        .FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID as string,
      private_key: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY as string,
      client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL as string,
      client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID as string,
      auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI as string,
      token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI as string,
      auth_provider_x509_cert_url: process.env
        .FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL as string,
      client_x509_cert_url: process.env
        .FIREBASE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL as string,
      universe_domain: process.env
        .FIREBASE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN as string,
    };
    // let key: any;
    // if (keyJson) {
    //   key = JSON.parse(keyJson);
    //   // } else if (keyFile) {
    //   //   key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    //   // }
    // } else {
    //   throw new Error('No Firebase credentials provided');
    // }

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
        android: {
          priority: 'HIGH',
          notification: {
            channel_id: 'default',
            sound: 'default',
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { sound: 'default' } },
        },
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
