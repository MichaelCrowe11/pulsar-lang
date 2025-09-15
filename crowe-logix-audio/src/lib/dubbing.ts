import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export class DubbingService {
  private apiKey: string;
  private baseURL = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createDubbingProject(
    videoFile: string,
    targetLanguages: string[],
    options?: {
      sourceLanguage?: string;
      numberOfSpeakers?: number;
      watermark?: boolean;
      startTime?: number;
      endTime?: number;
    }
  ) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(videoFile));
    formData.append('target_languages', targetLanguages.join(','));

    if (options?.sourceLanguage) {
      formData.append('source_language', options.sourceLanguage);
    }
    if (options?.numberOfSpeakers) {
      formData.append('num_speakers', options.numberOfSpeakers.toString());
    }
    if (options?.watermark !== undefined) {
      formData.append('watermark', options.watermark.toString());
    }
    if (options?.startTime !== undefined) {
      formData.append('start_time', options.startTime.toString());
    }
    if (options?.endTime !== undefined) {
      formData.append('end_time', options.endTime.toString());
    }

    const response = await axios.post(
      `${this.baseURL}/dubbing`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'xi-api-key': this.apiKey,
        },
      }
    );

    return response.data;
  }

  async getDubbingStatus(dubbingId: string) {
    const response = await axios.get(
      `${this.baseURL}/dubbing/${dubbingId}`,
      {
        headers: {
          'xi-api-key': this.apiKey,
        },
      }
    );

    return response.data;
  }

  async downloadDubbedFile(dubbingId: string, languageCode: string) {
    const response = await axios.get(
      `${this.baseURL}/dubbing/${dubbingId}/audio/${languageCode}`,
      {
        headers: {
          'xi-api-key': this.apiKey,
        },
        responseType: 'stream',
      }
    );

    return response.data;
  }

  async getTranscript(dubbingId: string, languageCode: string) {
    const response = await axios.get(
      `${this.baseURL}/dubbing/${dubbingId}/transcript/${languageCode}`,
      {
        headers: {
          'xi-api-key': this.apiKey,
        },
      }
    );

    return response.data;
  }

  async deleteDubbingProject(dubbingId: string) {
    const response = await axios.delete(
      `${this.baseURL}/dubbing/${dubbingId}`,
      {
        headers: {
          'xi-api-key': this.apiKey,
        },
      }
    );

    return response.data;
  }
}