"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import * as ace from "ace-builds";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/mode-java";

import { Terminal } from "xterm";
import "xterm/css/xterm.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CodingQuestion {
  id: number;
  levelId: number;
  prompt: string;
  starterCode: string;
  descriptionAI: string;
}

interface CodeFile {
  name: string;
  code: string;
}

export default function CodingPracticePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const connectionExist = useRef(false);
  const levelId = Number(params.level);
const subjectId = Number(params.subjectId);
  /* ================= Auth ================= */
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (!session) return null;
  const accessToken = session.accessToken;
  if (!accessToken) throw new Error("Access token missing from session");

  /* ================= State ================= */
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>([]);
  const [terminalBuffer, setTerminalBuffer] = useState("");
  const [msgs, setMsgs] = useState<{ role: 'user' | 'ai', content: string }[]>([]);

  // Multi-file state
  const [allFiles, setAllFiles] = useState<CodeFile[][]>([]);
  const [activeTabs, setActiveTabs] = useState<number[]>([]);

  // Button State
  const [isProcessing, setIsProcessing] = useState(false);

  const editorRef = useRef<any>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
const currentIndexRef = useRef(0);

useEffect(() => {
  currentIndexRef.current = currentIndex;
}, [currentIndex]);

  /* ================= Load Questions & Initialize allFiles ================= */
  useEffect(() => {
    if (!session) return;

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/codingQuestion/level/${levelId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data: CodingQuestion[]) => {
        setQuestions(data);
        setCompleted(new Array(data.length).fill(false));

        // Initialize allFiles for all questions
        const filesArray: CodeFile[][] = data.map(q => {
          const rawStarter = q.starterCode || "";
          try {
            const json = JSON.parse(rawStarter);
            if (Array.isArray(json)) {
              return json.map((item: any) => ({
                name: item.class,
                code: item.starter_code,
              }));
            }
          } catch {
            // Fallback for legacy plain text starter code
          }
          // Default fallback
          return [{ name: "Main", code: rawStarter }];
        });

        setAllFiles(filesArray);
        setActiveTabs(new Array(data.length).fill(0));
      });
  }, [session, levelId]);

  const safeSend = (ws: WebSocket | null, data: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
    }
  };

  /* ================= Editor Initialization ================= */
  useEffect(() => {
    if (!questions.length) return;
    if (!allFiles.length) return;

    const element = document.getElementById("editor");
    if (!element) return;

    const editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/java");
    
    // Set code value
    const currentCode = allFiles[currentIndex]?.[activeTabs[currentIndex]]?.code || "";
    editor.setValue(currentCode, -1);
    
    editor.setShowPrintMargin(false);
    
    // -- Layout Fixes for Editor --
    editor.renderer.setScrollMargin(10, 10, 10, 10); // Adds padding inside scroll
    editor.setOptions({
        vScrollBarAlwaysVisible: false,
        hScrollBarAlwaysVisible: false, 
    });

    editorRef.current = editor;

    const resizeObserver = new ResizeObserver(() => {
        editor.resize();
    });
    resizeObserver.observe(element);

    return () => {
      // Cleanup
      safeSend(wsRef.current, { type: "terminate" });
      terminalRef.current?.clear();
      editor.destroy();
      resizeObserver.disconnect();
    };
  }, [currentIndex, questions.length, allFiles.length]); 

  // Handle Tab Switching (Update Editor Content)
  useEffect(() => {
    if (!editorRef.current || !allFiles[currentIndex]) return;
    const code = allFiles[currentIndex][activeTabs[currentIndex]]?.code || "";
    
    // Only set if different to prevent cursor jumps
    if (editorRef.current.getValue() !== code) {
       editorRef.current.setValue(code, -1);
    }
  }, [activeTabs]);


  /* ================= Terminal + WebSocket ================= */
  useEffect(() => {
    if (!session) return;

    const termContainer = document.getElementById("terminal-container");
    if (!termContainer) return;

    termContainer.innerHTML = "";

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true, // Converts \n to \r\n
      scrollback: 1000,
      theme: { background: "#000000", foreground: "#ffffff" },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
    });

    // 1. Data Input Handler
    term.onData((data) => {
  // Handle special keys
  switch (data) {
    case "\r": // Enter
      term.write("\r\n");
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "input", data: "\n" }));
      }
      break;

    case "\u007F": // Backspace
      // Move cursor back, erase character visually
      term.write("\b \b");
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "input", data: "\b" }));
      }
      break;

    default:
      // Regular character
      term.write(data);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "input", data }));
      }
      break;
  }
});


    // 2. Open Terminal
    term.open(termContainer);
    terminalRef.current = term;

    // 3. Custom Resize Logic (Logic for Horizontal Scroll)
    const handleResize = () => {
        if (!termContainer) return;
        
        // Approx char size for 13px font
        const charWidth = 8;  
        const charHeight = 17; 

        const containerWidth = termContainer.clientWidth;
        const containerHeight = termContainer.clientHeight;

        let cols = Math.floor(containerWidth / charWidth);
        const rows = Math.floor(containerHeight / charHeight);

        // FORCE MINIMUM WIDTH for Horizontal Scroll
        // If container is too narrow, keep cols at 80 so scrollbar appears
        if (cols < 80) cols = 80;

        if (term.cols !== cols || term.rows !== rows) {
            term.resize(cols, rows);
        }
    };

    // Initial resize call
    handleResize();

    // Listeners
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(termContainer);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [currentIndex]); 


  useEffect(() => {
    if (connectionExist.current) return;
    connectionExist.current = true;
    
    const ws = new WebSocket(
  `${process.env.NEXT_PUBLIC_WS_URL}/run?token=${session.accessToken}`
);
console.log(ws);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);

      if (msg.type === "output") {
        terminalRef.current?.writeln(msg.data);
        setTerminalBuffer((b) => b + msg.data + "\n");
        
        // -- Re-enable buttons check --
        if (msg.data && msg.data.includes("-- Terminated --")) {
            setIsProcessing(false);
        }
      }
      if (msg.type === "error") {
        terminalRef.current?.writeln(`\x1b[31m${msg.data}\x1b[0m`);
        setTerminalBuffer((b) => b + msg.data + "\n");
        setIsProcessing(false);
      }
      if (msg.type === "submit") {
        setIsProcessing(false); // Enable buttons after result

        let result = msg.data;
        if (typeof result === "string") {
          try { result = JSON.parse(result); } catch (e) { console.error(e); }
        }

        if (result.correct) {
          terminalRef.current?.writeln("\x1b[32mCorrect!\x1b[0m");
          setTerminalBuffer((b) => b + "Correct!\n");
          setCompleted((prev) => {
            const copy = [...prev];
            copy[currentIndexRef.current] = true;
            return copy;
          });
        } else {
          terminalRef.current?.writeln("\x1b[31mIncorrect\x1b[0m");
          setTerminalBuffer((b) => b + "Incorrect!\n");
        }

        if (result.details?.[0]) {
          const { input, expected, actual } = result.details[0];
          if (input && input.trim() !== "") {
  terminalRef.current?.writeln(`\x1b[31m[INPUT USED]\n ${input}\x1b[0m`);
}

          terminalRef.current?.writeln(`\x1b[31m[EXPECTED]\n ${expected}\x1b[0m`);
          terminalRef.current?.writeln(`\x1b[31m[ACTUAL]\n ${actual}\x1b[0m`);
          setTerminalBuffer((b) => b + `[INPUT USED] ${input}\n` + `[EXPECTED] ${expected}\n` + `[ACTUAL] ${actual}\n`);
        }
      }
    };
    return () => {
      ws.close();
      connectionExist.current = false;
    };
  }, [session]);

  // Cleanup chat on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      connectionExist.current = false;
      resetChat();
    };
  }, []);

  const resetChat = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/reset`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
          body: JSON.stringify({
            levelId: levelId
          })
      });
      setMsgs([]);
    } catch (err) {
      console.error("Failed to reset chat", err);
    }
  };

  /* ================= Actions ================= */
  const getCodePayload = (idx: number) => {
    const codeMap: { [key: string]: string } = {};
    allFiles[idx].forEach(f => {
      codeMap[f.name] = f.code;
    });
    return codeMap;
  };

  const runCode = () => {
    setIsProcessing(true); // Disable
    terminalRef.current?.clear();
    const payload = getCodePayload(currentIndex);
    wsRef.current?.send(
      JSON.stringify({ type: "run", code: payload })
    );
  };

  const submitCode = () => {
    setIsProcessing(true); // Disable
    terminalRef.current?.clear();
    const payload = getCodePayload(currentIndex);
    wsRef.current?.send(
      JSON.stringify({
        type: "submit",
        code: payload,
        questionId: questions[currentIndex].id,
      })
    );
  };

  // Completion API Call
  useEffect(() => {
    if (completed.length > 0 && completed.every(Boolean)) {
      alert("🎉 You have finished all coding questions for this level!");
      const userId = (session.user as any).id || (session as any).userId;
      if (userId) {
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/levelCompletion/complete-coding`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: userId,
            levelId: levelId
          })
        }).catch(err => console.error(err));
      }
    }
  }, [completed, levelId, session]);

  // Sync Editor Code to State
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const handleChange = () => {
      setAllFiles(prev => {
        const copy = [...prev];
        if (copy[currentIndex]?.[activeTabs[currentIndex]]) {
            copy[currentIndex][activeTabs[currentIndex]].code = editor.getValue();
        }
        return copy;
      });
    };
    editor.on("change", handleChange);
    return () => {
      editor.off("change", handleChange);
    };
  }, [currentIndex, activeTabs]);

  /* ================= UI ================= */
  return (
    <div className="flex h-screen w-full gap-4 p-4 bg-gray-900 text-white overflow-hidden">
      {/* Top-left Back Button */}
  <button
    onClick={() => router.push(`/lessons/${subjectId}/${levelId}`)}
    className="absolute top-4 left-4 bg-white/80 hover:bg-white text-black font-semibold py-2 px-4 rounded-lg shadow-lg transition z-20"
  >
    ← Back
  </button>
      {/* 1. LEFT SIDEBAR: PROGRESS */}
      <div className="w-[120px] shrink-0 bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col">
        <h3 className="font-bold mb-4 text-center border-b border-gray-600 pb-2">Progress</h3>
        <div className="flex flex-col gap-3 overflow-y-auto items-center flex-1 no-scrollbar">
          {questions.map((q, i) => {
            const isDone = completed[i];
            const isCurrent = currentIndex === i;
            let bgClass = isDone ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-500";
            let ringClass = isCurrent ? "ring-2 ring-blue-500 border-white scale-110" : "";

            return (
              <button
                key={q.id}
                className={`w-10 h-10 rounded-md text-sm font-semibold text-white transition-all shadow-md ${bgClass} ${ringClass} disabled:opacity-50`}
                onClick={() => !isProcessing && setCurrentIndex(i)}
                disabled={isProcessing}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CENTER PANEL: MAIN CONTENT */}
      <div className="flex-1 flex flex-col bg-gray-800 rounded-lg border border-gray-700 overflow-hidden min-w-[500px]">
        
        {/* Top: Question & Tabs */}
        <div className="bg-gray-850 border-b border-gray-700 shrink-0">
            <div className="p-4">
                <h2 className="text-lg font-bold text-blue-400">Question {currentIndex + 1}</h2>
                {/* whitespace-pre-wrap: Handles \n correctly and wraps text (No horizontal scroll on question) */}
                <div className="mt-2 p-3 bg-gray-900 rounded border border-gray-700 text-gray-300 text-sm whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                    {questions[currentIndex]?.prompt.replace(/\\n/g, '\n') || "Loading..."}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 overflow-x-auto">
                {allFiles[currentIndex]?.map((file, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveTabs(prev => {
                            const t = [...prev]; 
                            t[currentIndex] = idx; 
                            return t;
                        })}
                        className={`px-4 py-2 text-xs font-mono rounded-t-md border-t border-l border-r ${
                            activeTabs[currentIndex] === idx 
                            ? "bg-gray-900 text-blue-400 border-gray-600 border-b-gray-900" 
                            : "bg-gray-800 text-gray-500 border-transparent hover:bg-gray-700"
                        }`}
                    >
                        {file.name}.java
                    </button>
                ))}
            </div>
        </div>

        {/* Middle: Split Editor & Terminal */}
        <div className="flex-1 flex flex-row overflow-hidden bg-gray-900 relative">
            
            {/* EDITOR */}
            <div className="flex-1 flex flex-col relative border-r border-gray-700">
                {/* absolute inset-0: fixes the 'editor too small' / 'cut off' issues */}
                <div className="absolute inset-0">
                    <div id="editor" className="w-full h-full" />
                </div>
            </div>

            {/* TERMINAL */}
            {/* w-[40%]: Side by side. min-w-[300px]: Ensure it doesn't get too small */}
            <div className="w-[40%] min-w-[300px] flex flex-col bg-black">
                <div className="flex justify-between items-center px-3 py-1 bg-gray-900 border-b border-gray-700 shrink-0">
                     <span className="text-xs font-bold text-gray-400 uppercase">Console</span>
                </div>
                {/* Relative container for xterm to fill */}
                <div className="flex-1 relative overflow-hidden">
                    {/* Overflow-auto here creates the scrollbar when xterm canvas is wider than this div */}
                    <div id="terminal-container" className="absolute inset-0 p-1 overflow-auto" />
                </div>
            </div>
        </div>

        {/* Bottom: Buttons */}
        <div className="p-3 bg-gray-800 border-t border-gray-700 shrink-0 flex gap-3 justify-end">
            <button 
                onClick={runCode}
                disabled={isProcessing}
                className={`px-5 py-2 rounded font-semibold text-sm transition shadow-lg ${
                    isProcessing 
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
            >
                {isProcessing ? "Run Code" : "Run Code"}
            </button>
            <button 
                onClick={submitCode}
                disabled={isProcessing}
                className={`px-5 py-2 rounded font-semibold text-sm transition shadow-lg ${
                    isProcessing 
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
            >
                {isProcessing ? "Submit" : "Submit"}
            </button>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR: AI CHAT */}
      <div className="w-[300px] shrink-0 bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col">
       <div className="flex justify-between items-center mb-2">
    <h3 className="text-lg font-bold">AI Tutor</h3>
    <button
      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 active:scale-95 transition"
      onClick={resetChat}
    >
      Reset Chat
    </button>
  </div>
        <AIChat
          question={questions[currentIndex]}
          files={allFiles[currentIndex]}
          output={terminalBuffer}
          token={accessToken}
          msgs={msgs}
          setMsgs={setMsgs}
          resetChat={resetChat}
        />
      </div>
    </div>
  );
}

/* ================= AI Chat Component ================= */
function AIChat({
  question,
  files,
  output,
  token,
  msgs,
  setMsgs,
  resetChat
}: {
  question: CodingQuestion;
  files: CodeFile[];
  output: string;
  token: string;
  msgs: { role: 'user' | 'ai', content: string }[];
  setMsgs: React.Dispatch<React.SetStateAction<{ role: 'user' | 'ai', content: string }[]>>;
  resetChat: () => Promise<void>
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs]);

  const send = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    const userMsg = input;
    setMsgs((m) => [...m, { role: "user", content: userMsg }]);
    setInput("");

    const combinedCode = files
        ? files.map(f => `${f.name} class:\n${f.code}`).join("\n\n && \n\n")
        : "";

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionSelected: question?.prompt || "",
          userMessage: userMsg,
          currentCode: combinedCode,
          consoleOutput: output,
          levelId: question?.levelId || null
        }),
      });

