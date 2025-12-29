import path from "node:path";
import type { PrismaConfig } from "prisma";
import dotenv from "dotenv";

dotenv.config({
	path: "../../apps/server/.env",
});

export default {
	schema: path.join("prisma", "schema.prisma"),
	migrations: {
		path: path.join("prisma", "migrations"),
	},
} satisfies PrismaConfig;
