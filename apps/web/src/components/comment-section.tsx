import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { getUser } from "@/functions/get-user";

interface CommentSectionProps {
    workItemId: string;
}

export function CommentSection({ workItemId }: CommentSectionProps) {
    const trpc = useTRPC();
    const client = useTRPCClient();
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editBody, setEditBody] = useState("");

    // Get current user
    const { data: session } = useQuery({
        queryKey: ["session"],
        queryFn: getUser,
    });

    const { data: comments, isLoading } = useQuery(
        trpc.comment.getByWorkItem.queryOptions({ workItemId })
    );

    const createMutation = useMutation({
        mutationFn: async (data: { body: string; workItemId: string }) => {
            return await client.comment.create.mutate(data);
        },
        onMutate: async (newCommentData) => {
            const queryKey = trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey;
            
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey });
            
            // Snapshot previous value
            const previousComments = queryClient.getQueryData(queryKey);
            
            // Optimistically add comment
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                
                const tempId = `temp-${Date.now()}`;
                const now = new Date().toISOString();
                
                const optimisticComment = {
                    id: tempId,
                    body: newCommentData.body,
                    workItemId: newCommentData.workItemId,
                    userId: null, // Will be filled by server
                    user: {
                        id: null,
                        firstName: "You",
                        lastName: "",
                        email: "",
                        avatarUrl: null,
                    },
                    createdAt: now,
                    updatedAt: now,
                    sentimentScore: null,
                    sentimentLabel: null,
                };
                
                console.log("[CommentSection] Optimistic create:", optimisticComment);
                return [...old, optimisticComment];
            });
            
            return { previousComments };
        },
        onError: (err, _data, context: any) => {
            const queryKey = trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey;
            
            // Rollback on error
            if (context?.previousComments) {
                queryClient.setQueryData(queryKey, context.previousComments);
            }
            
            console.error("[CommentSection] create error:", err);
            toast.error("Failed to add comment");
        },
        onSuccess: () => {
            // Invalidate to refetch fresh data
            queryClient.invalidateQueries({ 
                queryKey: trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey 
            });
            setNewComment("");
            toast.success("Comment added");
        },
    });

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        await createMutation.mutateAsync({
            body: newComment,
            workItemId,
        });
    };

    const updateMutation = useMutation({
        mutationFn: async (data: { id: string; body: string }) => {
            return await client.comment.update.mutate(data);
        },
        onMutate: async (updatedData) => {
            const queryKey = trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousComments = queryClient.getQueryData(queryKey);
            
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.map((comment: any) =>
                    comment.id === updatedData.id ? { ...comment, body: updatedData.body } : comment
                );
            });
            
            console.log("[CommentSection] Optimistic update:", updatedData);
            return { previousComments };
        },
        onError: (err, _data, context: any) => {
            const queryKey = trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey;
            if (context?.previousComments) {
                queryClient.setQueryData(queryKey, context.previousComments);
            }
            console.error("[CommentSection] update error:", err);
            toast.error("Failed to update comment");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey 
            });
            setEditingId(null);
            setEditBody("");
            toast.success("Comment updated");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await client.comment.delete.mutate({ id });
        },
        onMutate: async (commentId) => {
            const queryKey = trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey;
            
            await queryClient.cancelQueries({ queryKey });
            const previousComments = queryClient.getQueryData(queryKey);
            
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return old.filter((comment: any) => comment.id !== commentId);
            });
            
            console.log("[CommentSection] Optimistic delete:", commentId);
            return { previousComments };
        },
        onError: (err, _id, context: any) => {
            const queryKey = trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey;
            if (context?.previousComments) {
                queryClient.setQueryData(queryKey, context.previousComments);
            }
            console.error("[CommentSection] delete error:", err);
            toast.error("Failed to delete comment");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: trpc.comment.getByWorkItem.queryOptions({ workItemId }).queryKey 
            });
            toast.success("Comment deleted");
        },
    });

    const handleEdit = (comment: any) => {
        setEditingId(comment.id);
        setEditBody(comment.body);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditBody("");
    };

    const handleSaveEdit = async () => {
        if (!editBody.trim() || !editingId) return;
        await updateMutation.mutateAsync({
            id: editingId,
            body: editBody,
        });
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this comment?")) {
            await deleteMutation.mutateAsync(id);
        }
    };

    if (isLoading) return <div>Loading comments...</div>;

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {(comments as unknown as any[])?.map((comment: any) => {
                    const isOwn = session?.user?.id === comment.userId;
                    const isEditing = editingId === comment.id;

                    return (
                        <div key={comment.id} className="flex space-x-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.user.avatarUrl} />
                                <AvatarFallback>
                                    {comment.user.firstName[0]}
                                    {comment.user.lastName[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">
                                        {comment.user.firstName} {comment.user.lastName}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                        </span>
                                        {isOwn && !isEditing && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => handleEdit(comment)}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-destructive"
                                                    onClick={() => handleDelete(comment.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editBody}
                                            onChange={(e) => setEditBody(e.target.value)}
                                            className="min-h-[60px]"
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleSaveEdit}>
                                                Save
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-foreground">{comment.body}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="space-y-3">
                <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                />
                <div className="flex justify-end">
                    <Button
                        onClick={handleSubmit}
                        disabled={!newComment.trim() || createMutation.isPending}
                    >
                        {createMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
