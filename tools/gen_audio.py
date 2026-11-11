#!/usr/bin/env python3
"""Erzeugt die Aussprache-Dateien (audio/*.mp3) aus js/data.js.

Benötigt: pip install piper-tts, ffmpeg, node und das Piper-Stimmmodell
lb_LU-marylux-medium (.onnx + .onnx.json) von
https://huggingface.co/rhasspy/piper-voices/tree/main/lb/lb_LU/marylux/medium

Aufruf:  python3 tools/gen_audio.py /pfad/zu/lb_LU-marylux-medium.onnx
Vorhandene Dateien werden übersprungen; nach Textänderungen die Datei löschen.
"""
import io, json, os, re, subprocess, sys, wave
from piper import PiperVoice, SynthesisConfig

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "audio")

# Schreibweisen, die die Stimme nicht sauber liest → ausgeschrieben
SPOKEN = {
    "17:15 Auer": "siwwenzéng Auer fofzéng",
    "18 Grad": "uechtzéng Grad",
    "14 Grad": "véierzéng Grad",
    "Dr. Weber": "Dokter Weber",
}

def spoken(text):
    for a, b in SPOKEN.items():
        text = text.replace(a, b)
    text = re.sub(r"^[AB]: ", "", text)          # Sprecherkürzel im Dialog
    text = text.replace(" / ", ", ").replace("…", "").replace("(", "").replace(")", "")
    return re.sub(r"\s+", " ", text).strip()

def items():
    js = "global.window={};require(process.argv[1]);console.log(JSON.stringify(window.LUX_DATA))"
    d = json.loads(subprocess.check_output(["node", "-e", js, os.path.join(ROOT, "js", "data.js")]))
    for t in d["topics"]:
        for i, w in enumerate(t["words"]):
            yield f"c-{t['id']}-{i}", [w[0]]
            if len(w) > 2:
                yield f"e-{t['id']}-{i}", [w[2]]
    for i, s in enumerate(d["speaking"]):
        for j, q in enumerate(s["questions"]):
            yield f"sq-{i}-{j}", [q]
        if "images" in s:
            for k, im in enumerate(s["images"]):
                yield f"sm-{i}-{k}", [im["model"]]
        else:
            yield f"sm-{i}", [s["model"]]
    for i, dl in enumerate(d["dialogues"]):
        yield f"d-{i}", dl["text"]

def main():
    voice = PiperVoice.load(sys.argv[1])
    cfg = SynthesisConfig(length_scale=1.2)       # etwas langsamer, zum Lernen
    rate = voice.config.sample_rate
    n = 0
    for key, lines in items():
        dst = os.path.join(OUT, key + ".mp3")
        if os.path.exists(dst):
            continue
        pcm = b""
        for line in lines:
            for chunk in voice.synthesize(spoken(line), syn_config=cfg):
                pcm += chunk.audio_int16_bytes
            pcm += b"\0\0" * int(rate * 0.6)       # Pause zwischen Dialogzeilen
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", "pipe:0", "-ac", "1",
                        "-codec:a", "libmp3lame", "-b:a", "40k", dst], input=buf.getvalue(), check=True)
        n += 1
    print(f"{n} Dateien erzeugt")

if __name__ == "__main__":
    main()
