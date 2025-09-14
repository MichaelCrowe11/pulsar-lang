import 'dotenv/config';
import { Firestore } from '@google-cloud/firestore';

const db = new Firestore({ projectId: process.env.GCP_PROJECT_ID });
const TZ = process.env.TIMEZONE || 'America/Phoenix';

// ---------- Prompt Templates (system_template fields) ----------
const PROMPTS = {
  showrunner: ({ name, voice, forbidden, noveltyMin }) => `You are the Showrunner for **${name}**. Produce an episode brief with: (1) premise + 3 hook options (≤7s each), (2) narrative structure with beat timestamps for {DURATION_S}s, (3) B‑roll requirements, (4) compliance risks, (5) CTA variant A/B, (6) per‑platform cut plan (16:9, 9:16). Respect brand voice: ${voice.tone}. Forbid topics: ${forbidden.join(', ')}. Ensure novelty score ≥ ${noveltyMin}. Output JSON keys: hooks[], beats[], broll[], risks[], cta[], cuts{yt,tt,ig,fb}.`,
  
  research: () => `Build a fact‑pack for {TOPIC}. Return concise bullets with citations (title, publisher, date, URL), and a risk log for claims needing qualifiers. Provide 1–2 simple tables (numbers with units). Avoid speculation. Output: facts[], tables[], citations[], risks[].`,
  
  scriptwriter: ({ wpm }) => `Write the A‑roll narration with SSML for emphasis, a tight cold‑open hook (≤7s), and beat‑aligned B‑roll cues. Target duration: {DURATION_S}s at ${wpm} wpm. Include two alt hooks. End with a clear CTA. No medical/financial advice. Output: script.ssml, broll_cues[], alt_hooks[].`,
  
  visual_director: () => `Convert beat list into Veo prompts. For each shot, specify: subject, motion, lens, light, negative cues (no faces/brands), aspect ratio by platform ({ASPECT}), seed for consistency, and duration. Provide text overlays/lower‑third placements. Use template: "{ASPECT} {DURATION}s: {SUBJECT}; camera {MOTION}; lens {LENS}; lighting {LIGHT}; texture {TEXTURE}; mood {MOOD}; negative: faces, logos, gore, text clutter; seed {SEED}".`,
  
  thumbnail_director: ({ palette }) => `Generate 3 thumbnail concepts. Composition: rule‑of‑thirds focal object, bold contrast, legible at 2cm, minimal text (≤3 words). Output Imagen prompts and overlay guidance. Respect palette ${palette}. Provide Variant A/B/C.`,
  
  tts: ({ language, voiceName }) => `Convert script to SSML optimized for ${voiceName}, ${language}. Add breaths, 180–220ms beats, and pitch contours for questions. Output SSML only.`,
  
  editor: () => `From beats and B‑roll cues, produce an EDL JSON with clip URIs, trims, transitions, overlays, captions timing, sound ducking rules, and vertical safe zones. Ensure total duration {DURATION_S}s ± 3%.`,
  
  distribution: () => `Produce 5 titles (≤60 chars), a description with first 140 chars as hook, 10 platform‑safe hashtags, and a pinned‑comment question to spark replies. Include keywords map and A/B thumbnail rationale.`
};

