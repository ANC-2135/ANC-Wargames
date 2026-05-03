import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Click } from '@anc/shared';
import type { DB } from '../db.ts';

const ClickInputSchema = z.object({
  teamId: z.string().min(1).max(64),
  q: z.number().int(),
  r: z.number().int(),
});

const ClickRowSchema = z.object({
  id: z.number().int(),
  teamId: z.string(),
  q: z.number().int(),
  r: z.number().int(),
  createdAt: z.string(),
});

interface ClickRow {
  id: number;
  team_id: string;
  q: number;
  r: number;
  created_at: string;
}

function rowToClick(r: ClickRow): Click {
  return { id: r.id, teamId: r.team_id, q: r.q, r: r.r, createdAt: r.created_at };
}

export const clicksRoutes =
  (db: DB): FastifyPluginAsyncZod =>
  async (app) => {
    const insert = db.prepare<[string, number, number]>(
      'INSERT INTO clicks (team_id, q, r) VALUES (?, ?, ?)',
    );
    const selectById = db.prepare<[number | bigint], ClickRow>(
      'SELECT id, team_id, q, r, created_at FROM clicks WHERE id = ?',
    );
    const selectRecent = db.prepare<[number], ClickRow>(
      'SELECT id, team_id, q, r, created_at FROM clicks ORDER BY id DESC LIMIT ?',
    );

    app.post(
      '/api/clicks',
      {
        schema: {
          body: ClickInputSchema,
          response: { 201: ClickRowSchema },
        },
      },
      async (req, reply) => {
        const { teamId, q, r } = req.body;
        const info = insert.run(teamId, q, r);
        const row = selectById.get(info.lastInsertRowid);
        if (!row) throw new Error('insert succeeded but row not found');
        reply.code(201);
        return rowToClick(row);
      },
    );

    app.get(
      '/api/clicks',
      {
        schema: {
          querystring: z.object({ limit: z.coerce.number().int().min(1).max(500).default(50) }),
          response: { 200: z.array(ClickRowSchema) },
        },
      },
      async (req) => {
        return selectRecent.all(req.query.limit).map(rowToClick);
      },
    );
  };
