import axios, { AxiosInstance } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FundxEvent {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  location: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  status: string;
  creator_address: string;
  gallery_images?: Array<{
    image_url: string;
    is_cover: boolean;
  }>;
}

export interface CreateFundxEventPayload {
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  location: string;
  creator_address: string;
}

export interface FundxApiResponse<T> {
  is_success: boolean;
  data: T;
  limit?: number;
  offset?: number;
}

@Injectable()
export class FundxApiClient {
  private readonly logger = new Logger(FundxApiClient.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const fundxApiUrl = this.configService.get<string>('FUNDX_API_URL') || 'http://localhost:4000';
    
    this.client = axios.create({
      baseURL: fundxApiUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`FundX API client initialized: ${fundxApiUrl}`);
  }

  async getActiveEvents(): Promise<FundxEvent[]> {
    try {
      const { data } = await this.client.get<FundxApiResponse<FundxEvent[]>>('/events');
      
      if (!data.is_success || !data.data) {
        this.logger.warn('FundX API returned unsuccessful response');
        return [];
      }

      // Filter only active/pending events
      const activeEvents = data.data.filter(event => 
        event.status === 'active' || event.status === 'pending'
      );

      this.logger.log(`Fetched ${activeEvents.length} active events from FundX`);
      return activeEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from FundX:', error.message);
      return []; // Return empty array if fundx is down
    }
  }

  async getEventById(eventId: string): Promise<FundxEvent | null> {
    try {
      const { data } = await this.client.get<FundxApiResponse<FundxEvent>>(`/events/${eventId}`);
      
      if (!data.is_success || !data.data) {
        return null;
      }

      return data.data;
    } catch (error) {
      this.logger.error(`Failed to fetch event ${eventId} from FundX:`, error.message);
      return null;
    }
  }

  async createEvent(payload: CreateFundxEventPayload): Promise<FundxEvent> {
    try {
      const { data } = await this.client.post<FundxApiResponse<FundxEvent>>(
        '/events',
        payload,
      );

      if (!data.is_success || !data.data) {
        throw new Error('FundX API returned unsuccessful response when creating event');
      }

      this.logger.log(`Created event "${data.data.name}" in FundX`);
      return data.data;
    } catch (error: any) {
      this.logger.error('Failed to create event in FundX:', error.message);
      throw error;
    }
  }
}