// ---------- Channel Seeds ----------
const channels = [
  {
    slug: 'circuit-myth',
    title: 'Circuit Myth',
    niche: 'tech-myths',
    pillars: ['myth vs benchmark', 'how-it-works', 'upgrade math'],
    voice: { tone: 'curious, precise, cheeky', wpm: 165 },
    visual: { palette: ['#111111','#f2f2f2','#00e0c6'], lower_thirds_style: 'neo-grid' },
    durations: { long: 540, short: 90, reel: 90, shorts: 60 },
    platforms: { youtube: { shorts: true }, tiktok: true, instagram: { reels: true }, facebook: { reels: true } },
    safety: { allow_people_gen: false, forbidden_topics: ['unverified performance claims','exploit tutorials'] },
    timezone: TZ, locale: 'en-US', novelty_min: 0.6,
    cadence: { windows_local: ['12:30','19:30'] },
    hashtags_base: ['#tech','#hardware','#mythbusting'],
    gcs_bucket: 'gs://dpgen-circuit-myth', veo_seed: 104729,
    upload_policies: { yt_visibility: 'scheduled', license: 'standard' },
    glossary: ['FPS','latency','bandwidth']
  },
  {
    slug: 'deeptime-microhistory',
    title: 'DeepTime Microhistory',
    niche: 'history-shorts',
    pillars: ['object → ripple','forgotten firsts','map moments'],
    voice: { tone: 'storyteller, vivid, sober', wpm: 155 },
    visual: { palette: ['#0b0b0b','#e9e4d8','#c79f54'], lower_thirds_style: 'parchment-minimal' },
    durations: { long: 600, short: 120, reel: 90, shorts: 90 },
    platforms: { youtube: { shorts: true }, tiktok: true, instagram: { reels: true }, facebook: { reels: true } },
    safety: { allow_people_gen: false, forbidden_topics: ['graphic violence','war crime depictions'] },
    timezone: TZ, locale: 'en-US', novelty_min: 0.55,
    cadence: { windows_local: ['12:30','19:30'] },
    hashtags_base: ['#history','#storytime','#maps'],
    gcs_bucket: 'gs://dpgen-deeptime', veo_seed: 6793,
    upload_policies: { yt_visibility: 'scheduled', license: 'standard' },
    glossary: ['primary source','archive','artifact']
  },
  {
    slug: 'zero-view-science',
    title: 'Zero‑View Science',
    niche: 'everyday-science',
    pillars: ['everyday physics','kitchen chemistry','measurement tricks'],
    voice: { tone: 'playful lab coach', wpm: 170 },
    visual: { palette: ['#0e1111','#d9f2ff','#33c3ff'], lower_thirds_style: 'clean-lab' },
    durations: { long: 540, short: 75, reel: 60, shorts: 45 },
    platforms: { youtube: { shorts: true }, tiktok: true, instagram: { reels: true }, facebook: { reels: true } },
    safety: { allow_people_gen: false, forbidden_topics: ['hazardous reactions','unsafe tools'] },
    timezone: TZ, locale: 'en-US', novelty_min: 0.6,
    cadence: { windows_local: ['12:30','19:30'] },
    hashtags_base: ['#science','#physics','#chemistry'],
    gcs_bucket: 'gs://dpgen-zero-view', veo_seed: 4421,
    upload_policies: { yt_visibility: 'scheduled', license: 'standard' },
    glossary: ['density','impulse','diffusion']
  },
  {
    slug: 'map-oddities',
    title: 'Map Oddities',
    niche: 'geo-quirks',
    pillars: ['border puzzles','timezone glitches','projection illusions'],
    voice: { tone: 'deadpan explorer', wpm: 160 },
    visual: { palette: ['#0b132b','#1c2541','#5bc0be'], lower_thirds_style: 'atlas-lines' },
    durations: { long: 540, short: 90, reel: 90, shorts: 75 },
    platforms: { youtube: { shorts: true }, tiktok: true, instagram: { reels: true }, facebook: { reels: true } },
    safety: { allow_people_gen: false, forbidden_topics: ['border disputes advocacy'] },
    timezone: TZ, locale: 'en-US', novelty_min: 0.58,
    cadence: { windows_local: ['12:30','19:30'] },
    hashtags_base: ['#geography','#maps','#cartography'],
    gcs_bucket: 'gs://dpgen-map-oddities', veo_seed: 1879,
    upload_policies: { yt_visibility: 'scheduled', license: 'standard' },
    glossary: ['projection','dateline','enclave']
  },
  {
    slug: 'space-minute',
    title: 'Space Minute',
    niche: 'space-explainers',
    pillars: ['observations','instruments','scale comparisons'],
    voice: { tone: 'awe with rigor', wpm: 160 },
    visual: { palette: ['#090a0f','#2e3350','#a5b4fc'], lower_thirds_style: 'cosmic-minimal' },
    durations: { long: 480, short: 75, reel: 60, shorts: 60 },
    platforms: { youtube: { shorts: true }, tiktok: true, instagram: { reels: true }, facebook: { reels: true } },
    safety: { allow_people_gen: false, forbidden_topics: ['conspiracy cosmology'] },
    timezone: TZ, locale: 'en-US', novelty_min: 0.62,
    cadence: { windows_local: ['12:30','19:30'] },
    hashtags_base: ['#space','#astronomy','#cosmos'],
    gcs_bucket: 'gs://dpgen-space-minute', veo_seed: 823,
    upload_policies: { yt_visibility: 'scheduled', license: 'standard' },
    glossary: ['spectra','albedo','parsec']
  },
  {
    slug: 'design-details',
    title: 'Design Details',
    niche: 'industrial-design',
    pillars: ['hidden mechanisms','tolerances & materials','failure modes'],
    voice: { tone: 'crisp industrial designer', wpm: 165 },
    visual: { palette: ['#101418','#e5e7eb','#10b981'], lower_thirds_style: 'grid-spec' },
    durations: { long: 600, short: 90, reel: 90, shorts: 75 },
    platforms: { youtube: { shorts: true }, tiktok: true, instagram: { reels: true }, facebook: { reels: true } },
    safety: { allow_people_gen: false, forbidden_topics: ['dangerous tool demos'] },
    timezone: TZ, locale: 'en-US', novelty_min: 0.6,
    cadence: { windows_local: ['12:30','19:30'] },
    hashtags_base: ['#design','#engineering','#mechanisms'],
    gcs_bucket: 'gs://dpgen-design-details', veo_seed: 4099,
    upload_policies: { yt_visibility: 'scheduled', license: 'standard' },
    glossary: ['tolerance','shear','DFM']
  },
  {
    slug: 'pattern-language',
    title: 'Pattern Language',
    niche: 'productivity-ai',
    pillars: ['patterns over apps','3‑click workflows','anti‑patterns'],
    voice: { tone: 'pragmatic coach', wpm: 170 },
    visual: { palette: ['#0f172a','#e2e8f0','#38bdf8'], lower_thirds_style: 'ui-cards' },
    durations: { long: 540, short: 75, reel: 60, shorts: 60 },
    platforms: { youtube: { shorts: true }, tiktok: true, instagram: { reels: true }, facebook: { reels: true } },
    safety: { allow_people_gen: false, forbidden_topics: ['"get rich quick" claims'] },
    timezone: TZ, locale: 'en-US', novelty_min: 0.57,
    cadence: { windows_local: ['12:30','19:30'] },
    hashtags_base: ['#productivity','#workflow','#ai'],
    gcs_bucket: 'gs://dpgen-pattern-language', veo_seed: 2207,
    upload_policies: { yt_visibility: 'scheduled', license: 'standard' },
    glossary: ['pipeline','prompt','guardrail']
  },
  {
    slug: 'econ-snack',
    title: 'Econ Snack',
    niche: 'econ-literacy',
    pillars: ['everyday prices','trade‑offs','history rhymes'],
    voice: { tone: 'calm analyst (no advice)', wpm: 155 },
    visual: { palette: ['#0a0a0a','#ffffff','#f59e0b'], lower_thirds_style: 'chart-clean' },
    durations: { long: 540, short: 75, reel: 60, shorts: 60 },
    platforms: { youtube: { shorts: true }, tiktok: true, instagram: { reels: true }, facebook: { reels: true } },
    safety: { allow_people_gen: false, forbidden_topics: ['financial advice'] },
    timezone: TZ, locale: 'en-US', novelty_min: 0.58,
    cadence: { windows_local: ['12:30','19:30'] },
    hashtags_base: ['#economics','#prices','#budget'],
    gcs_bucket: 'gs://dpgen-econ-snack', veo_seed: 3761,
    upload_policies: { yt_visibility: 'scheduled', license: 'standard' },
    glossary: ['CPI','elasticity','opportunity cost']
  }
];

