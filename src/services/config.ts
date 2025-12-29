/**
 * Configuration Service
 * Manages application configuration from environment variables
 */

export class ConfigService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.TDX_CLIENT_ID || '';
    this.clientSecret = process.env.TDX_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'Missing required environment variables: TDX_CLIENT_ID and TDX_CLIENT_SECRET'
      );
    }
  }

  getClientId(): string {
    return this.clientId;
  }

  getClientSecret(): string {
    return this.clientSecret;
  }

  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }
}
