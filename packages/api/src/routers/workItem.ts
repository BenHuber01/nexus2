import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { WorkItemType, Priority } from "@my-better-t-app/db";

export const workItemRouter = router({
    getAll: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.workItem.findMany({
                where: { projectId: input.projectId },
                include: {
                    assignee: true,
                    state: true,
                },
                orderBy: { order: "asc" },
            });
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.workItem.findUnique({
                where: { id: input.id },
                include: {
                    assignee: true,
                    creator: true,
                    state: true,
                    comments: {
                        include: { user: true },
                        orderBy: { createdAt: "desc" },
                    },
                    attachments: true,
                    details: true,
                },
            });
        }),

    create: protectedProcedure
        .input(
            z.object({
                title: z.string(),
                description: z.string().optional(),
                type: z.nativeEnum(WorkItemType),
                priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
                projectId: z.string(),
                stateId: z.string().optional(),
                assigneeId: z.string().optional(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.workItem.create({
                data: {
                    ...input,
                    creatorId: ctx.session.user.id,
                },
            });
        }),

    updateState: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                stateId: z.string(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.workItem.update({
                where: { id: input.id },
                data: { stateId: input.stateId },
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                title: z.string().optional(),
                description: z.string().optional(),
                type: z.nativeEnum(WorkItemType).optional(),
                priority: z.nativeEnum(Priority).optional(),
                stateId: z.string().optional(),
                assigneeId: z.string().optional().nullable(),
                sprintId: z.string().optional().nullable(),
                epicId: z.string().optional().nullable(),
                parentId: z.string().optional().nullable(),
                storyPoints: z.number().optional().nullable(),
                estimatedHours: z.number().optional().nullable(),
                remainingHours: z.number().optional().nullable(),
                dueDate: z.date().optional().nullable(),
                order: z.number().optional(),
                details: z
                    .object({
                        acceptanceCriteria: z.string().optional().nullable(),
                        technicalNotes: z.string().optional().nullable(),
                        reproSteps: z.string().optional().nullable(),
                        businessValue: z.string().optional().nullable(),
                        userPersona: z.string().optional().nullable(),
                        customFields: z.any().optional(),
                        externalReferences: z.string().optional().nullable(),
                    })
                    .optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { id, details, ...data } = input;

            return ctx.prisma.$transaction(async (tx: any) => {
                const workItem = await tx.workItem.update({
                    where: { id },
                    data: data as any,
                });

                if (details) {
                    await tx.workItemDetail.upsert({
                        where: { workItemId: id },
                        create: {
                            ...details,
                            workItemId: id,
                        },
                        update: details,
                    });
                }

                return workItem;
            });
        }),

    getEpics: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.prisma.workItem.findMany({
                where: {
                    projectId: input.projectId,
                    type: WorkItemType.EPIC,
                },
                orderBy: { title: "asc" },
            });
        }),

    moveToSprint: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                sprintId: z.string(),
            }),
        )
        .mutation(({ ctx, input }) => {
            return ctx.prisma.workItem.update({
                where: { id: input.id },
                data: { sprintId: input.sprintId },
            });
        }),

    moveToBacklog: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.prisma.workItem.update({
                where: { id: input.id },
                data: { sprintId: null },
            });
        }),
});
