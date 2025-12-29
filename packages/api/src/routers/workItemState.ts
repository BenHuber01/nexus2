import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { WorkItemStateCategory } from "@my-better-t-app/db";

export const workItemStateRouter = router({
	/**
	 * Get all workflow states for a specific project
	 * States are returned in position order
	 */
	getByProject: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.workItemState.findMany({
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
	 * Get a single workflow state by ID
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.workItemState.findUnique({
				where: { id: input.id },
				include: {
					_count: {
						select: { workItems: true },
					},
				},
			});
		}),

	/**
	 * Create a new workflow state for a project
	 */
	create: protectedProcedure
		.input(
			z.object({
				projectId: z.string(),
				name: z.string().min(1).max(50),
				category: z.nativeEnum(WorkItemStateCategory),
				position: z.number().int().min(0).optional(),
				wipLimit: z.number().int().min(0).optional().nullable(),
				color: z.string().default("#6B7280"),
				icon: z.string().optional().nullable(),
				isInitial: z.boolean().default(false),
				isFinal: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check for duplicate name in the same project
			const existing = await ctx.prisma.workItemState.findUnique({
				where: {
					projectId_name: {
						projectId: input.projectId,
						name: input.name,
					},
				},
			});

			if (existing) {
				throw new Error(
					`A state with name "${input.name}" already exists in this project`,
				);
			}

			// If position not provided, add to end
			let position = input.position;
			if (position === undefined) {
				const maxPosition = await ctx.prisma.workItemState.findFirst({
					where: { projectId: input.projectId },
					orderBy: { position: "desc" },
					select: { position: true },
				});
				position = (maxPosition?.position ?? -1) + 1;
			}

			// If this is set as initial, unset other initial states
			if (input.isInitial) {
				await ctx.prisma.workItemState.updateMany({
					where: {
						projectId: input.projectId,
						isInitial: true,
					},
					data: { isInitial: false },
				});
			}

			// If this is set as final, unset other final states
			if (input.isFinal) {
				await ctx.prisma.workItemState.updateMany({
					where: {
						projectId: input.projectId,
						isFinal: true,
					},
					data: { isFinal: false },
				});
			}

			return ctx.prisma.workItemState.create({
				data: {
					...input,
					position,
				},
			});
		}),

	/**
	 * Update an existing workflow state
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(50).optional(),
				category: z.nativeEnum(WorkItemStateCategory).optional(),
				wipLimit: z.number().int().min(0).optional().nullable(),
				color: z.string().optional(),
				icon: z.string().optional().nullable(),
				isInitial: z.boolean().optional(),
				isFinal: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;

			// Get the state to find its project
			const state = await ctx.prisma.workItemState.findUnique({
				where: { id },
				select: { projectId: true, name: true },
			});

			if (!state) {
				throw new Error("State not found");
			}

			// Check for duplicate name if name is being changed
			if (input.name && input.name !== state.name) {
				const existing = await ctx.prisma.workItemState.findUnique({
					where: {
						projectId_name: {
							projectId: state.projectId,
							name: input.name,
						},
					},
				});

				if (existing) {
					throw new Error(
						`A state with name "${input.name}" already exists in this project`,
					);
				}
			}

			// If this is set as initial, unset other initial states
			if (input.isInitial) {
				await ctx.prisma.workItemState.updateMany({
					where: {
						projectId: state.projectId,
						isInitial: true,
						NOT: { id },
					},
					data: { isInitial: false },
				});
			}

			// If this is set as final, unset other final states
			if (input.isFinal) {
				await ctx.prisma.workItemState.updateMany({
					where: {
						projectId: state.projectId,
						isFinal: true,
						NOT: { id },
					},
					data: { isFinal: false },
				});
			}

			return ctx.prisma.workItemState.update({
				where: { id },
				data,
			});
		}),

	/**
	 * Delete a workflow state
	 * Note: Cannot delete if work items are using this state
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Check if any work items are using this state
			const workItemCount = await ctx.prisma.workItem.count({
				where: { stateId: input.id },
			});

			if (workItemCount > 0) {
				throw new Error(
					`Cannot delete state: ${workItemCount} work item(s) are currently using this state. Please move them to another state first.`,
				);
			}

			// Get state info for position reordering
			const state = await ctx.prisma.workItemState.findUnique({
				where: { id: input.id },
				select: { projectId: true, position: true },
			});

			if (!state) {
				throw new Error("State not found");
			}

			// Delete the state
			await ctx.prisma.workItemState.delete({
				where: { id: input.id },
			});

			// Reorder remaining states
			await ctx.prisma.workItemState.updateMany({
				where: {
					projectId: state.projectId,
					position: { gt: state.position },
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
	 * Reorder workflow states
	 * Updates the position of multiple states at once
	 */
	reorder: protectedProcedure
		.input(
			z.object({
				states: z.array(
					z.object({
						id: z.string(),
						position: z.number().int().min(0),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Update all states in a transaction
			await ctx.prisma.$transaction(
				input.states.map((state) =>
					ctx.prisma.workItemState.update({
						where: { id: state.id },
						data: { position: state.position },
					}),
				),
			);

			return { success: true };
		}),

	/**
	 * Get initial state for a project
	 */
	getInitialState: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.workItemState.findFirst({
				where: {
					projectId: input.projectId,
					isInitial: true,
				},
			});
		}),

	/**
	 * Get final states for a project (states that mark completion)
	 */
	getFinalStates: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.query(({ ctx, input }) => {
			return ctx.prisma.workItemState.findMany({
				where: {
					projectId: input.projectId,
					isFinal: true,
				},
				orderBy: { position: "asc" },
			});
		}),

	/**
	 * Get states by category for a project
	 */
	getByCategory: protectedProcedure
		.input(
			z.object({
				projectId: z.string(),
				category: z.nativeEnum(WorkItemStateCategory),
			}),
		)
		.query(({ ctx, input }) => {
			return ctx.prisma.workItemState.findMany({
				where: {
					projectId: input.projectId,
					category: input.category,
				},
				orderBy: { position: "asc" },
			});
		}),
});
