import { useState, useRef, useEffect } from "react";
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

    // Extract projectId from URL pathname
    const getProjectId = () => {
        if (typeof window === "undefined") return undefined;
        const pathname = window.location.pathname;
        console.log("[AIChatBubble] pathname:", pathname);
        const match = pathname.match(/\/projects\/([^\/]+)/);
        const projectId = match?.[1];
        console.log("[AIChatBubble] extracted projectId:", projectId);
        return projectId;
    };

    const [projectId, setProjectId] = useState<string | undefined>(getProjectId());

    // Update projectId when URL changes
    useEffect(() => {
        const handleLocationChange = () => {
            setProjectId(getProjectId());
        };
        window.addEventListener("popstate", handleLocationChange);
        return () => window.removeEventListener("popstate", handleLocationChange);
    }, []);

    const { messages, sendMessage } = useChat({
        transport: new DefaultChatTransport({
            api: `${import.meta.env.VITE_SERVER_URL}/ai`,
            credentials: "include",
            body: { projectId },
        }),
    });

    useEffect(() => {
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
                                console.log("[AIChatBubble] Message:", msg);
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
                                        <Response>{msg.content || ""}</Response>

                                        {/* Tool Call Results */}
                                        {msg.toolInvocations?.map((tool: any, idx: number) => (
                                            <div key={idx} className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                                                <p className="font-semibold text-xs mb-1 flex items-center gap-2">
                                                    <span className="text-muted-foreground">🔧</span>
                                                    {tool.toolName === "create_task" && "Creating task..."}
                                                    {tool.toolName === "create_bug_ticket" && "Creating bug ticket..."}
                                                    {tool.toolName === "create_organization" && "Creating organization..."}
                                                </p>
                                                {tool.state === "result" && (
                                                    <div className="mt-2">
                                                        {tool.result.error ? (
                                                            <div className="text-red-500 flex items-start gap-2">
                                                                <span>❌</span>
                                                                <span>{tool.result.error}</span>
                                                            </div>
                                                        ) : tool.result.success ? (
                                                            <div className="text-green-600 flex items-start gap-2">
                                                                <span>✅</span>
                                                                <div>
                                                                    <p>{tool.result.message}</p>
                                                                    {tool.result.taskId && (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            ID: {tool.result.taskId || tool.result.ticketId || tool.result.organizationId}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <pre className="text-xs overflow-auto text-muted-foreground">
                                                                {JSON.stringify(tool.result, null, 2)}
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
