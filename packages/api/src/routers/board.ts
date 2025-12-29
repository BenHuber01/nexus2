import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const boardRouter = router({
    getForProject: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.board.findMany({
                where: { projectId: input.projectId },
                include: {
                    lanes: {
                        orderBy: { position: "asc" },
                    },
                },
            });
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.board.findUnique({
                where: { id: input.id },
                include: {
                    lanes: {
                        orderBy: { position: "asc" },
                    },
                },
            });
        }),

    getStatesForProject: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.workItemState.findMany({
                where: { projectId: input.projectId },
                orderBy: { position: "asc" },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string(),
                projectId: z.string(),
                boardType: z.string().default("kanban"),
                isDefault: z.boolean().optional(),
                sprintId: z.string().optional().nullable(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // If this board is set as default, unset other defaults
            if (input.isDefault) {
                await ctx.prisma.board.updateMany({
                    where: { projectId: input.projectId, isDefault: true },
                    data: { isDefault: false },
                });
            }
            return ctx.prisma.board.create({
                data: input,
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().optional(),
                boardType: z.string().optional(),
                filterQuery: z.any().optional(),
                settings: z.any().optional(),
                isDefault: z.boolean().optional(),
                sprintId: z.string().optional().nullable(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;

            // If setting as default, unset other defaults
            if (input.isDefault) {
                const board = await ctx.prisma.board.findUnique({
                    where: { id },
                    select: { projectId: true },
                });
                if (board) {
                    await ctx.prisma.board.updateMany({
                        where: { projectId: board.projectId, isDefault: true },
                        data: { isDefault: false },
                    });
                }
            }

            return ctx.prisma.board.update({
                where: { id },
                data,
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.board.delete({
                where: { id: input.id },
            });
        }),

    createLane: protectedProcedure
        .input(
            z.object({
                boardId: z.string(),
                name: z.string(),
                position: z.number(),
                mappedStates: z.array(z.string()),
                wipLimit: z.number().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.boardLane.create({
                data: input,
            });
        }),

    updateLane: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().optional(),
                position: z.number().optional(),
                mappedStates: z.array(z.string()).optional(),
                wipLimit: z.number().optional().nullable(),
                isCollapsed: z.boolean().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.prisma.boardLane.update({
                where: { id },
                data,
            });
        }),

    deleteLane: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.boardLane.delete({
                where: { id: input.id },
            });
        }),

    reorderLanes: protectedProcedure
        .input(
            z.object({
                lanes: z.array(
                    z.object({
                        id: z.string(),
                        position: z.number(),
                    }),
                ),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Update all lanes in a transaction
            await ctx.prisma.$transaction(
                input.lanes.map((lane) =>
                    ctx.prisma.boardLane.update({
                        where: { id: lane.id },
                        data: { position: lane.position },
                    }),
                ),
            );
            return { success: true };
        }),
});
