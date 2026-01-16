cd /d ../

::Setting up the server

py -c "from http.server import HTTPServer, SimpleHTTPRequestHandler as SHTH; c = type('CORSRequestHandler', (SHTH,), {'end_headers': lambda self: [self.send_header('Access-Control-Allow-Origin', '*'), self.send_header('Access-Control-Allow-Methods', 'GET'), self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate'), SHTH.end_headers(self)]}); HTTPServer(('localhost', 8003), c).serve_forever()"

::Pause the window
pause