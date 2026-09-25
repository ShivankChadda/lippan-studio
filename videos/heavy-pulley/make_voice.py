"""Synthesize the Hindi voice-over clips listed in narration.py.

Uses AI4Bharat's Indic-TTS Hindi FastPitch + HiFi-GAN checkpoints through
Coqui TTS, fully offline. Clips whose text has not changed are skipped.

    INDIC_TTS_HI=/opt/tts/hi python make_voice.py [--speaker male|female] [--force]
"""

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np

from narration import NARRATION

HERE = Path(__file__).resolve().parent
AUDIO = HERE / "audio"
MANIFEST = AUDIO / "manifest.json"
MODEL_DIR = Path(os.environ.get("INDIC_TTS_HI", "/opt/tts/hi"))


def load_synth():
    from TTS.utils.synthesizer import Synthesizer

    fp, hg = MODEL_DIR / "fastpitch", MODEL_DIR / "hifigan"
    return Synthesizer(
        tts_checkpoint=str(fp / "best_model.pth"),
        tts_config_path=str(fp / "config.json"),
        tts_speakers_file=str(fp / "speakers.pth"),
        vocoder_checkpoint=str(hg / "best_model.pth"),
        vocoder_config=str(hg / "config.json"),
        use_cuda=False,
    )


def model_vocab():
    cfg = json.loads((MODEL_DIR / "fastpitch" / "config.json").read_text())
    chars = cfg["characters"]
    return set(chars["characters"]) | set(chars["punctuations"])


def trim_and_polish(wav, sr, pad=0.06):
    """Cut leading/trailing silence, add short fades, peak-normalize to -1 dBFS."""
    wav = np.asarray(wav, dtype=np.float32)
    frame = int(0.02 * sr)
    energy = np.array([np.sqrt(np.mean(wav[i:i + frame] ** 2)) for i in range(0, len(wav) - frame, frame)])
    voiced = np.where(energy > 0.02 * energy.max())[0]
    start = max(0, voiced[0] * frame - int(pad * sr))
    end = min(len(wav), (voiced[-1] + 1) * frame + int(pad * sr))
    wav = wav[start:end]
    fade = int(0.015 * sr)
    wav[:fade] *= np.linspace(0, 1, fade)
    wav[-fade:] *= np.linspace(1, 0, fade)
    return wav * (10 ** (-1 / 20) / np.abs(wav).max())


def write_flac(path, wav, sr):
    import soundfile

    soundfile.write(str(path), np.clip(wav, -1, 1), sr, format="FLAC", subtype="PCM_16")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--speaker", default="male", choices=["male", "female"])
    ap.add_argument("--force", action="store_true")
    ap.add_argument("keys", nargs="*", help="only these clips")
    args = ap.parse_args()

    vocab = model_vocab()
    bad = {k: sorted(set(t) - vocab) for k, t in NARRATION if set(t) - vocab}
    if bad:
        sys.exit(f"characters the model cannot speak: {bad}")

    AUDIO.mkdir(exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    synth = None
    for key, text in NARRATION:
        if args.keys and key not in args.keys:
            continue
        sha = hashlib.sha1(f"{args.speaker}|{text}".encode()).hexdigest()[:12]
        out = AUDIO / f"{key}.flac"
        if not args.force and out.exists() and manifest.get(key, {}).get("sha") == sha:
            continue
        synth = synth or load_synth()
        sr = synth.output_sample_rate
        wav = trim_and_polish(synth.tts(text, speaker_name=args.speaker), sr)
        write_flac(out, wav, sr)
        manifest[key] = {"sha": sha, "duration": round(len(wav) / sr, 3)}
        print(f"{key:9s} {len(wav) / sr:5.2f}s")

    MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
    total = sum(v["duration"] for k, v in manifest.items() if k in dict(NARRATION))
    print(f"total narration: {total / 60:.1f} min")


if __name__ == "__main__":
    main()
