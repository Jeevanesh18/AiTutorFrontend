
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SlidePage {
  pageId: number;
  pageNumber: number;
}

export default function SlideTutorPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();

  const subjectId = Number(params.subjectId);
  const levelId = Number(params.level);

  const [slideId, setSlideId] = useState<number | null>(null);
  const [pages, setPages] = useState<SlidePage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([]);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [isThinking, setIsThinking] = useState(false);

  // ----------------- LOAD SLIDE ID -----------------
  useEffect(() => {
    if (!levelId || status !== "authenticated") return;

    const fetchSlideId = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8080/api/slides/level/${levelId}`, {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });
        const data = await res.json();
        if (data.length > 0) setSlideId(data[0].slideId);
      } catch (err) {
        console.error("Failed to fetch slideId", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlideId();
  }, [levelId, session, status]);

  // ----------------- LOAD SLIDE PAGES -----------------
  useEffect(() => {
    if (!slideId) return;

    const fetchPages = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8080/api/slidePages/SlideId/${slideId}`, {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });
        const data = await res.json();
        data.sort((a: SlidePage, b: SlidePage) => a.pageNumber - b.pageNumber);
        setPages(data);
      } catch (err) {
        console.error("Failed to load pages", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [slideId, session]);

  // ----------------- LOAD CURRENT SLIDE IMAGE -----------------
  const currentPage = pages[currentIndex];

  useEffect(() => {
    if (!currentPage || !session?.accessToken) return;

    const fetchImage = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/slidePages/pageImage/${currentPage.pageId}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } catch (err) {
        console.error("Failed to load slide image", err);
      }
    };

    fetchImage();

    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [currentPage, session]);

  // ----------------- CHAT -----------------
 const sendMessage = async (text: string) => {
  if (!text || !currentPage) return;

  setIsThinking(true);
  setMessages((prev) => [
    ...prev,
    { sender: "user", text },
    { sender: "ai", text: "Thinking..." },
  ]);

  try {
    const res = await fetch("http://localhost:8080/api/slideChat", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({
        userQuestion: text,
        slideId,
        pageId: currentPage.pageId,
      }),
    });
    // 🚨 RATE LIMIT HIT
    if (res.status === 429) {

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          sender: "ai",
          text: "Too many requests. Wait for 1 minute.",
        },
      ]);
      setIsThinking(false);
      return;
    }

    // ❌ Other backend errors
    if (!res.ok) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          sender: "ai",
          text: "Something went wrong. Please try again.",
        },
      ]);
      setIsThinking(false);
      return;
    }

    const data = await res.json();
    const reply = data.reply || `Error: ${data.error}`;

    setMessages((prev) => [
      ...prev.slice(0, -1),
      { sender: "ai", text: reply },
    ]);
  } catch (error) {
    setMessages((prev) => [
      ...prev.slice(0, -1),
      {
        sender: "ai",
        text: "Network error. Check your connection.",
      },
    ]);
  } finally {
    setIsThinking(false);
  }
};

  // ----------------- RESET CHAT -----------------
  const resetChat = async () => {
    try {
      await fetch("http://localhost:8080/api/slideChat/reset", {
        method: "POST", 
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
        slideId,
      }),
      });
      setMessages([]);
    } catch (err) {
      console.error("Failed to reset chat", err);
    }
  };

  // Auto-reset chat on unmount / page change
 useEffect(() => {
  return () => {
    // This runs when the user leaves this page
    resetChat();
  };
}, []);


  // ----------------- FORMAT AI MESSAGES -----------------
  const formatMessage = (text: string) => {
    // Bold **text**
    let html = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    // Convert lines starting with - to bullet points
    html = html.replace(/^- (.+)$/gm, "• $1");
    // Line breaks
    html = html.replace(/\n/g, "<br />");
    return html;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!pages.length) return <div className="min-h-screen flex items-center justify-center">No slides found.</div>;

  return (
    <div className="flex gap-4 p-4 h-screen bg-gray-900 text-white">
       {/* Top-left Back Button */}
  <button
    onClick={() => router.push(`/lessons/${subjectId}/${levelId}`)}
    className="absolute top-4 left-4 bg-white/80 hover:bg-white text-black font-semibold py-2 px-4 rounded-lg shadow-lg transition z-20"
  >
    ← Back
  </button>
      {/* Slide Section */}
      <div className="w-2/3 flex flex-col">
        <div className="bg-gray-800 rounded-lg h-[450px] flex items-center justify-center mb-4">
          {imageUrl ? (
            <img src={imageUrl} alt={`Slide ${currentPage.pageNumber}`} className="max-w-full max-h-full" />
          ) : (
            <span>Loading image...</span>
          )}
        </div>
        <div className="flex justify-center gap-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
          >
            Previous
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition"
            disabled={currentIndex === pages.length - 1}
            onClick={() => setCurrentIndex((i) => i + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Chat Section */}
<div className="w-1/3 flex flex-col h-full">
  <div className="flex justify-between items-center mb-2">
    <h3 className="text-lg font-bold">AI Tutor</h3>
    <button
      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 active:scale-95 transition"
      onClick={resetChat}
    >
      Reset Chat
    </button>
  </div>

 {/* Scrollable chat */}
<div className="flex-1 border border-gray-700 rounded p-4 overflow-y-auto bg-gray-800">
  {messages.map((m, idx) => (
    <div
      key={idx}
      className={`mb-3 p-2 rounded max-w-[90%] ${
        m.sender === "user"
          ? "bg-blue-700 text-white self-end ml-auto"
          : "bg-gray-700 text-white self-start mr-auto"
      }`}
    >
      {m.sender === "ai" ? ( <span dangerouslySetInnerHTML={{ __html: formatMessage(m.text) }} /> ) : ( m.text )}

    </div>
  ))}
</div>


  {/* Input */}
  <div className="flex gap-2 mt-2">
    <textarea
    className="flex-1 border border-gray-600 rounded px-2 py-1 bg-gray-900 text-white resize-none"
    placeholder="Ask anything..."
    rows={2} // initial height
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // prevent adding a new line
        sendMessage(e.currentTarget.value);
        e.currentTarget.value = "";
      }
      // Shift+Enter will naturally add a new line
    }}
  />
    <button
      className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition"
       disabled={isThinking }
      onClick={() => {
        const input = document.querySelector<HTMLInputElement>("input");
        if (input) {
          sendMessage(input.value);
          input.value = "";
        }
      }}
    >
      Send
    </button>
  </div>
</div>

    </div>
  );
}
