import { createFileRoute, redirect } from "@tanstack/react-router";
import { getUser } from "@/functions/get-user";
import { QuickStatsBar } from "@/components/dashboard/quick-stats-bar";
import { MyActiveTasks } from "@/components/dashboard/my-active-tasks";
import { ActiveSprints } from "@/components/dashboard/active-sprints";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { UpcomingDueDates } from "@/components/dashboard/upcoming-due-dates";
import { MyProjects } from "@/components/dashboard/my-projects";

export const Route = createFileRoute("/")({
	component: HomeComponent,
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

function HomeComponent() {
	const { session } = Route.useRouteContext();

	return (
		<div className="container mx-auto py-8">
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Home</h1>
					<p className="text-muted-foreground">
						Welcome back, {session?.user.name}
					</p>
				</div>
			</div>

			<div className="space-y-6">
				{/* Quick Stats */}
				<QuickStatsBar />

				{/* Two Column Layout */}
				<div className="grid gap-6 md:grid-cols-2">
					{/* My Active Tasks */}
					<MyActiveTasks />

					{/* Recent Activity */}
					<RecentActivity />
				</div>

				{/* Active Sprints */}
				<ActiveSprints />

				{/* Upcoming Due Dates */}
				<UpcomingDueDates />

				{/* My Projects */}
				<MyProjects />
			</div>
		</div>
	);
}
