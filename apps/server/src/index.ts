import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { openDatabase } from './db.ts';
import { clicksRoutes } from './routes/clicks.ts';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const DB_PATH = process.env.DB_PATH ?? './data/anc.db';

async function main(): Promise<void> {
  const db = openDatabase(DB_PATH);

  const app = Fastify({
    logger: { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } } },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: true });

  app.get('/api/health', async () => ({ status: 'ok' }));
  await app.register(clicksRoutes(db));

  const closeDb = (): void => {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  };
  app.addHook('onClose', async () => closeDb());
  process.on('SIGINT', () => app.close().finally(() => process.exit(0)));
  process.on('SIGTERM', () => app.close().finally(() => process.exit(0)));

  await app.listen({ host: HOST, port: PORT });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
