import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const commentRouter = router({
    getByWorkItem: protectedProcedure
        .input(z.object({ workItemId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.comment.findMany({
                where: { workItemId: input.workItemId },
                include: { user: true },
                orderBy: { createdAt: "asc" },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                body: z.string(),
                isInternal: z.boolean().default(false),
                workItemId: z.string(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.comment.create({
                data: {
                    ...input,
                    userId: ctx.session.user.id,
                },
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                body: z.string(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.comment.update({
                where: { id: input.id },
                data: { body: input.body },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.comment.delete({
                where: { id: input.id },
            });
        }),
});
