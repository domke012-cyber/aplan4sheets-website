"""Generate versioned static Andrew narration; preserve existing recordings.

Run with edge-tts and imageio-ffmpeg installed. Only the checked-in fictional
scripts are sent to the speech service. Visitors play same-site MP3 files.
"""
import asyncio
import json
from pathlib import Path
import re
import subprocess
import tempfile

import edge_tts
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
SPEC = json.loads((ROOT / 'assets/walkthrough-narration-v4.json').read_text())
OUTPUT = ROOT / 'demo/audio/v4'
OUTPUT.mkdir(parents=True, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def normalize(raw, target):
    def run(*args):
        return subprocess.run([FFMPEG, '-hide_banner', *args], check=True,
                              capture_output=True, text=True)
    analysis = run('-i', str(raw), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-')
    stats = json.loads(re.search(r'\{\s*"input_i"[\s\S]*?\}', analysis.stderr)[0])
    filters = ('loudnorm=I=-16:TP=-1.5:LRA=7:measured_I={input_i}:'
               'measured_TP={input_tp}:measured_LRA={input_lra}:'
               'measured_thresh={input_thresh}:offset={target_offset}:linear=true').format(**stats)
    run('-loglevel', 'error', '-i', str(raw), '-af', filters, '-ar', '44100',
        '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '128k', str(target))
    run('-v', 'error', '-i', str(target), '-f', 'null', '-')


async def main():
    semaphore = asyncio.Semaphore(3)
    with tempfile.TemporaryDirectory(prefix='walkthrough-voice-v4-') as temporary:
        async def generate(clip):
            target = OUTPUT / clip['file']
            if target.exists():
                print(f'Preserved {target.name}', flush=True)
                return
            async with semaphore:
                raw = Path(temporary) / clip['file']
                await edge_tts.Communicate(clip['text'], SPEC['voice'], rate=SPEC['rate']).save(str(raw))
                await asyncio.to_thread(normalize, raw, target)
                print(f'Generated and decoded {target.name}', flush=True)
        await asyncio.gather(*(generate(clip) for clip in SPEC['clips']))


asyncio.run(main())
