#!/usr/bin/env bash
# Servidor do design system. Porta fixa 8080 — sempre a mesma.
# Sem cache: editar um token e recarregar mostra a mudança na hora.
cd "$(dirname "$0")" || exit 1
PORT=8080
lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null | xargs -r kill 2>/dev/null
python3 - "$PORT" <<'PY'
import sys, json, http.server, socketserver

# Uma unica rota de escrita: POST /__retrato grava test/atual.json.
#
# Existe porque o retrato de layout nasce no NAVEGADOR (test/layout.js precisa
# de viewport de verdade) e tem que chegar ao disco para o tools/baseline.mjs
# comparar. Antes o caminho era copiar 60 KB de JSON do console na mao — o tipo
# de passo que se erra e ninguem percebe, e que fazia a rede de layout ser
# recapturada raramente.
#
# So loopback, so este caminho, so JSON que parseia, so este arquivo. Servidor
# de desenvolvimento nao e servidor: se este trecho aparecer em qualquer coisa
# publicada, o errado e a publicacao.
DESTINO = 'test/atual.json'
LIMITE = 4 * 1024 * 1024


class Servidor(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, *a):
        pass

    def do_POST(self):
        if self.path != '/__retrato':
            self.send_error(404); return
        if self.client_address[0] not in ('127.0.0.1', '::1'):
            self.send_error(403, 'so loopback'); return
        n = int(self.headers.get('Content-Length') or 0)
        if not 0 < n <= LIMITE:
            self.send_error(413); return
        try:
            dados = json.loads(self.rfile.read(n).decode('utf-8'))
        except Exception as e:
            self.send_error(400, f'JSON invalido: {e}'); return
        with open(DESTINO, 'w', encoding='utf-8') as f:
            json.dump(dados, f, indent=2, ensure_ascii=False)
            f.write('\n')
        pecas = sum(r.get('pecas', 0) for r in dados) if isinstance(dados, list) else 0
        corpo = json.dumps({'ok': True, 'arquivo': DESTINO, 'pecas': pecas}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)


port = int(sys.argv[1])
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", port), Servidor) as srv:
    print(f"Ybera Design System  ->  http://localhost:{port}/")
    print(f"  tokens      http://localhost:{port}/docs/")
    print(f"  componentes http://localhost:{port}/components/")
    print(f"  padrões     http://localhost:{port}/patterns/")
    print(f"  retrato     POST http://localhost:{port}/__retrato  ->  {DESTINO}")
    print("Ctrl+C para parar.")
    srv.serve_forever()
PY
