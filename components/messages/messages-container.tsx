"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { format } from "date-fns"
import { useUser } from "@clerk/nextjs"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

interface Conversation {
  id: string
  participants: {
    id: string
    name: string | null
    image: string | null
  }[]
  messages: {
    content: string
    createdAt: string
  }[]
}

interface Message {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string | null
    image: string | null
  }
}

export function MessagesContainer() {
  const router = useRouter()
  const { user } = useUser()
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [messages, setMessages] = React.useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = React.useState<string | null>(null)
  const [newMessage, setNewMessage] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations")
      if (!response.ok) throw new Error("Failed to fetch conversations")
      const data = await response.json()
      setConversations(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      })
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!response.ok) throw new Error("Failed to fetch messages")
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      })
    }
  }

  React.useEffect(() => {
    fetchConversations()
  }, [])

  React.useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    } else {
      setMessages([])
    }
  }, [selectedConversation])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedConversation || !newMessage.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/conversations/${selectedConversation}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newMessage.trim(),
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      const message = await response.json()
      setMessages((prev) => [...prev, message])
      setNewMessage("")
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/messages/new")}
          >
            <Icons.add className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-15rem)]">
          <div className="space-y-4">
            {conversations.map((conversation) => {
              const otherParticipant = conversation.participants.find(
                (participant) => participant.id !== user?.id
              )
              const lastMessage = conversation.messages[0]

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "flex items-center gap-4 p-4 cursor-pointer rounded-lg transition-colors",
                    selectedConversation === conversation.id
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  {otherParticipant?.image ? (
                    <Image
                      src={otherParticipant.image}
                      alt={otherParticipant.name || "User"}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Icons.user className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{otherParticipant?.name || "User"}</div>
                    {lastMessage && (
                      <div className="text-sm text-muted-foreground truncate">
                        {lastMessage.content}
                      </div>
                    )}
                  </div>
                  {lastMessage && (
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(lastMessage.createdAt), "MMM d")}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </Card>

      <Card className="p-4 flex flex-col">
        {selectedConversation ? (
          <>
            <ScrollArea className="flex-1 h-[calc(100vh-20rem)]">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2 items-start",
                      message.sender.id === user?.id && "flex-row-reverse"
                    )}
                  >
                    {message.sender.image ? (
                      <Image
                        src={message.sender.image}
                        alt={message.sender.name || "User"}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Icons.user className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg p-3 max-w-[70%]",
                        message.sender.id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {format(new Date(message.createdAt), "h:mm a")}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <Separator className="my-4" />
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.send className="h-4 w-4" />
                )}
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </Card>
    </div>
  )
} 