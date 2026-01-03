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
		const body = (await context.request.json()) as { 
			messages?: any[];
			projectId?: string;
			userId?: string;
		};
		const uiMessages = body.messages || [];
		const projectId = body.projectId;
		const userId = body.userId;

		const result = await streamText({
			model: openai("gpt-4-turbo"),
			messages: await convertToModelMessages(uiMessages),
			tools: {
				create_bug_ticket: tool({
					description: "Create a bug ticket in the project management system when user reports a bug",
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
			},
			toolChoice: "auto",
		});
		//return result.toTextStreamResponse();
		return result.toTextStreamResponse();
	})
	.get("/", () => "OK")
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});

export type App = typeof app;
console.log(app.server?.port); // Use app to avoid lint error
