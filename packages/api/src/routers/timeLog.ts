import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const timeLogRouter = router({
    getByWorkItem: protectedProcedure
        .input(z.object({ workItemId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.timeLog.findMany({
                where: { workItemId: input.workItemId },
                include: { user: true },
                orderBy: { logDate: "desc" },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                duration: z.number(),
                description: z.string().optional(),
                billable: z.boolean().default(true),
                logDate: z.date(),
                startedAt: z.date().optional(),
                endedAt: z.date().optional(),
                workItemId: z.string(),
                sprintId: z.string().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.timeLog.create({
                data: {
                    ...input,
                    userId: ctx.session.user.id,
                },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.timeLog.delete({
                where: { id: input.id },
            });
        }),
});
