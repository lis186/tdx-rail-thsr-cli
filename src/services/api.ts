/**
 * TDX API Client for THSR
 * Handles OAuth and API calls to Taiwan High Speed Rail endpoints
 */

import { $fetch, type FetchOptions } from 'ofetch';
import { ConfigService } from './config.js';
import type { THSRStation, THSRODFare } from '../types/api.js';

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class TDXApiClient {
  private baseUrl = 'https://tdx.transportdata.tw/api/basic';
  private authUrl = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Get or refresh OAuth token
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const response = await $fetch<TokenResponse>(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    this.accessToken = response.access_token;
    this.tokenExpiresAt = Date.now() + response.expires_in * 1000 - 60000; // Refresh 1 min early

    return this.accessToken;
  }

  /**
   * Fetch THSR Stations
   */
  async getStations(): Promise<THSRStation[]> {
    const token = await this.getAccessToken();
    const response = await $fetch<THSRStation[]>(
      `${this.baseUrl}/v2/Rail/THSR/Station?$format=JSON&$top=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    return response;
  }

  /**
   * Fetch THSR Fares
   */
  async getFares(): Promise<THSRODFare[]> {
    const token = await this.getAccessToken();
    const response = await $fetch<THSRODFare[]>(
      `${this.baseUrl}/v2/Rail/THSR/ODFare?$format=JSON&$top=500`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    return response;
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; message: string }> {
    try {
      const token = await this.getAccessToken();
      await $fetch(`${this.baseUrl}/v2/Rail/THSR/Station?$format=JSON&$top=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return {
        status: 'healthy',
        message: 'TDX API connection successful',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `TDX API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
