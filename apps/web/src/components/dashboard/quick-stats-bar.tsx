import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, Zap, MessageSquare } from "lucide-react";

export function QuickStatsBar() {
    const trpc = useTRPC();

    const { data: stats, isLoading } = useQuery<any>(
        trpc.dashboard.getStats.queryOptions() as any
    );

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[120px]" />
                ))}
            </div>
        );
    }

    const statCards = [
        {
            title: "My Open Tasks",
            value: stats?.openTasksCount || 0,
            icon: CheckCircle2,
            iconColor: "text-blue-500",
            bgColor: "bg-blue-500/10",
        },
        {
            title: "Due This Week",
            value: stats?.dueThisWeekCount || 0,
            icon: Clock,
            iconColor: "text-orange-500",
            bgColor: "bg-orange-500/10",
        },
        {
            title: "Active Sprints",
            value: stats?.activeSprintsCount || 0,
            icon: Zap,
            iconColor: "text-purple-500",
            bgColor: "bg-purple-500/10",
        },
        {
            title: "Recent Comments",
            value: stats?.recentCommentsCount || 0,
            icon: MessageSquare,
            iconColor: "text-green-500",
            bgColor: "bg-green-500/10",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${stat.bgColor}`}>
                                <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
