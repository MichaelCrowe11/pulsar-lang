import { ElevenLabsClient } from "elevenlabs";
import axios from 'axios';

// Initialize ElevenLabs client with all API capabilities
export class CroweLogixAudioEngine {
  private client: ElevenLabsClient;
  private apiKey: string;
  private baseURL = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new ElevenLabsClient({
      apiKey: apiKey
    });
  }

  // Text-to-Speech API
  async textToSpeech(text: string, voiceId: string, options?: {
    modelId?: string;
    voiceSettings?: {
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
    outputFormat?: string;
  }) {
    try {
      const audio = await this.client.generate({
        voice: voiceId,
        text,
        model_id: options?.modelId || "eleven_multilingual_v2",
        voice_settings: options?.voiceSettings
      });

      return audio;
    } catch (error) {
      console.error('TTS Error:', error);
      throw error;
    }
  }

  // Speech-to-Speech API
  async speechToSpeech(audioFile: Buffer, targetVoiceId: string, options?: {
    modelId?: string;
    removeBackgroundNoise?: boolean;
  }) {
    try {
      const formData = new FormData();
      formData.append('audio', new Blob([audioFile]));
      formData.append('voice_id', targetVoiceId);
      formData.append('model_id', options?.modelId || 'eleven_english_sts_v2');

      if (options?.removeBackgroundNoise) {
        formData.append('remove_background_noise', 'true');
      }

      const response = await axios.post(
        `${this.baseURL}/speech-to-speech/${targetVoiceId}`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'arraybuffer'
        }
      );

      return response.data;
    } catch (error) {
      console.error('STS Error:', error);
      throw error;
    }
  }

  // Voice Cloning API
  async cloneVoice(name: string, files: Buffer[], description?: string, labels?: Record<string, string>) {
    try {
      const formData = new FormData();
      formData.append('name', name);

      files.forEach((file, index) => {
        formData.append('files', new Blob([file]), `sample_${index}.mp3`);
      });

      if (description) {
        formData.append('description', description);
      }

      if (labels) {
        formData.append('labels', JSON.stringify(labels));
      }

      const response = await axios.post(
        `${this.baseURL}/voices/add`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Voice Cloning Error:', error);
      throw error;
    }
  }

  // Professional Voice Cloning (PVC)
  async professionalVoiceClone(name: string, files: Buffer[], options?: {
    description?: string;
    labels?: Record<string, string>;
  }) {
    try {
      const formData = new FormData();
      formData.append('name', name);

      files.forEach((file, index) => {
        formData.append('files', new Blob([file]), `professional_${index}.mp3`);
      });

      if (options?.description) {
        formData.append('description', options.description);
      }

      if (options?.labels) {
        formData.append('labels', JSON.stringify(options.labels));
      }

      const response = await axios.post(
        `${this.baseURL}/voices/add/professional`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('PVC Error:', error);
      throw error;
    }
  }

  // Audio Isolation API
  async isolateAudio(audioFile: Buffer) {
    try {
      const formData = new FormData();
      formData.append('audio', new Blob([audioFile]));

      const response = await axios.post(
        `${this.baseURL}/audio-isolation`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'arraybuffer'
        }
      );

      return response.data;
    } catch (error) {
      console.error('Audio Isolation Error:', error);
      throw error;
    }
  }

  // Sound Effects Generation API
  async generateSoundEffect(prompt: string, duration?: number) {
    try {
      const response = await axios.post(
        `${this.baseURL}/sound-generation`,
        {
          text: prompt,
          duration_seconds: duration || 5
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      return response.data;
    } catch (error) {
      console.error('Sound Effect Generation Error:', error);
      throw error;
    }
  }

  // Dubbing API
  async createDubbingProject(
    sourceFile: Buffer,
    targetLanguages: string[],
    options?: {
      projectName?: string;
      sourceLanguage?: string;
      watermark?: boolean;
    }
  ) {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([sourceFile]));
      formData.append('target_languages', JSON.stringify(targetLanguages));

      if (options?.projectName) {
        formData.append('name', options.projectName);
      }

      if (options?.sourceLanguage) {
        formData.append('source_language', options.sourceLanguage);
      }

      if (options?.watermark !== undefined) {
        formData.append('watermark', String(options.watermark));
      }

      const response = await axios.post(
        `${this.baseURL}/dubbing`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Dubbing Error:', error);
      throw error;
    }
  }

  // Get Dubbing Project Status
  async getDubbingStatus(dubbingId: string) {
    try {
      const response = await axios.get(
        `${this.baseURL}/dubbing/${dubbingId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Dubbing Status Error:', error);
      throw error;
    }
  }

  // Download Dubbed File
  async downloadDubbedFile(dubbingId: string, languageCode: string) {
    try {
      const response = await axios.get(
        `${this.baseURL}/dubbing/${dubbingId}/audio/${languageCode}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      return response.data;
    } catch (error) {
      console.error('Download Dubbed File Error:', error);
      throw error;
    }
  }

  // Voice Library Management
  async getVoices() {
    try {
      const voices = await this.client.voices.getAll();
      return voices;
    } catch (error) {
      console.error('Get Voices Error:', error);
      throw error;
    }
  }

  async getVoiceById(voiceId: string) {
    try {
      const voice = await this.client.voices.get(voiceId);
      return voice;
    } catch (error) {
      console.error('Get Voice Error:', error);
      throw error;
    }
  }

  async deleteVoice(voiceId: string) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/voices/${voiceId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Delete Voice Error:', error);
      throw error;
    }
  }

  // Edit Voice Settings
  async editVoiceSettings(voiceId: string, settings: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/voices/${voiceId}/settings/edit`,
        settings,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Edit Voice Settings Error:', error);
      throw error;
    }
  }

  // Projects API
  async createProject(name: string, options?: {
    default_title_voice_id?: string;
    default_paragraph_voice_id?: string;
    default_model_id?: string;
  }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/projects/add`,
        {
          name,
          ...options
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Create Project Error:', error);
      throw error;
    }
  }

  // Pronunciation Dictionary
  async addPronunciationRule(name: string, rule: string, phoneme: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/pronunciation-dictionaries/add-rules`,
        {
          name,
          rules: [{
            string_to_replace: rule,
            phoneme,
            alphabet: 'ipa'
          }]
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Add Pronunciation Rule Error:', error);
      throw error;
    }
  }

  // Models API
  async getModels() {
    try {
      const response = await axios.get(
        `${this.baseURL}/models`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Get Models Error:', error);
      throw error;
    }
  }

  // User Subscription Info
  async getUserSubscription() {
    try {
      const response = await axios.get(
        `${this.baseURL}/user/subscription`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Get Subscription Error:', error);
      throw error;
    }
  }

  // Usage Statistics
  async getUsageStats() {
    try {
      const response = await axios.get(
        `${this.baseURL}/usage/character-stats`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Get Usage Stats Error:', error);
      throw error;
    }
  }

  // History
  async getHistory(options?: {
    page_size?: number;
    start_after_history_item_id?: string;
  }) {
    try {
      const params = new URLSearchParams();
      if (options?.page_size) {
        params.append('page_size', String(options.page_size));
      }
      if (options?.start_after_history_item_id) {
        params.append('start_after_history_item_id', options.start_after_history_item_id);
      }

      const response = await axios.get(
        `${this.baseURL}/history?${params.toString()}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Get History Error:', error);
      throw error;
    }
  }

  // Download History Item
  async downloadHistoryItem(historyItemId: string) {
    try {
      const response = await axios.get(
        `${this.baseURL}/history/${historyItemId}/audio`,
        {
          headers: {
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      return response.data;
    } catch (error) {
      console.error('Download History Item Error:', error);
      throw error;
    }
  }

  // Delete History Item
  async deleteHistoryItem(historyItemId: string) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/history/${historyItemId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Delete History Item Error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const createAudioEngine = (apiKey: string) => new CroweLogixAudioEngine(apiKey);