import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    CheckCircle2,
    MessageSquare,
    UserPlus,
    ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function RecentActivity() {
    const trpc = useTRPC();

    const { data: activities, isLoading } = useQuery<any>(
        trpc.activity.getRecent.queryOptions({ limit: 10 }) as any
    );

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        No recent activity
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getActivityIcon = (type: string) => {
        switch (type) {
            case "comment":
                return <MessageSquare className="h-4 w-4 text-purple-500" />;
            case "state_change":
                return <ArrowRight className="h-4 w-4 text-blue-500" />;
            case "assignment":
                return <UserPlus className="h-4 w-4 text-orange-500" />;
            case "completion":
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            default:
                return <ArrowRight className="h-4 w-4 text-gray-500" />;
        }
    };

    const getActivityText = (activity: any) => {
        const actorName = activity.actor?.name || "Someone";
        const targetTitle = activity.target?.title || "a task";
        const projectKey = activity.target?.project?.key;
        const taskId = projectKey
            ? `${projectKey}-${activity.target?.id?.split("-")[0]}`
            : "";

        switch (activity.type) {
            case "comment":
                return (
                    <>
                        <span className="font-medium">{actorName}</span> commented
                        on{" "}
                        <span className="font-medium">
                            {taskId || targetTitle}
                        </span>
                    </>
                );
            case "state_change":
                const newState = activity.metadata?.newState || "a new state";
                return (
                    <>
                        <span className="font-medium">{actorName}</span> moved{" "}
                        <span className="font-medium">
                            {taskId || targetTitle}
                        </span>{" "}
                        to <span className="font-medium">{newState}</span>
                    </>
                );
            case "assignment":
                return (
                    <>
                        <span className="font-medium">{actorName}</span> assigned{" "}
                        <span className="font-medium">
                            {taskId || targetTitle}
                        </span>
                    </>
                );
            case "completion":
                return (
                    <>
                        <span className="font-medium">{actorName}</span> completed{" "}
                        <span className="font-medium">
                            {taskId || targetTitle}
                        </span>
                    </>
                );
            default:
                return (
                    <>
                        <span className="font-medium">{actorName}</span> updated{" "}
                        <span className="font-medium">
                            {taskId || targetTitle}
                        </span>
                    </>
                );
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.map((activity: any) => (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 text-sm"
                        >
                            <div className="mt-1 flex-shrink-0">
                                {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    {activity.actor && (
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage
                                                src={activity.actor.avatarUrl}
                                            />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(activity.actor.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <p className="text-sm leading-relaxed">
                                        {getActivityText(activity)}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(
                                        new Date(activity.createdAt),
                                        { addSuffix: true }
                                    )}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
