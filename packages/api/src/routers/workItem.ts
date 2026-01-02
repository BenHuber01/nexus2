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
                    sprint: true,
                    details: true,
                    components: {
                        include: {
                            component: true,
                        },
                    },
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
                    components: {
                        include: {
                            component: true,
                        },
                    },
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
                assigneeId: z.string().optional().nullable(),
                sprintId: z.string().optional().nullable(),
                epicId: z.string().optional().nullable(),
                parentId: z.string().optional().nullable(),
                storyPoints: z.number().optional().nullable(),
                estimatedHours: z.number().optional().nullable(),
                remainingHours: z.number().optional().nullable(),
                dueDate: z.date().optional().nullable(),
                componentIds: z.array(z.string()).optional(),
                details: z
                    .object({
                        acceptanceCriteria: z.string().optional().nullable(),
                        technicalNotes: z.string().optional().nullable(),
                        reproSteps: z.string().optional().nullable(),
                        businessValue: z.string().optional().nullable(),
                        userPersona: z.string().optional().nullable(),
                    })
                    .optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { componentIds, details, ...workItemData } = input;

            return ctx.prisma.$transaction(async (tx: any) => {
                // If no stateId provided, get first state from project
                let stateId = workItemData.stateId;
                if (!stateId) {
                    const firstState = await tx.workItemState.findFirst({
                        where: { projectId: workItemData.projectId },
                        orderBy: { position: 'asc' },
                    });
                    if (firstState) {
                        stateId = firstState.id;
                    }
                }

                // Create work item with all fields
                const workItem = await tx.workItem.create({
                    data: {
                        ...workItemData,
                        stateId,
                        creatorId: ctx.session.user.id,
                    },
                });

                // Create details if provided
                if (details && Object.values(details).some(v => v !== null && v !== undefined && v !== "")) {
                    // Convert empty strings to null for proper storage
                    const cleanedDetails = {
                        acceptanceCriteria: details.acceptanceCriteria?.trim() || null,
                        technicalNotes: details.technicalNotes?.trim() || null,
                        reproSteps: details.reproSteps?.trim() || null,
                        businessValue: details.businessValue?.trim() || null,
                        userPersona: details.userPersona?.trim() || null,
                    };
                    
                    await tx.workItemDetail.create({
                        data: {
                            ...cleanedDetails,
                            workItemId: workItem.id,
                        },
                    });
                }

                // Assign components if provided
                if (componentIds && componentIds.length > 0) {
                    await tx.componentOnWorkItem.createMany({
                        data: componentIds.map((componentId: string) => ({
                            workItemId: workItem.id,
                            componentId,
                        })),
                    });
                }

                return workItem;
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
                componentIds: z.array(z.string()).optional(),
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
            const { id, details, componentIds, ...data } = input;

            console.log("[workItem.update] Received input:", input);
            console.log("[workItem.update] Details object:", details);
            console.log("[workItem.update] Data object:", data);

            return ctx.prisma.$transaction(async (tx: any) => {
                // Only update workItem if there's actual data to update
                // Filter out undefined values
                const cleanedData = Object.fromEntries(
                    Object.entries(data).filter(([_, value]) => value !== undefined)
                );
                
                console.log("[workItem.update] Cleaned data:", cleanedData);
                
                let workItem;
                if (Object.keys(cleanedData).length > 0) {
                    workItem = await tx.workItem.update({
                        where: { id },
                        data: cleanedData as any,
                    });
                } else {
                    // No workItem fields to update, just fetch current
                    workItem = await tx.workItem.findUnique({
                        where: { id },
                    });
                }

                if (details) {
                    console.log("[workItem.update] Upserting details:", details);
                    
                    // Convert empty strings to null for proper storage
                    const cleanedDetails = {
                        acceptanceCriteria: details.acceptanceCriteria?.trim() || null,
                        technicalNotes: details.technicalNotes?.trim() || null,
                        reproSteps: details.reproSteps?.trim() || null,
                        businessValue: details.businessValue?.trim() || null,
                        userPersona: details.userPersona?.trim() || null,
                        customFields: details.customFields || undefined,
                        externalReferences: details.externalReferences?.trim() || null,
                    };
                    
                    console.log("[workItem.update] Cleaned details:", cleanedDetails);
                    
                    const upsertedDetails = await tx.workItemDetail.upsert({
                        where: { workItemId: id },
                        create: {
                            ...cleanedDetails,
                            workItemId: id,
                        },
                        update: cleanedDetails,
                    });
                    console.log("[workItem.update] Upserted details result:", upsertedDetails);
                }

                // Update components if provided
                if (componentIds !== undefined) {
                    // Remove existing component assignments
                    await tx.componentOnWorkItem.deleteMany({
                        where: { workItemId: id },
                    });

                    // Add new component assignments
                    if (componentIds.length > 0) {
                        await tx.componentOnWorkItem.createMany({
                            data: componentIds.map((componentId: string) => ({
                                workItemId: id,
                                componentId,
                            })),
                        });
                    }
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

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            console.log("[workItem.delete] Deleting work item:", input.id);
            
            // Prisma will cascade delete related records automatically:
            // - WorkItemDetail (onDelete: Cascade)
            // - ComponentOnWorkItem (onDelete: Cascade)
            // - Dependencies (onDelete: Cascade)
            // - Comments (onDelete: Cascade)
            // - TimeLogs (onDelete: Cascade)
            // - Attachments (onDelete: Cascade)
            
            const deletedItem = await ctx.prisma.workItem.delete({
                where: { id: input.id },
            });
            
            console.log("[workItem.delete] Successfully deleted:", deletedItem.title);
            return deletedItem;
        }),
});
