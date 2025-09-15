import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export class VoiceCloningService {
  private apiKey: string;
  private baseURL = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async cloneVoice(name: string, audioFiles: string[], description?: string) {
    const formData = new FormData();
    formData.append('name', name);
    if (description) formData.append('description', description);

    audioFiles.forEach(file => {
      formData.append('files', fs.createReadStream(file));
    });

    const response = await axios.post(
      `${this.baseURL}/voices/add`,
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

  async instantClone(name: string, audioFile: string) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('files', fs.createReadStream(audioFile));
    formData.append('remove_background_noise', 'true');

    const response = await axios.post(
      `${this.baseURL}/voices/add/instant`,
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

  async professionalClone(name: string, dataset: Buffer, description: string) {
    const response = await axios.post(
      `${this.baseURL}/voices/add/professional`,
      {
        name,
        description,
        dataset,
      },
      {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async getVoices() {
    const response = await axios.get(`${this.baseURL}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    return response.data.voices;
  }

  async deleteVoice(voiceId: string) {
    const response = await axios.delete(`${this.baseURL}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    return response.data;
  }

  async editVoiceSettings(voiceId: string, settings: any) {
    const response = await axios.post(
      `${this.baseURL}/voices/${voiceId}/settings/edit`,
      settings,
      {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}