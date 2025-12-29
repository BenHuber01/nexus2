import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { TeamManagement } from "@/components/team-management";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/organizations/$organizationId/teams")({
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
    const { organizationId } = Route.useParams();
    const trpc = useTRPC();

    // Fetch organization data
    const { data: organization } = useQuery<any>(
        trpc.organization.getById.queryOptions({ id: organizationId }) as any
    );

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
                    <p className="text-muted-foreground">
                        {organization?.name || "Loading..."}
                    </p>
                </div>
                <Link
                    to="/organizations/$organizationId/settings"
                    params={{ organizationId }}
                >
                    <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Organization Settings
                    </Button>
                </Link>
            </div>

            <TeamManagement organizationId={organizationId} />
        </div>
    );
}
