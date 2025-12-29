import type { Context as ElysiaContext } from "elysia";
import { auth } from "@my-better-t-app/auth";
import prisma from "@my-better-t-app/db/client";

export type CreateContextOptions = {
	context: ElysiaContext;
};

export async function createContext({ context }: CreateContextOptions): Promise<{
	session: any;
	prisma: any;
}> {
	const session = await auth.api.getSession({
		headers: context.request.headers,
	});
	return {
		session,
		prisma,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
