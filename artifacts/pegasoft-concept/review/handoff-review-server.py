"""Launch the preserved review server with a larger local connection queue."""
from http.server import ThreadingHTTPServer
from pathlib import Path
import runpy

ThreadingHTTPServer.request_queue_size = 128
runpy.run_path(str(Path(__file__).with_name('integration-server.py')), run_name='__main__')
