import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
if(!process.env.FFMPEG)throw Error('Set FFMPEG to an installed executable.');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/budget-review-data-v1.js'),'utf8'),context);
const scenes=context.window.BudgetReviewData.scenes,results=[];
for(let i=0;i<scenes.length;i++){
  const name=`budget-review-${i+1}.mp3`;
  const run=spawnSync(process.env.FFMPEG,['-hide_banner','-i',path.join(root,'demo/audio/v3',name),'-af','loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json','-f','null','-'],{encoding:'utf8'});
  assert.equal(run.status,0,`${name}: decodes`);
  const stats=JSON.parse(run.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
  const loudness=Number(stats.input_i),peak=Number(stats.input_tp);
  assert.ok(Math.abs(loudness+16)<=1.5,`${name}: loudness ${loudness}`);
  assert.ok(Number.isFinite(peak)&&peak<=-1.2,`${name}: peak ${peak}`);
  assert.match(run.stderr,/44100 Hz, mono/);
  const d=run.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/),seconds=Number(d[1])*3600+Number(d[2])*60+Number(d[3]);
  assert.ok(seconds>10&&seconds<35,`${name}: duration ${seconds}`);
  results.push({name,seconds,loudness,peak,sceneSeconds:Math.max(scenes[i].duration/1000,seconds+.5)});
}
console.log(JSON.stringify({tracks:results.length,totalTourSeconds:results.reduce((n,r)=>n+r.sceneSeconds,0),results},null,2));