async function seed() {
  console.log('🌱 Starting Firestore seeding...');
  
  for (const ch of channels) {
    console.log(`📝 Seeding channel: ${ch.slug}`);
    
    const ref = db.collection('channels').doc(ch.slug);
    await ref.set({
      channel_id: ch.slug,
      title: ch.title,
      niche: ch.niche,
      pillars: ch.pillars,
      voice: ch.voice,
      visual: ch.visual,
      durations: ch.durations,
      platforms: ch.platforms,
      safety: ch.safety,
      timezone: ch.timezone,
      locale: ch.locale,
      novelty_min: ch.novelty_min,
      cadence: ch.cadence,
      hashtags_base: ch.hashtags_base,
      gcs_bucket: ch.gcs_bucket,
      veo_seed: ch.veo_seed,
      upload_policies: ch.upload_policies,
      glossary: ch.glossary,
      created_at: new Date().toISOString()
    }, { merge: true });

    // prompts subcollection
    const baseVars = {
      CHANNEL_NAME: ch.title,
      VOICE: ch.voice.tone,
      FORBIDDEN: ch.safety.forbidden_topics,
      PALETTE: ch.visual.palette.join(','),
      LANGUAGE: ch.locale,
      VOICE_NAME: 'en-US-Neural2-G'
    };

    const prompts = [
      { id: 'showrunner', system_template: PROMPTS.showrunner({ name: ch.title, voice: ch.voice, forbidden: ch.safety.forbidden_topics, noveltyMin: ch.novelty_min }), defaults: { DURATION_S: ch.durations.short } },
      { id: 'research', system_template: PROMPTS.research(), defaults: {} },
      { id: 'scriptwriter', system_template: PROMPTS.scriptwriter({ wpm: ch.voice.wpm }), defaults: { DURATION_S: ch.durations.short, WPM: ch.voice.wpm } },
      { id: 'visual_director', system_template: PROMPTS.visual_director(), defaults: { ASPECT: '9:16', SEED: ch.veo_seed } },
      { id: 'thumbnail_director', system_template: PROMPTS.thumbnail_director({ palette: baseVars.PALETTE }), defaults: {} },
      { id: 'tts', system_template: PROMPTS.tts({ language: baseVars.LANGUAGE, voiceName: 'en-US-Neural2-G' }), defaults: { VOICE_NAME: 'en-US-Neural2-G', LANGUAGE: baseVars.LANGUAGE } },
      { id: 'editor', system_template: PROMPTS.editor(), defaults: { DURATION_S: ch.durations.short } },
      { id: 'distribution', system_template: PROMPTS.distribution(), defaults: {} }
    ];

    for (const p of prompts) {
      await ref.collection('prompts').doc(p.id).set({
        system_template: p.system_template,
        defaults: p.defaults,
        vars: baseVars,
        updated_at: new Date().toISOString()
      }, { merge: true });
    }

    console.log(`✅ Seeded: ${ch.slug}`);
  }
  
  console.log('🎉 Firestore seeding complete!');
}

seed().then(() => {
  console.log('✨ All channels and prompts have been seeded to Firestore');
  process.exit(0);
}).catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});