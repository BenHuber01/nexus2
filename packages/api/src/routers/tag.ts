import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const tagRouter = router({
    getAll: protectedProcedure.query(({ ctx }) => {
        return ctx.prisma.tag.findMany({
            orderBy: { name: "asc" },
        });
    }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string(),
                color: z.string().optional(),
                description: z.string().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.tag.create({
                data: input,
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.tag.delete({
                where: { id: input.id },
            });
        }),
});
