import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const activityRouter = router({
    getRecent: protectedProcedure
        .input(
            z.object({
                limit: z.number().default(10),
            })
        )
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            // Get user's projects to filter relevant activities
            const userProjects = await ctx.prisma.project.findMany({
                where: {
                    organization: {
                        users: {
                            some: {
                                userId: userId,
                            },
                        },
                    },
                },
                select: { id: true },
            });

            const projectIds = userProjects.map((p: { id: string }) => p.id);

            // Get recent activity logs for work items in user's projects
            const activities = await ctx.prisma.activityLog.findMany({
                where: {
                    entityType: "WorkItem",
                    action: {
                        in: ["state_change", "assignment", "completion"],
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: input.limit * 3, // Get more to filter by project
            });

            // Filter activities to only include work items from user's projects
            const workItemIds = activities.map((a: { entityId: string }) => a.entityId);
            const workItems = await ctx.prisma.workItem.findMany({
                where: {
                    id: { in: workItemIds },
                    projectId: { in: projectIds },
                },
                select: {
                    id: true,
                    title: true,
                    projectId: true,
                    project: {
                        select: {
                            key: true,
                            name: true,
                        },
                    },
                },
            });

            const workItemMap = new Map(
                workItems.map((wi: any) => [wi.id, wi])
            );

            // Get recent comments on user's assigned tasks
            const recentComments = await ctx.prisma.comment.findMany({
                where: {
                    workItem: {
                        assigneeId: userId,
                    },
                    userId: {
                        not: userId, // Exclude user's own comments
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true,
                        },
                    },
                    workItem: {
                        select: {
                            id: true,
                            title: true,
                            project: {
                                select: {
                                    key: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 5,
            });

            // Combine and format activities
            const formattedActivities: any[] = [];

            // Add activity log items
            for (const activity of activities) {
                const workItem: any = workItemMap.get(activity.entityId);
                if (!workItem) continue;

                let actor = null;
                if (activity.actorId) {
                    actor = await ctx.prisma.user.findUnique({
                        where: { id: activity.actorId },
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true,
                        },
                    });
                }

                formattedActivities.push({
                    id: activity.id,
                    type: activity.action,
                    actor,
                    target: {
                        id: workItem.id,
                        title: workItem.title,
                        project: workItem.project,
                    },
                    metadata: activity.changeDiff,
                    createdAt: activity.createdAt,
                });
            }

            // Add comment items
            for (const comment of recentComments) {
                formattedActivities.push({
                    id: comment.id,
                    type: "comment",
                    actor: comment.user,
                    target: {
                        id: comment.workItem.id,
                        title: comment.workItem.title,
                        project: comment.workItem.project,
                    },
                    metadata: { content: comment.content },
                    createdAt: comment.createdAt,
                });
            }

            // Sort by date and limit
            formattedActivities.sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
            );

            return formattedActivities.slice(0, input.limit);
        }),
});
