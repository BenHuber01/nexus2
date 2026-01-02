import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { useState } from "react";
import { CreateOrganizationModal } from "@/components/create-organization-modal";
import { CreateProjectModal } from "@/components/create-project-modal";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const trpc = useTRPC();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const { data: organizations, isLoading: orgsLoading } = useQuery<any>(
		trpc.organization.getAll.queryOptions() as any,
	);

	return (
		<div className="container mx-auto py-8">
			<CreateOrganizationModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
			/>
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground">
						Welcome back, {session?.user.name}
					</p>
				</div>
				<Button onClick={() => setIsCreateModalOpen(true)}>
					Create Organization
				</Button>
			</div>

			{orgsLoading ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-[200px] w-full" />
					))}
				</div>
			) : (
				<div className="space-y-8">
					{organizations?.map((org: any) => (
						<div key={org.id} className="space-y-4">
							<div className="flex items-center justify-between">
								<h2 className="text-2xl font-semibold">{org.name}</h2>
								<div className="flex gap-2">
									<Link
										to="/organizations/$organizationId/teams"
										params={{ organizationId: org.id }}
									>
										<Button variant="outline" size="sm">
											Teams
										</Button>
									</Link>
									<Link
										to="/organizations/$organizationId/settings"
										params={{ organizationId: org.id }}
									>
										<Button variant="outline" size="sm">
											Settings
										</Button>
									</Link>
								</div>
							</div>

							<ProjectList organizationId={org.id} />
						</div>
					))}

					{organizations?.length === 0 && (
						<Card className="bg-muted/50 border-dashed">
							<CardContent className="flex flex-col items-center justify-center py-12">
								<p className="text-muted-foreground mb-4">
									No organizations found.
								</p>
								<Button onClick={() => setIsCreateModalOpen(true)}>Create your first organization</Button>
							</CardContent>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}

function ProjectList({ organizationId }: { organizationId: string }) {
	const trpc = useTRPC();
	const navigate = useNavigate();
	const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
	const { data: projects, isLoading } = useQuery<any>(
		trpc.project.getAll.queryOptions({ organizationId }) as any,
	);

	if (isLoading) {
		return <Skeleton className="h-[200px] w-full" />;
	}

	return (
		<>
			<CreateProjectModal
				open={isCreateProjectModalOpen}
				onOpenChange={setIsCreateProjectModalOpen}
				organizationId={organizationId}
			/>
			
			{projects && projects.length > 0 ? (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>Projects</CardTitle>
						<Button size="sm" onClick={() => setIsCreateProjectModalOpen(true)}>
							+ New Project
						</Button>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Key</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Description</TableHead>
									<TableHead className="text-right">Work Items</TableHead>
									<TableHead className="text-right">Active Sprints</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{projects.map((project: any) => (
									<TableRow
										key={project.id}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => navigate({ to: "/projects/$projectId", params: { projectId: project.id } })}
									>
										<TableCell>
											<Badge variant="outline" className="font-mono">
												{project.key}
											</Badge>
										</TableCell>
										<TableCell className="font-medium">{project.name}</TableCell>
										<TableCell className="text-sm text-muted-foreground max-w-md truncate">
											{project.description || "No description"}
										</TableCell>
										<TableCell className="text-right">
											{project._count?.workItems || 0}
										</TableCell>
										<TableCell className="text-right">
											{project._count?.sprints || 0}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			) : (
				<Card className="bg-muted/50 border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-12">
						<p className="text-muted-foreground mb-4">
							No projects yet.
						</p>
						<Button onClick={() => setIsCreateProjectModalOpen(true)}>
							Create your first project
						</Button>
					</CardContent>
				</Card>
			)}
		</>
	);
}

