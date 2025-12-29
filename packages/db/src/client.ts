import { PrismaClient } from "../generated";

const prisma = new PrismaClient();

export * from "../generated";
export default prisma;
