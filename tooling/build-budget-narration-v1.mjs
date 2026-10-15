// Generate only the new fictional budget tour; existing demo audio is untouched.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile), root = path.resolve(import.meta.dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/budget-review-data-v1.js'), 'utf8'), context);
if (!process.env.EDGE_TTS || !process.env.FFMPEG) throw new Error('Provide EDGE_TTS and FFMPEG executable paths.');
const output = path.join(root, 'demo/audio/v3');
const entries = context.window.BudgetReviewData.scenes.map((s, i) => ({ text: s.caption, name: `budget-review-${i + 1}.mp3` }));
for (const entry of entries) if (fs.existsSync(path.join(output, entry.name))) throw new Error('Refusing to overwrite existing narration. Use a new version.');
fs.mkdirSync(output, { recursive: true });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aplan-budget-narration-'));
let cursor = 0;
async function worker() {
  while (cursor < entries.length) {
    const { text, name } = entries[cursor++], raw = path.join(temporary, name);
    await exec(process.env.EDGE_TTS, ['--voice', 'en-US-AriaNeural', '--rate=+0%', '--text', text, '--write-media', raw]);
    const run = await exec(process.env.FFMPEG, ['-hide_banner', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-']);
    const stats = JSON.parse(run.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
    const filter = `loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`;
    await exec(process.env.FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', raw, '-af', filter, '-ar', '44100', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '128k', path.join(output, name)]);
    console.log(name);
  }
}
await Promise.all([worker(), worker()]);
console.log(`Generated ${entries.length} new budget-review clips. Original tracks unchanged.`);