if (res.status === 429) {

      setMsgs((m) => [...m, { role: "ai", content: "Too many requests. Wait for 1 minute." }]);
      setLoading(false);
      return;
    }

    // ❌ Other backend errors
    if (!res.ok) {
     
      setMsgs((m) => [...m, { role: "ai", content: "Something went wrong. Please try again." }]);
      setLoading(false);
      return;
    }

      const data = await res.json();
      setMsgs((m) => [...m, { role: "ai", content: data.reply }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "ai", content: "Error communicating with AI." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-gray-900 border border-gray-700 rounded p-3 mb-3 space-y-3 custom-scrollbar"
      >
        {msgs.length === 0 && (
           <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
               <span className="text-2xl">🤖</span>
               <p className="text-sm">How can I help?</p>
           </div>
        )}
        
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded text-sm max-w-[90%] break-words shadow-sm ${
              m.role === "user"
                ? "bg-blue-600 text-white self-end ml-auto"
                : "bg-gray-700 text-gray-200 self-start mr-auto"
            }`}
          >
             <div className="overflow-x-auto break-words whitespace-pre-wrap">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {m.content}
  </ReactMarkdown>
</div>

          </div>
        ))}
        {loading && <div className="text-gray-500 text-xs italic animate-pulse">AI is typing...</div>}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your code..."
          rows={2}
          className="w-full resize-none bg-gray-900 border border-gray-600 rounded p-2 text-sm focus:outline-none focus:border-blue-500 transition placeholder-gray-600"
          onKeyDown={(e) => {
            if(e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
          }}
        />
        <button 
            onClick={send} 
            disabled={loading}
            className="w-full py-2 bg-blue-600 rounded text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 transition"
        >
            Send
        </button>
      </div>
    </div>
  );
}