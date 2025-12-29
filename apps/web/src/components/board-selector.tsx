import { useState } from "react";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings2, Star } from "lucide-react";
import { BoardSettingsModal } from "./board-settings-modal";

interface BoardSelectorProps {
    projectId: string;
    selectedBoardId?: string;
    onBoardChange: (boardId: string) => void;
}

export function BoardSelector({
    projectId,
    selectedBoardId,
    onBoardChange,
}: BoardSelectorProps) {
    const trpc = useTRPC();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingBoardId, setEditingBoardId] = useState<string | undefined>();

    const { data: boards, isLoading } = useQuery<any>(
        trpc.board.getForProject.queryOptions({ projectId }) as any,
    );

    const handleConfigureBoards = () => {
        setEditingBoardId(selectedBoardId);
        setIsSettingsOpen(true);
    };

    const handleCreateBoard = () => {
        setEditingBoardId(undefined);
        setIsSettingsOpen(true);
    };

    if (isLoading) {
        return <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />;
    }

    const defaultBoard = boards?.find((b: any) => b.isDefault);
    const currentBoardId = selectedBoardId || defaultBoard?.id;

    return (
        <div className="flex items-center gap-2">
            <Select value={currentBoardId} onValueChange={onBoardChange}>
                <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a board" />
                </SelectTrigger>
                <SelectContent>
                    {boards?.map((board: any) => (
                        <SelectItem key={board.id} value={board.id}>
                            <div className="flex items-center gap-2">
                                {board.isDefault && (
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                )}
                                <span>{board.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    ({board.boardType})
                                </span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Button
                variant="outline"
                size="icon"
                onClick={handleConfigureBoards}
                title="Configure boards"
            >
                <Settings2 className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={handleCreateBoard}>
                New Board
            </Button>

            <BoardSettingsModal
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                projectId={projectId}
                boardId={editingBoardId}
            />
        </div>
    );
}
