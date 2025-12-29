import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const milestoneRouter = router({
    getAll: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.milestone.findMany({
                where: { projectId: input.projectId },
                orderBy: { dueDate: "asc" },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string(),
                description: z.string().optional(),
                dueDate: z.date(),
                projectId: z.string(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.milestone.create({
                data: input,
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().optional(),
                description: z.string().optional(),
                dueDate: z.date().optional(),
                completed: z.boolean().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.prisma.milestone.update({
                where: { id },
                data,
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.milestone.delete({
                where: { id: input.id },
            });
        }),
});
