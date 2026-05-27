import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, query, orderBy, limit, onSnapshot, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Message, Profile } from "../types";
import { Send, Users, User, Search, MessageSquare, ShieldAlert } from "lucide-react";

interface MessengerProps {
  profiles: Profile[];
  currentUserId: string;
  selfProfile: Profile | null;
}

export default function Messenger({ profiles, currentUserId, selfProfile }: MessengerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeRecipient, setActiveRecipient] = useState<string>("general"); // "general" or user ID
  const [searchText, setSearchText] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Get other active filmmakers list
  const otherFilmmakers = profiles.filter((p) => p.userId !== currentUserId);

  const filteredFilmmakers = otherFilmmakers.filter((p) =>
    p.name.toLowerCase().includes(searchText.toLowerCase()) ||
    p.role.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeFilmmakerObj = profiles.find((p) => p.userId === activeRecipient) || null;

  // 2. Query Firestore messages in real-time
  useEffect(() => {
    setLoading(true);
    // Fetch last 100 messages for the system
    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetched.push({
            messageId: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderRole: data.senderRole,
            recipientId: data.recipientId,
            text: data.text,
            createdAt: data.createdAt,
          });
        });

        // Filter messages for Direct Message or General Lobby in client state to bypass security restrictions
        setMessages(fetched);
        setLoading(false);
        // Scroll to bottom
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      },
      (error) => {
        console.error("Firestore message listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Scroll to bottom on updates
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeRecipient]);

  // 3. Handle Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selfProfile) return;

    const textToSend = newMessage.trim();
    setNewMessage("");

    try {
      await addDoc(collection(db, "messages"), {
        senderId: currentUserId,
        senderName: selfProfile.name,
        senderRole: selfProfile.role,
        recipientId: activeRecipient,
        text: textToSend,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to post message:", err);
    }
  };

  // 4. Select matching messages based on recipient selection
  const currentChatMessages = messages.filter((msg) => {
    if (activeRecipient === "general") {
      return msg.recipientId === "general";
    } else {
      // Private direct message: either sender is current and recipient is target, OR sender is target and recipient is current
      return (
        (msg.senderId === currentUserId && msg.recipientId === activeRecipient) ||
        (msg.senderId === activeRecipient && msg.recipientId === currentUserId)
      );
    }
  });

  return (
    <div className="bg-[#F5EFEB] border border-[#3E2723]/25 rounded-2xl shadow-xl h-[650px] flex flex-col md:flex-row overflow-hidden hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-shadow duration-300">
      
      {/* Sidebar: Chat selections */}
      <div className="w-full md:w-80 border-r border-[#3E2723]/15 flex flex-col bg-[#F5EFEB]">
        {/* Search */}
        <div className="p-4 border-b border-[#3E2723]/15 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#3E2723] font-display">
            Direct & General Channels
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#D4AF37]" />
            <input
              type="text"
              placeholder="Search crew members..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* General channel */}
          <button
            onClick={() => setActiveRecipient("general")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left cursor-pointer ${
              activeRecipient === "general"
                ? "bg-[#0A192F] text-white shadow-[0_0_10px_rgba(21,25,47,0.3)]"
                : "text-[#3E2723] hover:bg-[#3E2723]/5"
            }`}
          >
            <div className={`p-2.5 rounded-lg ${activeRecipient === "general" ? "bg-[#D4AF37]/20" : "bg-[#0A192F]/5"}`}>
              <Users className={`w-4 h-4 ${activeRecipient === "general" ? "text-[#D4AF37]" : "text-[#3E2723]"}`} />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider">Filmmaker Lounge</p>
              <p className="text-[10px] opacity-75 leading-tight font-medium">General Lobby Channel</p>
            </div>
          </button>

          {/* Active Filmmakers */}
          <div className="pt-2">
            <span className="px-2 pb-1 text-[9px] uppercase tracking-widest font-bold text-[#3E2723]/50 block font-mono">
              Direct Messages
            </span>
            {filteredFilmmakers.length === 0 ? (
              <p className="text-[10px] text-[#3E2723]/40 italic p-3 text-center">No other members listed.</p>
            ) : (
              filteredFilmmakers.map((maker) => (
                <button
                  key={maker.userId}
                  onClick={() => setActiveRecipient(maker.userId)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition text-left cursor-pointer mt-1 ${
                    activeRecipient === maker.userId
                      ? "bg-[#0A192F] text-white shadow-[0_0_10px_rgba(21,25,47,0.3)] font-semibold"
                      : "text-[#3E2723] hover:bg-[#3E2723]/5"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${activeRecipient === maker.userId ? "bg-[#D4AF37]/20" : "bg-[#0A192F]/5"}`}>
                    <User className={`w-4 h-4 ${activeRecipient === maker.userId ? "text-[#D4AF37]" : "text-[#3E2723]/80"}`} />
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide truncate">{maker.name}</p>
                    <p className={`text-[9px] truncate font-semibold uppercase font-mono ${activeRecipient === maker.userId ? "text-[#D4AF37]" : "text-[#3E2723]/60"}`}>
                      {maker.role}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Screen Area */}
      <div className="flex-1 flex flex-col bg-[#FAF5EF]">
        {/* Active Contact Header */}
        <div className="px-6 py-4 border-b border-[#3E2723]/15 flex items-center justify-between bg-[#FAF5EF]">
          <div>
            <h4 className="text-sm font-black text-[#3E2723] font-display uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              {activeRecipient === "general" ? "General Filmmaker Lounge" : activeFilmmakerObj?.name}
            </h4>
            <p className="text-[10px] text-[#3E2723]/70 font-mono tracking-widest uppercase mt-0.5">
              {activeRecipient === "general"
                ? "Connect with any registered producers, directors or crew members on Film Hub"
                : `Private DM • ${activeFilmmakerObj?.role}`}
            </p>
          </div>
        </div>

        {/* Message Feeds */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF5EF]">
          {!selfProfile && (
            <div className="flex bg-[#0A192F]/5 rounded-xl p-4 gap-3 items-center border border-[#3E2723]/10 max-w-md mx-auto my-4 text-center justify-center flex-col">
              <ShieldAlert className="w-8 h-8 text-[#D4AF37]" />
              <p className="text-xs text-[#3E2723] font-bold">
                You must setup your filmmaker profile before sending messages on Film Hub. Click your custom profile settings setup to engage!
              </p>
            </div>
          )}

          {currentChatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60 max-w-sm mx-auto p-6">
              <MessageSquare className="w-8 h-8 text-[#D4AF37]" />
              <h5 className="text-xs font-black uppercase tracking-wider text-[#3E2723]">Lobby session initiated</h5>
              <p className="text-[10px] text-[#3E2723]/70 leading-relaxed font-sans font-medium">
                Verify details, discuss budgets first on the chat-box, and sync shooting files! Type a message below to start talking.
              </p>
            </div>
          ) : (
            currentChatMessages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.messageId}
                  className={`flex flex-col max-w-[70%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-black text-[#3E2723] uppercase">
                      {isMe ? "You" : msg.senderName}
                    </span>
                    <span className="text-[8px] font-mono text-[#3E2723]/60 font-semibold uppercase">
                      ({msg.senderRole})
                    </span>
                    <span className="text-[8px] text-[#3E2723]/50 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-[#0A192F] text-[#FDFBF7] rounded-tr-none hover:shadow-[0_0_8px_rgba(212,175,55,0.2)] transition-shadow"
                        : "bg-[#F5EFEB] text-[#3E2723] border border-[#3E2723]/10 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>

        {/* Send Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-[#3E2723]/15 flex gap-2 bg-[#FAF5EF]"
        >
          <input
            type="text"
            disabled={!selfProfile}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-[#F5EFEB] border border-[#3E2723]/25 rounded-xl px-4 py-3 text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] disabled:opacity-50 font-medium"
            placeholder={selfProfile ? "Write your direct message to align shoot details..." : "Register profile to unlock chat..."}
          />
          <button
            type="submit"
            disabled={!selfProfile || !newMessage.trim()}
            className="bg-[#0A192F] hover:bg-[#D4AF37] disabled:opacity-50 text-white hover:text-[#0A192F] hover:shadow-[0_0_12px_rgba(212,175,55,0.45)] p-3 rounded-xl transition cursor-pointer flex items-center justify-center select-none"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>

    </div>
  );
}
