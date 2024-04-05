import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient({
	datasourceUrl: process.env.PG_URL,
});