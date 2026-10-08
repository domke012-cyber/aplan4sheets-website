// Run with explicit local tool paths; no credentials or billable API keys required.
// EDGE_TTS=/path/to/edge-tts FFMPEG=/path/to/ffmpeg node tooling/build-narration.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/demo-narration.js'), 'utf8'), context);
const entries = Object.entries(context.window.DemoNarration).flatMap(([name, clips]) => clips.map((text, i) => ({ name, text, index: i + 1 })));
if (!process.env.EDGE_TTS || !process.env.FFMPEG) throw new Error('Provide EDGE_TTS and FFMPEG executable paths.');
const output = path.join(root, 'demo/audio/v2');
fs.mkdirSync(output, { recursive: true });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aplan-narration-'));
let cursor = 0;
async function worker() {
  while (cursor < entries.length) {
    const { name, text, index } = entries[cursor++];
    const filename = `${name}-${index}.mp3`;
    const raw = path.join(temporary, filename);
    await exec(process.env.EDGE_TTS, ['--voice', 'en-US-AriaNeural', '--rate=-3%', '--text', text, '--write-media', raw]);
    const analysis = await exec(process.env.FFMPEG, ['-hide_banner', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-']);
    const stats = JSON.parse(analysis.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
    const filter = `loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`;
    await exec(process.env.FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', raw, '-af', filter, '-ar', '44100', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '128k', path.join(output, filename)]);
    console.log(filename);
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
console.log(`Generated ${entries.length} versioned narration tracks. Original audio is unchanged. Temporary source files: ${temporary}`);
