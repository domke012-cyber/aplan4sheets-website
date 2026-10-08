import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
if(!process.env.FFMPEG)throw Error('Set FFMPEG to an installed executable.');
const directory=path.join(root,'demo/audio/v2');
const results=[];
for(const name of fs.readdirSync(directory).filter(f=>f.endsWith('.mp3'))){
  const run=spawnSync(process.env.FFMPEG,['-hide_banner','-i',path.join(directory,name),'-af','loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json','-f','null','-'],{encoding:'utf8'});
  assert.equal(run.status,0,`${name}: decodes successfully`);
  const stats=JSON.parse(run.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
  const loudness=Number(stats.input_i),peak=Number(stats.input_tp);
  assert.ok(Number.isFinite(loudness)&&Math.abs(loudness+16)<=1.5,`${name}: loudness ${loudness} LUFS`);
  assert.ok(Number.isFinite(peak)&&peak<=-1.2,`${name}: true peak ${peak} dBTP`);
  assert.match(run.stderr,/44100 Hz, mono/,`${name}: consistent sample rate and channels`);
  const duration=run.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  const seconds=Number(duration[1])*3600+Number(duration[2])*60+Number(duration[3]);
  assert.ok(seconds>2&&seconds<25,`${name}: valid duration ${seconds}`);
  results.push({name,seconds,loudness,peak});
}
console.log(JSON.stringify({tracks:results.length,loudnessRange: [Math.min(...results.map(r=>r.loudness)),Math.max(...results.map(r=>r.loudness))],maximumTruePeak:Math.max(...results.map(r=>r.peak)),results},null,2));
