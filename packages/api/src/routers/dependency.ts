import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const dependencyRouter = router({
	/**
	 * Get all dependencies for a specific work item
	 * Returns both dependencies where this item is the source OR target
	 */
	getByWorkItem: protectedProcedure
		.input(z.object({ workItemId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.dependency.findMany({
				where: {
					OR: [
						{ sourceItemId: input.workItemId },
						{ targetItemId: input.workItemId },
					],
				},
				include: {
					sourceItem: {
						select: {
							id: true,
							title: true,
							type: true,
							state: true,
						},
					},
					targetItem: {
						select: {
							id: true,
							title: true,
							type: true,
							state: true,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
			});
		}),

	/**
	 * Get items that are blocking this work item
	 * (items that must be completed before this one can start)
	 */
	getBlockingItems: protectedProcedure
		.input(z.object({ workItemId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.dependency.findMany({
				where: {
					targetItemId: input.workItemId,
					dependencyType: "blocks",
				},
				include: {
					sourceItem: {
						select: {
							id: true,
							title: true,
							type: true,
							state: true,
						},
					},
				},
			});
		}),

	/**
	 * Get items that are blocked by this work item
	 * (items that cannot start until this one is completed)
	 */
	getBlockedByItems: protectedProcedure
		.input(z.object({ workItemId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.dependency.findMany({
				where: {
					sourceItemId: input.workItemId,
					dependencyType: "blocks",
				},
				include: {
					targetItem: {
						select: {
							id: true,
							title: true,
							type: true,
							state: true,
						},
					},
				},
			});
		}),

	/**
	 * Create a new dependency between two work items
	 */
	create: protectedProcedure
		.input(
			z.object({
				sourceItemId: z.string(),
				targetItemId: z.string(),
				dependencyType: z
					.string()
					.default("blocks")
					.refine(
						(val) =>
							["blocks", "relates_to", "depends_on", "duplicates"].includes(
								val,
							),
						{
							message:
								"dependencyType must be one of: blocks, relates_to, depends_on, duplicates",
						},
					),
				description: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Prevent circular dependencies
			if (input.sourceItemId === input.targetItemId) {
				throw new Error("Cannot create dependency to itself");
			}

			// Check if dependency already exists
			const existing = await ctx.prisma.dependency.findUnique({
				where: {
					sourceItemId_targetItemId: {
						sourceItemId: input.sourceItemId,
						targetItemId: input.targetItemId,
					},
				},
			});

			if (existing) {
				throw new Error("Dependency already exists");
			}

			return ctx.prisma.dependency.create({
				data: input,
				include: {
					sourceItem: {
						select: {
							id: true,
							title: true,
							type: true,
						},
					},
					targetItem: {
						select: {
							id: true,
							title: true,
							type: true,
						},
					},
				},
			});
		}),

	/**
	 * Update an existing dependency
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				dependencyType: z
					.string()
					.refine(
						(val) =>
							["blocks", "relates_to", "depends_on", "duplicates"].includes(
								val,
							),
						{
							message:
								"dependencyType must be one of: blocks, relates_to, depends_on, duplicates",
						},
					)
					.optional(),
				description: z.string().optional().nullable(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const { id, ...data } = input;
			return ctx.prisma.dependency.update({
				where: { id },
				data,
				include: {
					sourceItem: {
						select: {
							id: true,
							title: true,
							type: true,
						},
					},
					targetItem: {
						select: {
							id: true,
							title: true,
							type: true,
						},
					},
				},
			});
		}),

	/**
	 * Delete a dependency
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) => {
			return ctx.prisma.dependency.delete({
				where: { id: input.id },
			});
		}),
});
