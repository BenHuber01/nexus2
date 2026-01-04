import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Send, X } from "lucide-react";
import { Response } from "@/components/response";

export function AIChatBubble() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Extract projectId from URL pathname (memoized)
    const projectId = useMemo(() => {
        if (typeof window === "undefined") return undefined;
        const pathname = window.location.pathname;
        const match = pathname.match(/\/projects\/([^\/]+)/);
        return match?.[1];
    }, [isOpen]); // Only recalculate when dialog opens

    const { messages, sendMessage } = useChat({
        transport: new DefaultChatTransport({
            api: `${import.meta.env.VITE_SERVER_URL}/ai`,
            credentials: "include",
            body: { projectId },
        }),
    });
    
    console.log("[AIChatBubble] All messages:", messages);

    useEffect(() => {
        console.log("[AIChatBubble] messages updated:", messages);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;
        sendMessage({ text });
        setInput("");
    };

    return (
        <>
            {/* Floating Button */}
            <Button
                onClick={() => setIsOpen(true)}
                size="icon"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            >
                <MessageCircle size={24} />
            </Button>

            {/* Chat Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
                    <DialogHeader className="px-6 py-4 border-b">
                        <div className="flex items-center justify-between">
                            <DialogTitle>AI Assistant</DialogTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                            >
                                <X size={18} />
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center text-muted-foreground mt-8">
                                Hi! How can I help you today?
                            </div>
                        ) : (
                            messages.map((message) => {
                                const msg = message as any;
                                return (
                                    <div
                                        key={message.id}
                                        className={`p-3 rounded-lg ${message.role === "user"
                                                ? "bg-primary/10 ml-8"
                                                : "bg-secondary/20 mr-8"
                                            }`}
                                    >
                                        <p className="text-sm font-semibold mb-1">
                                            {message.role === "user" ? "You" : "AI"}
                                        </p>
                                        {/* Render message parts */}
                                        <div>
                                            {msg.parts?.map((part: any, idx: number) => {
                                                if (part.type === "text") {
                                                    return <Response key={idx}>{part.text}</Response>;
                                                }
                                                return null;
                                            })}
                                            {/* Show message if no text parts but has tool calls */}
                                            {msg.parts?.every((p: any) => p.type !== "text") && msg.parts?.some((p: any) => p.type?.startsWith("tool-")) && (
                                                <p className="text-muted-foreground text-sm">Using tools...</p>
                                            )}
                                        </div>

                                        {/* Tool Call Results - render from parts array */}
                                        {msg.parts?.filter((p: any) => p.type?.startsWith("tool-")).map((tool: any, idx: number) => (
                                            <div key={idx} className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                                                <p className="font-semibold text-xs mb-1 flex items-center gap-2">
                                                    <span className="text-muted-foreground">🔧</span>
                                                    {tool.type === "tool-create_task" && "Creating task..."}
                                                    {tool.type === "tool-create_bug_ticket" && "Creating bug ticket..."}
                                                    {tool.type === "tool-create_organization" && "Creating organization..."}
                                                    {tool.type === "tool-get_project_status" && "Fetching project status..."}
                                                </p>
                                                {tool.state === "output-available" && tool.output && (
                                                    <div className="mt-2">
                                                        {tool.output.error ? (
                                                            <div className="text-red-500 flex items-start gap-2">
                                                                <span>❌</span>
                                                                <span>{tool.output.error}</span>
                                                            </div>
                                                        ) : tool.type === "tool-get_project_status" ? (
                                                            <div className="space-y-3">
                                                                {/* Overview Stats */}
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="bg-background/60 p-2 rounded">
                                                                        <div className="text-xs text-muted-foreground">Total Items</div>
                                                                        <div className="text-lg font-bold">{tool.output.totalWorkItems}</div>
                                                                    </div>
                                                                    <div className="bg-background/60 p-2 rounded">
                                                                        <div className="text-xs text-muted-foreground">Completion</div>
                                                                        <div className="text-lg font-bold">{tool.output.completionRate}%</div>
                                                                    </div>
                                                                </div>

                                                                {/* Progress Bar */}
                                                                <div>
                                                                    <div className="flex justify-between text-xs mb-1">
                                                                        <span className="text-muted-foreground">Overall Progress</span>
                                                                    </div>
                                                                    <div className="w-full bg-secondary h-2 rounded overflow-hidden">
                                                                        <div 
                                                                            className="bg-primary h-2 rounded transition-all"
                                                                            style={{ width: `${tool.output.completionRate}%` }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* By State */}
                                                                {tool.output.workItemsByState && tool.output.workItemsByState.length > 0 && (
                                                                    <div>
                                                                        <div className="text-xs font-semibold mb-1">By State</div>
                                                                        <div className="space-y-1">
                                                                            {tool.output.workItemsByState.map((state: any, i: number) => (
                                                                                <div key={i} className="flex justify-between text-xs">
                                                                                    <span>{state.stateName}</span>
                                                                                    <span className="font-mono">{state.count} ({state.percentage}%)</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* By Type */}
                                                                {tool.output.workItemsByType && tool.output.workItemsByType.length > 0 && (
                                                                    <div>
                                                                        <div className="text-xs font-semibold mb-1">By Type</div>
                                                                        <div className="space-y-1">
                                                                            {tool.output.workItemsByType.map((type: any, i: number) => (
                                                                                <div key={i} className="flex justify-between text-xs">
                                                                                    <span>{type.type}</span>
                                                                                    <span className="font-mono">{type.count} ({type.percentage}%)</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* By Priority */}
                                                                {tool.output.workItemsByPriority && tool.output.workItemsByPriority.length > 0 && (
                                                                    <div>
                                                                        <div className="text-xs font-semibold mb-1">By Priority</div>
                                                                        <div className="space-y-1">
                                                                            {tool.output.workItemsByPriority.map((priority: any, i: number) => (
                                                                                <div key={i} className="flex justify-between text-xs">
                                                                                    <span>{priority.priority}</span>
                                                                                    <span className="font-mono">{priority.count}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Team Workload */}
                                                                {tool.output.teamWorkload && tool.output.teamWorkload.length > 0 && (
                                                                    <div>
                                                                        <div className="text-xs font-semibold mb-1">Team Workload</div>
                                                                        <div className="space-y-1">
                                                                            {tool.output.teamWorkload.map((member: any, i: number) => (
                                                                                <div key={i} className="flex justify-between text-xs">
                                                                                    <span>{member.userName}</span>
                                                                                    <span className="font-mono">{member.activeWorkItems} items</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : tool.output.success ? (
                                                            <div className="text-green-600 flex items-start gap-2">
                                                                <span>✅</span>
                                                                <div>
                                                                    <p>{tool.output.message}</p>
                                                                    {(tool.output.taskId || tool.output.ticketId || tool.output.organizationId) && (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            ID: {tool.output.taskId || tool.output.ticketId || tool.output.organizationId}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <pre className="text-xs overflow-auto text-muted-foreground">
                                                                {JSON.stringify(tool.output, null, 2)}
                                                            </pre>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="px-6 py-4 border-t flex items-center space-x-2"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1"
                            autoComplete="off"
                            disabled={false}
                        />
                        <Button type="submit" size="icon" disabled={false}>
                            <Send size={18} />
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
