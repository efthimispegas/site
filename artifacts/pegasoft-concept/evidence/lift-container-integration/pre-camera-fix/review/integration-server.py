"""Local integration review server with bounded, non-overwriting replay saves."""
from http.server import ThreadingHTTPServer
from pathlib import Path
import re
from server import Handler, ROOT


class IntegrationHandler(Handler):
    def do_POST(self):
        match = re.fullmatch(r'/capture/(C01-(?:full|settling)-(?:forward|reverse)-(?:normal|quarter)\.(?:webm|json))', self.path)
        size = int(self.headers.get('Content-Length', '0'))
        if self.headers.get('Origin') != 'http://127.0.0.1:8767' or not match or not 0 < size <= 100 * 1024 * 1024:
            self.send_error(400, 'Invalid local replay capture')
            return
        folder = ROOT / 'evidence/lift-container-integration/playback'
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / match[1]
        data = self.rfile.read(size)
        if len(data) != size:
            self.send_error(400, 'Incomplete replay')
            return
        try:
            with path.open('xb') as output:
                output.write(data)
        except FileExistsError:
            self.send_error(409, 'Replay already retained')
            return
        self.send_response(201)
        self.send_header('Content-Length', '0')
        self.end_headers()


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8767), IntegrationHandler).serve_forever()
