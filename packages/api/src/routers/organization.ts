import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const organizationRouter = router({
    getAll: protectedProcedure.query(({ ctx }) => {
        return ctx.prisma.organization.findMany({
            where: {
                users: {
                    some: {
                        userId: ctx.session.user.id,
                    },
                },
            },
        });
    }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.organization.findUnique({
                where: { id: input.id },
                include: {
                    projects: true,
                    teams: true,
                },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string(),
                slug: z.string(),
                description: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const org = await ctx.prisma.organization.create({
                data: {
                    ...input,
                    users: {
                        create: {
                            userId: ctx.session.user.id,
                            role: "admin",
                        },
                    },
                },
            });
            return org;
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().optional(),
                slug: z.string().optional(),
                description: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input;
            const org = await ctx.prisma.organization.update({
                where: { id },
                data: updateData,
            });
            return org;
        }),
});
