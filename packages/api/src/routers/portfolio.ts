import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const portfolioRouter = router({
    getAll: protectedProcedure
        .input(z.object({ organizationId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.portfolio.findMany({
                where: { organizationId: input.organizationId },
                include: {
                    projects: true,
                },
            });
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.portfolio.findUnique({
                where: { id: input.id },
                include: {
                    projects: true,
                },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string(),
                description: z.string().optional(),
                strategicGoal: z.string().optional(),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
                organizationId: z.string(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.portfolio.create({
                data: input,
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().optional(),
                description: z.string().optional(),
                strategicGoal: z.string().optional(),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.prisma.portfolio.update({
                where: { id },
                data,
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.portfolio.delete({
                where: { id: input.id },
            });
        }),
});
