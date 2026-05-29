const https = require('https');
const http  = require('http');

const FINNHUB_KEY = 'd8ceighr01qidic7k51gd8ceighr01qidic7k520';
const PORT        = process.env.PORT || 3000;

// Simple CORS-enabled proxy for Finnhub
const server = http.createServer((req, res) => {

  // CORS headers — allow any origin
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({status:'ok', time: new Date().toISOString()}));
    return;
  }

  // /quote?symbol=SPY
  if (url.pathname === '/quote') {
    const symbol = url.searchParams.get('symbol');
    if (!symbol) { res.writeHead(400); res.end('Missing symbol'); return; }
    finnhubGet(`/quote?symbol=${symbol}`, res);
    return;
  }

  // /candles?symbol=SPY&from=1234567890&to=1234567890
  if (url.pathname === '/candles') {
    const symbol = url.searchParams.get('symbol');
    const from   = url.searchParams.get('from');
    const to     = url.searchParams.get('to');
    if (!symbol || !from || !to) { res.writeHead(400); res.end('Missing params'); return; }
    finnhubGet(`/stock/candle?symbol=${symbol}&resolution=5&from=${from}&to=${to}`, res);
    return;
  }

  res.writeHead(404); res.end('Not found');
});

function finnhubGet(path, res) {
  const options = {
    hostname: 'finnhub.io',
    path:     `/api/v1${path}&token=${FINNHUB_KEY}`,
    method:   'GET',
    headers:  { 'User-Agent': 'trading-dashboard/1.0' }
  };
  const req = https.request(options, (r) => {
    let data = '';
    r.on('data', chunk => data += chunk);
    r.on('end', () => {
      res.writeHead(r.statusCode, {'Content-Type':'application/json'});
      res.end(data);
    });
  });
  req.on('error', (e) => {
    res.writeHead(500, {'Content-Type':'application/json'});
    res.end(JSON.stringify({error: e.message}));
  });
  req.end();
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
