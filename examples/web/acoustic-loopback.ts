/**
 * Offline acoustic loopback validation using real decoded speech waveforms.
 * Requires ffmpeg; no API calls and no speaker/microphone access.
 */
import { BargeInSpeechGate, PlaybackEchoFilter } from '@ottervoice/core';

const frameMs = 50;
const sampleRate = 16_000;

async function envelope(path: string, audioFilter?: string): Promise<number[]> {
  const process = Bun.spawn([
    'ffmpeg', '-loglevel', 'error', '-i', path,
    ...(audioFilter ? ['-af', audioFilter] : []),
    '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', 'pipe:1',
  ], { stdout: 'pipe', stderr: 'pipe' });
  const bytes = await new Response(process.stdout).arrayBuffer();
  if ((await process.exited) !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${await new Response(process.stderr).text()}`);
  }
  const samples = new Float32Array(bytes);
  const frameSamples = (sampleRate * frameMs) / 1_000;
  const levels: number[] = [];
  for (let start = 0; start < samples.length; start += frameSamples) {
    let sum = 0;
    const end = Math.min(samples.length, start + frameSamples);
    for (let index = start; index < end; index += 1) {
      const sample = samples[index] ?? 0;
      sum += sample * sample;
    }
    levels.push(Math.sqrt(sum / Math.max(1, end - start)));
  }
  return levels;
}

const assistantPath = process.argv[2] ?? 'docs/site/dist/opening.mp3';
const userPath = process.argv[3];
const assistant = await envelope(assistantPath);
// With no second clip, derive a distinct voice-like waveform from the fixture.
// This keeps the committed validation command self-contained.
const user = await envelope(
  userPath ?? assistantPath,
  userPath ? undefined : 'asetrate=48000*1.18,aresample=16000,atempo=1.08',
);

interface Scenario {
  name: string;
  delayFrames: number;
  echoGain: number;
  userStart?: number;
  knockAt?: number;
  forceCandidateAt?: number;
  expectResume?: boolean;
  expectInterruption: boolean;
}

function run(scenario: Scenario) {
  const filter = new PlaybackEchoFilter({ frameMs });
  filter.start(0);
  const gate = new BargeInSpeechGate();
  const totalFrames = assistant.length;
  let candidateFrame: number | undefined;
  let confirmedFrame: number | undefined;
  let resumed = false;
  let silentFrames = 0;
  let maxResidual = 0;
  for (let frame = 0; frame < totalFrames; frame += 1) {
    const at = frame * frameMs;
    if (candidateFrame === undefined) {
      filter.pushOutput(assistant[frame] ?? 0, at);
    }
    const echoSourceFrame = frame - scenario.delayFrames;
    const echoStillAudible =
      echoSourceFrame >= 0 &&
      (candidateFrame === undefined || echoSourceFrame < candidateFrame);
    const echo =
      (echoStillAudible ? (assistant[echoSourceFrame] ?? 0) : 0) * scenario.echoGain;
    const userFrame = scenario.userStart === undefined ? -1 : frame - scenario.userStart;
    const userLevel = userFrame >= 0 ? (user[userFrame] ?? 0) * 1.15 : 0;
    const knock = frame === scenario.knockAt ? 0.25 : 0;
    const noise = 0.001 + (frame % 4) * 0.00025;
    const microphone = Math.sqrt(
      echo * echo + userLevel * userLevel + knock * knock + noise * noise,
    );
    if (candidateFrame === undefined) {
      const residual = filter.filter(microphone, at);
      maxResidual = Math.max(maxResidual, residual);
      if (gate.push(residual) || frame === scenario.forceCandidateAt) {
        candidateFrame = frame;
        filter.stop();
      }
      continue;
    }

    // After a tentative pause, only distinct user speech confirms. Echo tail
    // just keeps the mic warm until silence resumes playback.
    if (frame - candidateFrame < 8) continue;
    if (microphone >= 0.018) silentFrames = 0;
    else silentFrames += 1;
    const userSpeaking = userFrame >= 0 && (user[userFrame] ?? 0) > 0.01;
    if (userSpeaking) {
      confirmedFrame = frame;
      break;
    }
    if (silentFrames >= 5) {
      resumed = true;
      break;
    }
  }
  const speechStartAt = confirmedFrame === undefined ? undefined : confirmedFrame * frameMs;
  const passed = scenario.expectInterruption
    ? speechStartAt !== undefined && speechStartAt - (scenario.userStart ?? 0) * frameMs <= 900
    : speechStartAt === undefined && (!scenario.expectResume || resumed);
  return {
    ...scenario,
    passed,
    candidateAt: candidateFrame === undefined ? undefined : candidateFrame * frameMs,
    speechStartAt,
    resumed,
    maxResidual,
  };
}

const scenarios: Scenario[] = [];
for (const delayFrames of [0, 1, 3, 5, 6]) {
  for (const echoGain of [0.2, 0.5, 0.8, 1.2]) {
    scenarios.push({
      name: `echo-only ${delayFrames * frameMs}ms ${echoGain}x`,
      delayFrames,
      echoGain,
      expectInterruption: false,
    });
  }
}
scenarios.push({
  name: 'desk knock over echo', delayFrames: 3, echoGain: 0.8,
  knockAt: 30, expectInterruption: false,
});
scenarios.push({
  name: 'AEC glitch pauses then resumes', delayFrames: 3, echoGain: 0.8,
  forceCandidateAt: 30, expectResume: true, expectInterruption: false,
});
scenarios.push({
  name: 'welcome early user speech', delayFrames: 2, echoGain: 0.8,
  userStart: 2, expectInterruption: true,
});
scenarios.push({
  name: 'later user speech', delayFrames: 5, echoGain: 1.0,
  userStart: 42, expectInterruption: true,
});

const results = scenarios.map(run);
console.table(results.map(({ name, passed, candidateAt, speechStartAt, resumed, maxResidual }) => ({
  scenario: name,
  passed,
  candidateMs: candidateAt ?? '-',
  speechStartMs: speechStartAt ?? '-',
  resumed,
  maxResidual: maxResidual.toFixed(4),
})));
const failures = results.filter((result) => !result.passed);
if (failures.length > 0) {
  throw new Error(`${failures.length} acoustic loopback scenarios failed`);
}
console.log(`Passed ${results.length}/${results.length} real-waveform acoustic scenarios.`);
