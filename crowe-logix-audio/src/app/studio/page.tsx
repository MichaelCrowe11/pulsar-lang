'use client';

import React, { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import {
  Mic,
  Play,
  Pause,
  Download,
  Upload,
  Volume2,
  Headphones,
  Wand2,
  Languages,
  Music,
  Radio,
  Settings,
  Save,
  Trash2,
  Copy,
  Scissors,
  Film,
  Sparkles
} from 'lucide-react';

export default function AudioStudioPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voices, setVoices] = useState<any[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [soundPrompt, setSoundPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('tts');
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    // Load available voices
    loadVoices();

    // Initialize WaveSurfer
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#8b5cf6',
        progressColor: '#6d28d9',
        cursorColor: '#a78bfa',
        barWidth: 2,
        barRadius: 3,
        responsive: true,
        height: 150,
        normalize: true
      });
    }

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);

  const loadVoices = async () => {
    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-voices' })
      });
      const data = await response.json();
      setVoices(data.voices || []);
      if (data.voices?.length > 0) {
        setSelectedVoice(data.voices[0].voice_id);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        if (wavesurfer.current) {
          wavesurfer.current.load(audioUrl);
        }

        // Convert to File for upload
        const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        setAudioFile(file);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);

      // Stop all tracks
      const stream = mediaRecorder.current.stream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleTextToSpeech = async () => {
    if (!text || !selectedVoice) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'text-to-speech',
          text,
          voiceId: selectedVoice,
          options: {
            modelId: 'eleven_multilingual_v2',
            voiceSettings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true
            }
          }
        })
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (wavesurfer.current) {
        wavesurfer.current.load(audioUrl);
      }
    } catch (error) {
      console.error('TTS failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSpeechToSpeech = async () => {
    if (!audioFile || !selectedVoice) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('voiceId', selectedVoice);

      const response = await fetch('/api/audio', {
        method: 'POST',
        body: formData
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (wavesurfer.current) {
        wavesurfer.current.load(audioUrl);
      }
    } catch (error) {
      console.error('Speech-to-speech failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceClone = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('name', 'Custom Voice');
      formData.append('description', 'Cloned voice from audio');
      formData.append('files', audioFile);

      const response = await fetch('/api/audio', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      console.log('Voice cloned:', result);

      // Reload voices
      await loadVoices();
    } catch (error) {
      console.error('Voice cloning failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAudioIsolation = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const response = await fetch('/api/audio', {
        method: 'POST',
        body: formData
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (wavesurfer.current) {
        wavesurfer.current.load(audioUrl);
      }
    } catch (error) {
      console.error('Audio isolation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSoundGeneration = async () => {
    if (!soundPrompt) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-sound-effect',
          prompt: soundPrompt,
          duration: 5
        })
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (wavesurfer.current) {
        wavesurfer.current.load(audioUrl);
      }
    } catch (error) {
      console.error('Sound generation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const audioUrl = URL.createObjectURL(file);
      if (wavesurfer.current) {
        wavesurfer.current.load(audioUrl);
      }
    }
  };

  const togglePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  const downloadAudio = () => {
    if (wavesurfer.current) {
      const audioUrl = wavesurfer.current.getMediaElement()?.src;
      if (audioUrl) {
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = 'audio.mp3';
        a.click();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Crowe Logix Audio Studio
          </h1>
          <p className="text-gray-300">Next-gen audio production powered by ElevenLabs</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white/10 rounded-lg p-1 backdrop-blur">
          {[
            { id: 'tts', label: 'Text to Speech', icon: Volume2 },
            { id: 'sts', label: 'Speech to Speech', icon: Headphones },
            { id: 'clone', label: 'Voice Cloning', icon: Copy },
            { id: 'isolate', label: 'Audio Isolation', icon: Scissors },
            { id: 'effects', label: 'Sound Effects', icon: Sparkles },
            { id: 'dubbing', label: 'Dubbing', icon: Film }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Voice Selection */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Voice Selection</h3>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg text-white border border-white/20 focus:border-purple-400 focus:outline-none"
              >
                {voices.map(voice => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Controls */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Input</h3>

              {activeTab === 'tts' && (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter text to convert to speech..."
                  className="w-full h-32 px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 border border-white/20 focus:border-purple-400 focus:outline-none resize-none"
                />
              )}

              {activeTab === 'effects' && (
                <textarea
                  value={soundPrompt}
                  onChange={(e) => setSoundPrompt(e.target.value)}
                  placeholder="Describe the sound effect you want..."
                  className="w-full h-32 px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 border border-white/20 focus:border-purple-400 focus:outline-none resize-none"
                />
              )}

              {(activeTab === 'sts' || activeTab === 'clone' || activeTab === 'isolate' || activeTab === 'dubbing') && (
                <div className="space-y-4">
                  <label className="block">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-5 h-5" />
                      <span>Upload Audio</span>
                    </div>
                  </label>

                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                    <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <button
                onClick={() => {
                  switch(activeTab) {
                    case 'tts': handleTextToSpeech(); break;
                    case 'sts': handleSpeechToSpeech(); break;
                    case 'clone': handleVoiceClone(); break;
                    case 'isolate': handleAudioIsolation(); break;
                    case 'effects': handleSoundGeneration(); break;
                  }
                }}
                disabled={isProcessing}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Waveform Display */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Audio Waveform</h3>

              <div ref={waveformRef} className="mb-6"></div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={togglePlayPause}
                  className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>

                <button
                  onClick={downloadAudio}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                >
                  <Download className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="mt-6 bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Usage Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">1,234</div>
                  <div className="text-sm text-gray-400">Characters Used</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">56</div>
                  <div className="text-sm text-gray-400">Generations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-400">12</div>
                  <div className="text-sm text-gray-400">Voices</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">98.7%</div>
                  <div className="text-sm text-gray-400">Quota Used</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}