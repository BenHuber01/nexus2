import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const teamMembershipRouter = router({
	/**
	 * Get all members of a team
	 */
	getByTeam: protectedProcedure
		.input(z.object({ teamId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.teamMembership.findMany({
				where: { teamId: input.teamId },
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							firstName: true,
							lastName: true,
							avatarUrl: true,
						},
					},
					role: true,
				},
				orderBy: { joinedAt: "asc" },
			});
		}),

	/**
	 * Get all teams a user is a member of
	 */
	getByUser: protectedProcedure
		.input(z.object({ userId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.teamMembership.findMany({
				where: { userId: input.userId },
				include: {
					team: {
						include: {
							organization: true,
						},
					},
					role: true,
				},
				orderBy: { joinedAt: "desc" },
			});
		}),

	/**
	 * Add a member to a team
	 */
	addMember: protectedProcedure
		.input(
			z.object({
				teamId: z.string(),
				userId: z.string(),
				roleId: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if user is already a member
			const existing = await ctx.prisma.teamMembership.findFirst({
				where: {
					teamId: input.teamId,
					userId: input.userId,
					leftAt: null, // Only check active memberships
				},
			});

			if (existing) {
				throw new Error("User is already a member of this team");
			}

			return ctx.prisma.teamMembership.create({
				data: {
					teamId: input.teamId,
					userId: input.userId,
					roleId: input.roleId,
				},
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							firstName: true,
							lastName: true,
							avatarUrl: true,
						},
					},
					role: true,
				},
			});
		}),

	/**
	 * Remove a member from a team
	 * Uses soft delete by setting leftAt timestamp
	 */
	removeMember: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) => {
			return ctx.prisma.teamMembership.update({
				where: { id: input.id },
				data: {
					leftAt: new Date(),
				},
			});
		}),

	/**
	 * Permanently delete a team membership
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) => {
			return ctx.prisma.teamMembership.delete({
				where: { id: input.id },
			});
		}),

	/**
	 * Update a member's role in the team
	 */
	updateRole: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				roleId: z.string().nullable(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const { id, roleId } = input;
			return ctx.prisma.teamMembership.update({
				where: { id },
				data: { roleId },
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							firstName: true,
							lastName: true,
						},
					},
					role: true,
				},
			});
		}),

	/**
	 * Reactivate a member who previously left
	 */
	reactivateMember: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) => {
			return ctx.prisma.teamMembership.update({
				where: { id: input.id },
				data: {
					leftAt: null,
				},
				include: {
					user: true,
					role: true,
				},
			});
		}),

	/**
	 * Get active members of a team (excluding those who left)
	 */
	getActiveMembers: protectedProcedure
		.input(z.object({ teamId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.teamMembership.findMany({
				where: {
					teamId: input.teamId,
					leftAt: null,
				},
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							firstName: true,
							lastName: true,
							avatarUrl: true,
							isActive: true,
						},
					},
					role: true,
				},
				orderBy: { joinedAt: "asc" },
			});
		}),
});
