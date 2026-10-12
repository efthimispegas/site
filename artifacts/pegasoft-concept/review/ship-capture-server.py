"""Optional localhost-only replay sink; approved port-8767 server stays intact."""
from http.server import ThreadingHTTPServer
from pathlib import Path
import re
import json
import hashlib
from server import Handler as StaticHandler, ROOT

class Handler(StaticHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', 'http://127.0.0.1:8767')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        if self.headers.get('Origin') != 'http://127.0.0.1:8767':
            self.send_error(403); return
        self.send_response(204); self.end_headers()

    def do_POST(self):
        match = re.fullmatch(r'/capture/(ship-(?:forward|reverse)-(?:normal|quarter)-\d{13}\.(?:webm|json))', self.path)
        size = int(self.headers.get('Content-Length', '0'))
        if not match or self.headers.get('Origin') != 'http://127.0.0.1:8767' or not 0 < size <= 100_000_000:
            self.send_error(400); return
        target = ROOT / 'evidence/ship-integration/playback' / match[1]
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            payload = self.rfile.read(size)
            if target.suffix == '.json':
                data = json.loads(payload)
                paths = ['review/story-typography.css','review/ship-integration.html','review/ship-integration.js','review/ship-integration-sequence.js','review/ship-water.js','review/ship-surface.js','review/ship-content.js','generation/ship-family/water-plate/ocean-motion.mp4','generation/ship-family/water-plate/ocean-still.png','review/ship-road.js','generation/ship-family/model-draft/S01-ship.glb', 'review/handoff-sequence.js', 'review/handoff-lift-rig.js', 'review/lift-container-contact.js', 'review/lift-motion-contract.js', 'review/lift-cab.js', 'review/lift-wheels.js', 'generation/truck-family/model-draft/truck-model.mjs', 'generation/truck-family/model-draft/T01-truck.glb', 'generation/container-family/model-draft/C01-container.glb', 'generation/lift-family/model-draft/model-carbon-unified.glb']
                data['recorded_inputs'] = [{'path': p, 'sha256': hashlib.sha256((ROOT / p).read_bytes()).hexdigest()} for p in paths]
                payload = json.dumps(data).encode()
            with target.open('xb') as stream:
                stream.write(payload)
        except FileExistsError:
            self.send_error(409); return
        self.send_response(201); self.end_headers(); self.wfile.write(match[1].encode())

ThreadingHTTPServer(('127.0.0.1', 8769), Handler).serve_forever()
