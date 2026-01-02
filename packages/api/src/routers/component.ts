import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const componentRouter = router({
	/**
	 * Get all components for a specific project
	 * Components are returned in position order
	 */
	getByProject: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.component.findMany({
				where: { projectId: input.projectId },
				orderBy: { position: "asc" },
				include: {
					_count: {
						select: { workItems: true },
					},
				},
			});
		}),

	/**
	 * Get a single component by ID
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.component.findUnique({
				where: { id: input.id },
				include: {
					_count: {
						select: { workItems: true },
					},
				},
			});
		}),

	/**
	 * Create a new component for a project
	 */
	create: protectedProcedure
		.input(
			z.object({
				projectId: z.string(),
				name: z.string().min(1).max(50),
				description: z.string().optional().nullable(),
				color: z.string().default("#3B82F6"),
				position: z.number().int().min(0).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check for duplicate name in the same project
			const existing = await ctx.prisma.component.findUnique({
				where: {
					projectId_name: {
						projectId: input.projectId,
						name: input.name,
					},
				},
			});

			if (existing) {
				throw new Error(
					`A component with name "${input.name}" already exists in this project`,
				);
			}

			// If position not provided, add to end
			let position = input.position;
			if (position === undefined) {
				const maxPosition = await ctx.prisma.component.findFirst({
					where: { projectId: input.projectId },
					orderBy: { position: "desc" },
					select: { position: true },
				});
				position = (maxPosition?.position ?? -1) + 1;
			}

			return ctx.prisma.component.create({
				data: {
					...input,
					position,
				},
			});
		}),

	/**
	 * Update an existing component
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(50).optional(),
				description: z.string().optional().nullable(),
				color: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;

			// Get the component to find its project
			const component = await ctx.prisma.component.findUnique({
				where: { id },
				select: { projectId: true, name: true },
			});

			if (!component) {
				throw new Error("Component not found");
			}

			// Check for duplicate name if name is being changed
			if (input.name && input.name !== component.name) {
				const existing = await ctx.prisma.component.findUnique({
					where: {
						projectId_name: {
							projectId: component.projectId,
							name: input.name,
						},
					},
				});

				if (existing) {
					throw new Error(
						`A component with name "${input.name}" already exists in this project`,
					);
				}
			}

			return ctx.prisma.component.update({
				where: { id },
				data,
			});
		}),

	/**
	 * Delete a component
	 * Note: This will remove the component from all work items
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Get component info for position reordering
			const component = await ctx.prisma.component.findUnique({
				where: { id: input.id },
				select: { projectId: true, position: true },
			});

			if (!component) {
				throw new Error("Component not found");
			}

			// Delete the component (ComponentOnWorkItem will cascade delete)
			await ctx.prisma.component.delete({
				where: { id: input.id },
			});

			// Reorder remaining components
			await ctx.prisma.component.updateMany({
				where: {
					projectId: component.projectId,
					position: { gt: component.position },
				},
				data: {
					position: {
						decrement: 1,
					},
				},
			});

			return { success: true };
		}),

	/**
	 * Reorder components
	 * Updates the position of multiple components at once
	 */
	reorder: protectedProcedure
		.input(
			z.object({
				components: z.array(
					z.object({
						id: z.string(),
						position: z.number().int().min(0),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Update all components in a transaction
			await ctx.prisma.$transaction(
				input.components.map((component) =>
					ctx.prisma.component.update({
						where: { id: component.id },
						data: { position: component.position },
					}),
				),
			);

			return { success: true };
		}),

	/**
	 * Assign components to a work item
	 * Replaces all existing component assignments
	 */
	assignToWorkItem: protectedProcedure
		.input(
			z.object({
				workItemId: z.string(),
				componentIds: z.array(z.string()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Remove existing assignments
			await ctx.prisma.componentOnWorkItem.deleteMany({
				where: { workItemId: input.workItemId },
			});

			// Add new assignments
			if (input.componentIds.length > 0) {
				await ctx.prisma.componentOnWorkItem.createMany({
					data: input.componentIds.map((componentId) => ({
						workItemId: input.workItemId,
						componentId,
					})),
				});
			}

			return { success: true };
		}),

	/**
	 * Get work items for a specific component
	 */
	getWorkItems: protectedProcedure
		.input(z.object({ componentId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.componentOnWorkItem.findMany({
				where: { componentId: input.componentId },
				include: {
					workItem: {
						include: {
							assignee: true,
							state: true,
						},
					},
				},
			});
		}),
});
