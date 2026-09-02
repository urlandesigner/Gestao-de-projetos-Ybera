#!/usr/bin/env bash
# Servidor do design system. Porta fixa 8080 — sempre a mesma.
# Sem cache: editar um token e recarregar mostra a mudança na hora.
cd "$(dirname "$0")" || exit 1
PORT=8080
lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null | xargs -r kill 2>/dev/null
python3 - "$PORT" <<'PY'
import sys, functools, http.server, socketserver
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1])
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", port), NoCache) as srv:
    print(f"Ybera Design System  ->  http://localhost:{port}/")
    print(f"  tokens      http://localhost:{port}/docs/")
    print(f"  componentes http://localhost:{port}/components/")
    print(f"  padrões     http://localhost:{port}/patterns/")
    print("Ctrl+C para parar.")
    srv.serve_forever()
PY
