const https = require('https');
const http  = require('http');
const PORT  = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({status:'ok', time: new Date().toISOString()}));
    return;
  }

  // /stock?symbol=SPY  — returns quote + 5min bars combined
  if (url.pathname === '/stock') {
    const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
    if (!symbol) { res.writeHead(400); res.end(JSON.stringify({error:'Missing symbol'})); return; }

    const yahooUrl = `/v8/finance/chart/${symbol}?interval=5m&range=1d&includePrePost=false`;
    yahooGet(yahooUrl, (err, data) => {
      if (err) {
        res.writeHead(502, {'Content-Type':'application/json'});
        res.end(JSON.stringify({error: err.message}));
        return;
      }
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(data);
    });
    return;
  }

  res.writeHead(404); res.end(JSON.stringify({error:'Not found'}));
});

function yahooGet(path, cb) {
  const options = {
    hostname: 'query1.finance.yahoo.com',
    path,
    method:  'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; trading-dashboard/1.0)',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  };
  const req = https.request(options, (r) => {
    let data = '';
    r.on('data', chunk => data += chunk);
    r.on('end', () => {
      if (r.statusCode !== 200) {
        cb(new Error(`Yahoo HTTP ${r.statusCode}`));
      } else {
        cb(null, data);
      }
    });
  });
  req.on('error', e => cb(e));
  req.setTimeout(8000, () => { req.destroy(); cb(new Error('Timeout')); });
  req.end();
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
