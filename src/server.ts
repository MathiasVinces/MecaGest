import { bootstrap } from './bootstrap.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe ser un entero entre 1 y 65535');
const host = process.env.HOST ?? '127.0.0.1';
const { app, db } = bootstrap(process.env.DATABASE_PATH ?? 'data/mecagest.sqlite');
const server = app.listen(port, host, () => console.log(`MecaGest: http://${host}:${port}/ | API: http://${host}:${port}/docs/`));
server.on('error', error => { console.error(error.message); db.close(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { server.close(() => { db.close(); process.exit(0); }); });
}
