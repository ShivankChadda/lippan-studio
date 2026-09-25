# Heavy pulley: finding I with a stopwatch

A 3Blue1Brown-style Manim video, about 7½ minutes long, that explains and solves this problem:

> A heavy pulley has radius 2 cm. A light string runs over it, with a 400 g mass on one end
> and a 350 g mass on the other. The system starts at rest, and the heavier mass moves
> 81 cm down in 9 s. Find the pulley's moment of inertia (g = 9.8 m/s², no slipping,
> frictionless axle).

**Answer: (C) I = 9.5 × 10⁻³ kg m²**

- The background is creme. All text on screen is in English.
- The voice-over is in Hindi (Devanagari). It uses English physics terms the way Indian
  classrooms do: टेंशन, टॉर्क, मोमेंट ऑफ़ इनर्शिया.
- The rendered video is `heavy_pulley_hindi.mp4` (1080p, 60 fps).

## How the video teaches it

| # | Section | What the viewer sees |
|---|---------|----------------------|
| 1 | Hook | The pulley is drawn and the question "I = ?" appears. A ruler and a stopwatch are all we need. |
| 2 | Given | Each quantity is converted to SI units, and the diagram is labelled as it goes. |
| 3 | Motion | The machine runs in **real time**: the timer counts to 9 s while the heavy block drops 0.81 m. |
| 4 | Step 1 | Kinematics: s = ut + ½at², u = 0, so a = 2s/t² = 0.02 m/s². The result stays in a corner chip. |
| 5 | Comparison | With a massless pulley, a₀ ≈ 0.65 m/s². A faded "massless" pulley covers the same 0.81 m in about 1.6 s. The real pulley is about 33× slower, so its mass matters. |
| 6 | Step 2 | A heavy pulley needs a net torque, so T₁ ≠ T₂. The tension arrows and the direction of spin appear on the pulley. |
| 7 | Newton II | Free-body diagrams for both blocks give equations (1) and (2). |
| 8 | Rotation | τ = (T₁ − T₂)r = Iα, and no-slip gives α = a/r. Together they give equation (3). |
| 9 | Combine | Adding and substituting gives **(m₁ − m₂)g = (m₁ + m₂ + I/r²)a**. The video then "unrolls" the string into a train of masses, with the pulley as an extra purple mass I/r². |
| 10 | Step 3 | Solve for I: 0.49 N → 24.5 kg → I/r² = 23.75 kg → I = 9.5 × 10⁻³ kg m². |
| 11 | Check | The torque route: T₁ = 3.912 N and T₂ = 3.437 N, so τ = 9.5 × 10⁻³ N m. Since α = 1 rad/s², I = τ/α gives the same answer. |
| 12 | Options | (C) is correct. (A) is exactly half of (C): it is what you get by treating 23.75 kg as the pulley's mass and applying the disc formula ½Mr². The problem never gives the pulley's shape, and the solution never needs it. |
| 13 | Recap | The three-step method, then the answer. |

## Files

| File | Purpose |
|------|---------|
| `scene.py` | The Manim CE scene `HeavyPulley`. |
| `narration.py` | The Hindi script, one clip per animation beat. |
| `make_voice.py` | Offline Hindi TTS that writes `audio/<key>.flac` and `audio/manifest.json`. |
| `audio/` | The synthesized clips (committed, so you can re-render without the TTS model). |

Sound and animation stay in sync because each block in the scene looks like
`with self.say("acc_4"): ...`. That call starts clip `acc_4`, runs the animations for that
beat, and then waits for the clip to finish. If you change a line in `narration.py`, re-run
`make_voice.py`: only the changed clips are regenerated, and the timing adapts automatically.

## Render

Rendering needs Python 3.10–3.12, ffmpeg, a LaTeX install with `dvisvgm`, and the Cairo and
Pango development headers.

```bash
python -m venv .venv && .venv/bin/pip install manim
.venv/bin/manim -qh scene.py HeavyPulley   # 1080p60 -> media/videos/scene/1080p60/HeavyPulley.mp4
.venv/bin/manim -ql scene.py HeavyPulley   # quick 480p preview
```

To review the layout, set `SNAP_DIR=/some/dir`. The scene then saves the last frame of every
narration clip as a PNG.

## Regenerate the Hindi voice (optional)

The voice comes from [AI4Bharat Indic-TTS](https://github.com/AI4Bharat/Indic-TTS): Hindi
FastPitch plus HiFi-GAN, male speaker, run offline on the CPU through Coqui TTS.

```bash
curl -LO https://github.com/AI4Bharat/Indic-TTS/releases/download/v1-checkpoints-release/hi.zip  # ~1.5 GB
unzip hi.zip -d /opt/tts
# the config stores a relative speakers path; point it at the unzipped file
sed -i 's#"models/v1/hi/fastpitch/speakers.pth"#"/opt/tts/hi/fastpitch/speakers.pth"#g' /opt/tts/hi/fastpitch/config.json

python -m venv /opt/ttsvenv
/opt/ttsvenv/bin/pip install coqui-tts "transformers>=4.57,<4.58" "torch<2.9" "torchaudio<2.9"
INDIC_TTS_HI=/opt/tts/hi /opt/ttsvenv/bin/python make_voice.py            # --speaker female also works
```

The model only reads Devanagari characters and a few punctuation marks. For that reason,
every symbol and number in `narration.py` is spelled out, for example "शून्य दशमलव शून्य दो"
for 0.02. `make_voice.py` refuses to run if any other character slips in.
