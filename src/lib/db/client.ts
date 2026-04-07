import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 1, // Serverless: una conexión por invocación
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
