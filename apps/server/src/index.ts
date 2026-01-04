import "dotenv/config";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
// import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, tool, generateText } from "ai";
import { z } from "zod";
import { createContext } from "@my-better-t-app/api/context";
import { appRouter } from "@my-better-t-app/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@my-better-t-app/auth";
import prisma from "@my-better-t-app/db/client";

const app = new Elysia()
	.use(
		cors({
			origin: process.env.CORS_ORIGIN || "",
			methods: ["GET", "POST", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.all("/api/auth/*", async (context) => {
		const { request, status } = context;
		if (["POST", "GET"].includes(request.method)) {
			return auth.handler(request);
		}
		return status(405);
	})
	.all("/trpc/*", async (context) => {
		const res = await fetchRequestHandler({
			endpoint: "/trpc",
			router: appRouter,
			req: context.request,
			createContext: () => createContext({ context }),
		});
		return res;
	})
	.post("/ai", async (context: any) => {
		const session = await auth.api.getSession({ headers: context.request.headers });
		const userId = session?.user?.id;
		console.log("[AI] Session:", session);
		console.log("[AI] User ID:", userId);
		const body = (await context.request.json()) as {
			messages?: any[];
			projectId?: string;
		};
		const uiMessages = body.messages || [];
		const projectId = body.projectId;

		const result = await streamText({
			model: openai("gpt-4-turbo"),
			messages: await convertToModelMessages(uiMessages),
			tools: {
				create_organization: tool({
					description: "Create a new organization when user requests it",
					inputSchema: z.object({
						name: z.string().describe("Organization name"),
						description: z.string().optional().describe("Organization description"),
					}),
					execute: async ({ name, description }: any) => {
						console.log("[AI] Creating organization with name:", name);
						console.log("[AI] Creating organization with user:", userId);
						if (!userId) {
							return { error: "User ID required" };
						}

						try {
							const slug = name.toLowerCase().replace(/\s+/g, "-");
							const org = await prisma.organization.create({
								data: { name, slug, description },
							});

							await prisma.organizationMembership.create({
								data: {
									organizationId: org.id,
									userId,
									role: "OWNER",
								},
							});

							return {
								success: true,
								organizationId: org.id,
								name: org.name,
								message: `Organization "${org.name}" created successfully`,
							};
						} catch (error: any) {
							console.error("[AI] Error creating organization:", error);
							return { error: error.message };
						}
					},
				} as any),
				create_bug_ticket: tool({
					description: `Create a bug ticket in the project management system when user reports a bug.

						IMPORTANT REQUIREMENTS:
						- ALWAYS ask for title if not provided
						- ALWAYS ask for detailed description if not provided
						- ALWAYS ask for priority (LOW/MEDIUM/HIGH/CRITICAL) if not provided
						- Ask for reproduction steps if the bug is complex
						- Do not assume information - explicitly ask the user
						- Format your questions clearly and wait for answers before creating the ticket`,
					inputSchema: z.object({
						title: z.string().describe("Short, descriptive bug title"),
						description: z.string().describe("Detailed bug description"),
						priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).describe("Bug severity"),
						reproSteps: z.string().optional().describe("Steps to reproduce the bug"),
					}),
					execute: async ({ title, description, priority, reproSteps }: any) => {
						console.log("[AI] Creating bug ticket with title:", title);
						console.log("[AI] Project ID:", projectId);
						if (!projectId) {
							return { error: "Project ID required" };
						}
						console.log("[AI] Creating bug ticket:", title, description, priority, reproSteps);
						try {
							// Get first state for project
							const firstState = await prisma.workItemState.findFirst({
								where: { projectId },
								orderBy: { position: "asc" },
							});

							// Create work item
							const workItem = await prisma.workItem.create({
								data: {
									title,
									description,
									type: "BUG",
									priority,
									projectId,
									stateId: firstState?.id || "",
									creatorId: userId || "",
									details: reproSteps ? {
										create: {
											reproSteps,
										},
									} : undefined,
								},
							});
							console.log("[AI] Created bug ticket:", workItem.id);
							// Get project key for ticket ID
							const project = await prisma.project.findUnique({
								where: { id: projectId },
								select: { key: true },
							});

							const ticketId = `${project?.key || "PROJ"}-${workItem.id.split("-")[0]}`;
							return {
								success: true,
								ticketId,
								message: `Bug ticket ${ticketId} created successfully`,
							};
						} catch (error: any) {
							console.error("[AI] Error creating bug ticket:", error);
							return { error: error.message };
						}
					},
				} as any),
				create_task: tool({
					description: "Create a new task in the current project when user requests it",
					inputSchema: z.object({
						title: z.string().describe("Task title"),
						description: z.string().optional().describe("Task description"),
						priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("Task priority"),
					}),
					execute: async ({ title, description, priority }: any) => {
						console.log("[AI] Creating task:", title);
						console.log("[AI] Creating task with user:", userId);
						console.log("[AI] Creating task with project:", projectId);
						if (!projectId) {
							return { error: "Project context required. Please navigate to a project first." };
						}
						if (!userId) {
							return { error: "User authentication required" };
						}
						try {
							const firstState = await prisma.workItemState.findFirst({
								where: { projectId },
								orderBy: { position: "asc" },
							});

							const workItem = await prisma.workItem.create({
								data: {
									title,
									description: description || "",
									type: "TASK",
									priority: priority || "MEDIUM",
									projectId,
									stateId: firstState?.id || "",
									creatorId: userId,
								},
							});

							const project = await prisma.project.findUnique({
								where: { id: projectId },
								select: { key: true },
							});

							const taskId = `${project?.key || "PROJ"}-${workItem.id.split("-")[0]}`;
							return {
								success: true,
								taskId,
								title: workItem.title,
								message: `Task ${taskId} "${workItem.title}" created successfully`,
							};
						} catch (error: any) {
							console.error("[AI] Error creating task:", error);
							return { error: error.message };
						}
					},
				} as any),
			},
			toolChoice: "auto",
		});
		return result.toUIMessageStreamResponse();
	})
	.get("/", () => "OK")
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});

export type App = typeof app;
console.log(app.server?.port); // Use app to avoid lint error
