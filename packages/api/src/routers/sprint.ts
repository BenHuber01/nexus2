import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const sprintRouter = router({
    getAll: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.sprint.findMany({
                where: { projectId: input.projectId },
                orderBy: { startDate: "desc" },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string(),
                goal: z.string().optional(),
                startDate: z.string().transform((str) => new Date(str)),
                endDate: z.string().transform((str) => new Date(str)),
                projectId: z.string(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.sprint.create({
                data: input,
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().optional(),
                goal: z.string().optional(),
                startDate: z.string().transform((str) => new Date(str)).optional(),
                endDate: z.string().transform((str) => new Date(str)).optional(),
                state: z.string().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.prisma.sprint.update({
                where: { id },
                data,
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.sprint.delete({
                where: { id: input.id },
            });
        }),

    getWorkItems: protectedProcedure
        .input(z.object({ sprintId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.workItem.findMany({
                where: { sprintId: input.sprintId },
                include: {
                    assignee: true,
                    state: true,
                },
                orderBy: { order: "asc" },
            });
        }),
});
