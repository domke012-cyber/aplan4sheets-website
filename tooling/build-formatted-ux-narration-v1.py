"""Create a new set of versioned clips. Existing media is never overwritten.

Run with edge-tts and imageio-ffmpeg installed. Input is the public, fictional
walkthrough script; generated clips are static assets, with no visitor TTS call.
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
SPEC = json.loads((ROOT / 'assets/formatted-ux-narration-v1.json').read_text())
OUTPUT = ROOT / 'demo/audio/formatted-ux-v1'
OUTPUT.mkdir(parents=True, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def run(*args):
    return subprocess.run([FFMPEG, '-hide_banner', *args], check=True,
                          capture_output=True, text=True)


async def main():
    with tempfile.TemporaryDirectory(prefix='formatted-ux-voice-') as temporary:
        for key, text in SPEC['clips'].items():
            target = OUTPUT / (key + '.mp3')
            if target.exists():
                print(f'Preserved {target.name}', flush=True)
                continue
            raw = Path(temporary) / (key + '.mp3')
            await edge_tts.Communicate(text, SPEC['voice'], rate=SPEC['rate']).save(str(raw))
            analysis = run('-i', str(raw), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-')
            stats = json.loads(re.search(r'\{\s*"input_i"[\s\S]*?\}', analysis.stderr)[0])
            normalize = ('loudnorm=I=-16:TP=-1.5:LRA=7:measured_I={input_i}:'
                         'measured_TP={input_tp}:measured_LRA={input_lra}:'
                         'measured_thresh={input_thresh}:offset={target_offset}:linear=true').format(**stats)
            run('-loglevel', 'error', '-i', str(raw), '-af', normalize,
                '-ar', '44100', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '128k', str(target))
            run('-v', 'error', '-i', str(target), '-f', 'null', '-')
            print(f'Generated and decoded {target.name}', flush=True)


asyncio.run(main())
