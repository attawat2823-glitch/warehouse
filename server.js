// Maison Stock — เซิร์ฟเวอร์ไฟล์เดียว (ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'data.json');
const COLL = ['users', 'products', 'logs'];
let db = { users: {}, products: {}, logs: {} };
try { db = { ...db, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch (e) {}
const save = () => { fs.writeFileSync(FILE + '.tmp', JSON.stringify(db)); fs.renameSync(FILE + '.tmp', FILE); };
const json = (res, o) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };

const handler = (req, res) => {
  const parts = new URL(req.url, 'http://x').pathname.split('/').filter(Boolean);
  if (parts[0] === 'api' && COLL.includes(parts[1])) {
    const c = db[parts[1]], id = parts[2] && decodeURIComponent(parts[2]);
    if (id === '__proto__') { res.writeHead(400); return res.end(); }
    if (req.method === 'GET' && !id) return json(res, Object.entries(c).map(([k, v]) => ({ _id: k, ...v })));
    if (req.method === 'PUT' && id) {
      let b = '';
      req.on('data', d => { b += d; if (b.length > 1e6) req.destroy(); });
      req.on('end', () => { try { c[id] = JSON.parse(b); save(); json(res, { ok: 1 }); } catch (e) { res.writeHead(400); res.end(); } });
      return;
    }
    if (req.method === 'DELETE' && id) { delete c[id]; save(); return json(res, { ok: 1 }); }
    res.writeHead(405); return res.end();
  }
  fs.readFile(path.join(__dirname, 'index.html'), (e, d) => {
    if (e) { res.writeHead(404); return res.end('index.html not found'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(d);
  });
};
http.createServer(handler).listen(PORT, '0.0.0.0', () => {
  console.log('Maison Stock กำลังทำงาน');
  console.log('  เครื่องนี้:      http://localhost:' + PORT);
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
  ips.forEach(a => console.log('  เครื่องอื่นในวง LAN: http://' + a + ':' + PORT));
  console.log('ข้อมูลเก็บที่ ' + FILE);
  try {
    const opt = { key: fs.readFileSync(path.join(__dirname, 'key.pem')), cert: fs.readFileSync(path.join(__dirname, 'cert.pem')) };
    const SP = process.env.SPORT || 3443;
    require('https').createServer(opt, handler).listen(SP, '0.0.0.0', () => {
      console.log('--- โหมด https (ใช้กล้องแสกนได้) ---');
      ips.forEach(a => console.log('  https://' + a + ':' + SP));
    });
  } catch (e) { console.log('(ไม่พบ key.pem / cert.pem จึงไม่เปิดโหมด https)'); }
});
