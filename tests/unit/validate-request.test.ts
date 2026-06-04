import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validateRequest } from '../../src/shared/middleware/validate-request';

describe('validateRequest unwrap', () => {
  it('unwraps nested body schema and validates flat req.body', async () => {
    const app = express();
    app.use(express.json());

    const createSchema = z.object({
      body: z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    });

    const handler = vi.fn((_req, res) => res.json({ ok: true }));

    app.post('/login', validateRequest({ body: createSchema }), handler);

    const res = await request(app)
      .post('/login')
      .send({ email: 'teacher@example.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('unwraps nested query schema', async () => {
    const app = express();

    const querySchema = z.object({
      query: z.object({
        page: z.coerce.number().default(1),
      }),
    });

    app.get('/items', validateRequest({ query: querySchema }), (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/items?page=2');
    expect(res.status).toBe(200);
  });

  it('leaves flat schemas unchanged', async () => {
    const app = express();
    app.use(express.json());

    const flatBody = z.object({
      name: z.string().min(1),
    });

    app.post('/x', validateRequest({ body: flatBody }), (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).post('/x').send({ name: 'Test' });
    expect(res.status).toBe(200);
  });
});
