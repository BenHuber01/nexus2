import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const retrospectiveRouter = router({
    getBySprintId: protectedProcedure
        .input(z.object({ sprintId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.retrospective.findUnique({
                where: { sprintId: input.sprintId },
            });
        }),

    upsert: protectedProcedure
        .input(
            z.object({
                sprintId: z.string(),
                content: z.any(),
                sentimentSummary: z.string().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            const { sprintId, ...data } = input;
            return ctx.prisma.retrospective.upsert({
                where: { sprintId },
                update: data,
                create: { sprintId, ...data },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.retrospective.delete({
                where: { id: input.id },
            });
        }),
});
