import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const organizationMembershipRouter = router({
	/**
	 * Get all users in the system (for adding to organization)
	 * Only returns users not already in the organization
	 */
	getAvailableUsers: protectedProcedure
		.input(z.object({ organizationId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Get all users
			const allUsers = await ctx.prisma.user.findMany({
				where: { isActive: true },
				select: {
					id: true,
					name: true,
					email: true,
					firstName: true,
					lastName: true,
					avatarUrl: true,
				},
				orderBy: { email: "asc" },
			});

			// Get existing members
			const existingMembers = await ctx.prisma.organizationMembership.findMany({
				where: { organizationId: input.organizationId },
				select: { userId: true },
			});

			const existingUserIds = new Set(existingMembers.map((m: { userId: string }) => m.userId));

			// Filter out existing members
			return allUsers.filter((user: { id: string }) => !existingUserIds.has(user.id));
		}),

	/**
	 * Get all members of an organization
	 */
	getByOrganization: protectedProcedure
		.input(z.object({ organizationId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.organizationMembership.findMany({
				where: { organizationId: input.organizationId },
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
				},
				orderBy: { joinedAt: "asc" },
			});
		}),

	/**
	 * Get all organizations a user belongs to
	 */
	getByUser: protectedProcedure
		.input(z.object({ userId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.organizationMembership.findMany({
				where: { userId: input.userId },
				include: {
					organization: true,
				},
				orderBy: { joinedAt: "desc" },
			});
		}),

	/**
	 * Get current user's organization memberships
	 */
	getMyMemberships: protectedProcedure.query(({ ctx }) => {
		return ctx.prisma.organizationMembership.findMany({
			where: { userId: ctx.session.user.id },
			include: {
				organization: true,
			},
			orderBy: { joinedAt: "desc" },
		});
	}),

	/**
	 * Invite/Add a member to an organization
	 */
	inviteMember: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
				role: z.string().default("member"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if user is already a member
			const existing = await ctx.prisma.organizationMembership.findUnique({
				where: {
					userId_organizationId: {
						userId: input.userId,
						organizationId: input.organizationId,
					},
				},
			});

			if (existing) {
				throw new Error("User is already a member of this organization");
			}

			return ctx.prisma.organizationMembership.create({
				data: {
					userId: input.userId,
					organizationId: input.organizationId,
					role: input.role,
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
					organization: true,
				},
			});
		}),

	/**
	 * Remove a member from an organization
	 */
	removeMember: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Get membership to check org
			const membership = await ctx.prisma.organizationMembership.findUnique({
				where: { id: input.id },
				include: {
					organization: {
						include: {
							users: true,
						},
					},
				},
			});

			if (!membership) {
				throw new Error("Membership not found");
			}

			// Prevent removing the last admin/owner
			if (membership.role === "admin" || membership.role === "owner") {
				const adminCount = membership.organization.users.filter(
					(m: { role: string }) => m.role === "admin" || m.role === "owner",
				).length;

				if (adminCount <= 1) {
					throw new Error(
						"Cannot remove the last admin/owner from the organization",
					);
				}
			}

			return ctx.prisma.organizationMembership.delete({
				where: { id: input.id },
			});
		}),

	/**
	 * Update a member's role in the organization
	 */
	updateRole: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				role: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, role } = input;

			// Get current membership
			const membership = await ctx.prisma.organizationMembership.findUnique({
				where: { id },
				include: {
					organization: {
						include: {
							users: true,
						},
					},
				},
			});

			if (!membership) {
				throw new Error("Membership not found");
			}

			// If downgrading from admin/owner, ensure there's another admin
			if (
				(membership.role === "admin" || membership.role === "owner") &&
				role !== "admin" &&
				role !== "owner"
			) {
				const adminCount = membership.organization.users.filter(
					(m: { role: string }) => m.role === "admin" || m.role === "owner",
				).length;

				if (adminCount <= 1) {
					throw new Error(
						"Cannot downgrade the last admin/owner. Promote another member first.",
					);
				}
			}

			return ctx.prisma.organizationMembership.update({
				where: { id },
				data: { role },
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
				},
			});
		}),

	/**
	 * Leave an organization (current user)
	 */
	leaveOrganization: protectedProcedure
		.input(z.object({ organizationId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const membership = await ctx.prisma.organizationMembership.findUnique({
				where: {
					userId_organizationId: {
						userId: ctx.session.user.id,
						organizationId: input.organizationId,
					},
				},
				include: {
					organization: {
						include: {
							users: true,
						},
					},
				},
			});

			if (!membership) {
				throw new Error("You are not a member of this organization");
			}

			// Prevent last admin from leaving
			if (membership.role === "admin" || membership.role === "owner") {
				const adminCount = membership.organization.users.filter(
					(m: { role: string }) => m.role === "admin" || m.role === "owner",
				).length;

				if (adminCount <= 1) {
					throw new Error(
						"You are the last admin/owner. Transfer ownership before leaving.",
					);
				}
			}

			return ctx.prisma.organizationMembership.delete({
				where: { id: membership.id },
			});
		}),

	/**
	 * Get members by role
	 */
	getByRole: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				role: z.string(),
			}),
		)
		.query(({ ctx, input }) => {
			return ctx.prisma.organizationMembership.findMany({
				where: {
					organizationId: input.organizationId,
					role: input.role,
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
				},
			});
		}),
});
