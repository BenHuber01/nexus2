import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const teamRouter = router({
    getAll: protectedProcedure
        .input(z.object({ organizationId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.team.findMany({
                where: { organizationId: input.organizationId },
                include: {
                    members: {
                        include: { user: true },
                    },
                },
            });
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.team.findUnique({
                where: { id: input.id },
                include: {
                    members: {
                        include: { user: true },
                    },
                    projects: true,
                },
            });
        }),
});
