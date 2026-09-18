import os from 'os';
import path from 'path';
import fs from 'fs';
import serve from 'koa-static';
import { Server, Origins } from 'boardgame.io/dist/cjs/server.js';
import { DeflategateGame } from './src/Game.js';

const server = Server({
  games: [DeflategateGame],
  origins: [
    Origins.LOCALHOST,
    /.*/
  ],
});

// Serve frontend dist directory if it exists (for Render / cloud deployments)
const distPath = path.resolve('./dist');
if (fs.existsSync(distPath)) {
  server.app.use(serve(distPath));
  server.app.use(async (ctx, next) => {
    if (ctx.method !== 'GET' && ctx.method !== 'HEAD') return next();
    if (ctx.path.startsWith('/games') || ctx.path.startsWith('/socket.io')) return next();
    ctx.type = 'html';
    ctx.body = fs.createReadStream(path.join(distPath, 'index.html'));
  });
}

const port = process.env.PORT || 8000;

server.run(port, () => {
  console.log(`\n======================================================`);
  console.log(`🏈 Deflategate Multiplayer Server Active on port ${port}`);
  console.log(`======================================================`);
  console.log(`Host machine: http://localhost:3000`);

  const nets = os.networkInterfaces();
  const lanIps = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIps.push({ name, address: net.address });
      }
    }
  }

  if (lanIps.length > 0) {
    console.log(`\nTo play from another laptop on your Wi-Fi:`);
    lanIps.forEach(ip => {
      console.log(`👉 Open in browser: http://${ip.address}:3000 (${ip.name})`);
    });
  }
  console.log(`======================================================\n`);
});
