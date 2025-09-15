import { NextRequest, NextResponse } from 'next/server';
import { CroweLogixAudioEngine } from '@/lib/elevenlabs-client';

const audioEngine = new CroweLogixAudioEngine(process.env.ELEVENLABS_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'text-to-speech': {
        const { text, voiceId, options } = params;
        const audio = await audioEngine.textToSpeech(text, voiceId, options);

        return new NextResponse(audio, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="audio.mp3"'
          }
        });
      }

      case 'speech-to-speech': {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const targetVoiceId = formData.get('voiceId') as string;
        const buffer = Buffer.from(await audioFile.arrayBuffer());

        const audio = await audioEngine.speechToSpeech(buffer, targetVoiceId);

        return new NextResponse(audio, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="converted.mp3"'
          }
        });
      }

      case 'clone-voice': {
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const files = formData.getAll('files') as File[];

        const buffers = await Promise.all(
          files.map(async (file) => Buffer.from(await file.arrayBuffer()))
        );

        const result = await audioEngine.cloneVoice(name, buffers, description);

        return NextResponse.json(result);
      }

      case 'isolate-audio': {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const buffer = Buffer.from(await audioFile.arrayBuffer());

        const isolated = await audioEngine.isolateAudio(buffer);

        return new NextResponse(isolated, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="isolated.mp3"'
          }
        });
      }

      case 'generate-sound-effect': {
        const { prompt, duration } = params;
        const audio = await audioEngine.generateSoundEffect(prompt, duration);

        return new NextResponse(audio, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="sound-effect.mp3"'
          }
        });
      }

      case 'create-dubbing': {
        const formData = await request.formData();
        const sourceFile = formData.get('file') as File;
        const targetLanguages = JSON.parse(formData.get('languages') as string);
        const projectName = formData.get('name') as string;
        const buffer = Buffer.from(await sourceFile.arrayBuffer());

        const result = await audioEngine.createDubbingProject(buffer, targetLanguages, {
          projectName
        });

        return NextResponse.json(result);
      }

      case 'get-voices': {
        const voices = await audioEngine.getVoices();
        return NextResponse.json(voices);
      }

      case 'get-models': {
        const models = await audioEngine.getModels();
        return NextResponse.json(models);
      }

      case 'get-history': {
        const history = await audioEngine.getHistory(params.options);
        return NextResponse.json(history);
      }

      case 'get-usage': {
        const usage = await audioEngine.getUsageStats();
        return NextResponse.json(usage);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Audio API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process audio request' },
      { status: 500 }
    );
  }
}