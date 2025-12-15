"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react"; // 1. Need session for UserId

interface Level {
  levelId: number;
  title: string;
  orderNum: string;
  subjectId: number;
}

interface LevelCompletion {
  id:number
  userId: number;
  levelId: number;
  quizDone: boolean;
  codingDone: boolean;
}

interface UserProgress {
  id:number
  userId: number;
  updatedAt: String;
  currentLevelId: number;
  subjectId: number;
}

export default function LevelHubPage() {
  const { data: session,status } = useSession();
  const params = useParams();
  const router = useRouter();


  const userId = session?.user?.id;
  const subjectId = Number(params.subjectId);
  const levelId = Number(params.level); // Note: Make sure folder is [levelId], not [level]

  const [levelData, setLevelData] = useState<Level | null>(null);
  const [hasCoding, setHasCoding] = useState<boolean>(false);
  console.log("SESSION:", session);
console.log("userId:", session?.user?.id);

console.log("URL params:", params);
console.log("subjectId:", subjectId);
console.log("levelId:", levelId);
  // Track completion status for the UI
  const [quizDone, setQuizDone] = useState(false);
  const [codingDone, setCodingDone] = useState(false);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
if (status === "unauthenticated") {
    router.push("/");
  }

    if (!subjectId || !levelId || !userId) return;
console.log("Loading lobby data for subject:", subjectId, "level:", levelId, "user:", userId);
    const loadLobbyData = async () => {
      try {
        setLoading(true);
        
        // Fetch EVERYTHING in parallel for speed
        const [levelRes, existRes, mainProgressRes, completionRes] = await Promise.all([
          // 1. Level Details
          fetch(`http://localhost:8080/api/levels/${levelId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 🔑 Send the Backend-Minted JWT (String)
          Authorization: `Bearer ${session.accessToken}`,
        },
      }),
          // 2. Does Coding Exist?
          fetch(`http://localhost:8080/api/codingQuestion/exist/level/${levelId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 🔑 Send the Backend-Minted JWT (String)
          Authorization: `Bearer ${session.accessToken}`,
        },
      }),
          // 3. User's Main Progress (Where are they generally?)
          fetch(`http://localhost:8080/api/user-progress/user/${userId}/subjectId/${subjectId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 🔑 Send the Backend-Minted JWT (String)
          Authorization: `Bearer ${session.accessToken}`,
        },
      }),
          // 4. Specific Level Completion (What have they done in THIS level?)
          fetch(`http://localhost:8080/api/levelCompletion/userId/${userId}/levelId/${levelId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 🔑 Send the Backend-Minted JWT (String)
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        ]);

        // --- Process Level Info ---
        if (levelRes.ok) {
          setLevelData(await levelRes.json());
        }

        // --- Process Coding Existence ---
        if (existRes.ok) {
          setHasCoding(await existRes.json());
        }

        // --- Process Logic: Are practices done? ---
        if (mainProgressRes.ok) {
          const mainProgress: UserProgress = await mainProgressRes.json();
          
          // LOGIC: If user is on a HIGHER level (or different level), assume this one is fully passed.
          // Note: Ideally compare orderNum, but strictly comparing IDs works if user can't skip ahead.
          if (Number(mainProgress.currentLevelId) !== levelId) {
             console.log("User is on a different level. Assuming this level is fully complete.");
             setQuizDone(true);
             setCodingDone(true);
          } else {
             // LOGIC: User is ON this level currently. Check specific completion flags.
             console.log("User is on this level. Checking specific tasks...");
             if (completionRes.ok) {
               // The backend might return null if no record exists yet (user just started)
               const completionData = await completionRes.json(); 
               if (completionData) {
                 setQuizDone(completionData.quizDone);
                 setCodingDone(completionData.codingDone);
               }
             }
          }
        }

      } catch (error) {
        console.error("Failed to load lobby data", error);
      } finally {
        setLoading(false);
      }
    };

    loadLobbyData();
  }, [subjectId, levelId, userId, status, router]);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Mission Data...</div>;
  if (!levelData) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Level Not Found</div>;

  // Helper Component for the "Success Checkmark"
  const SuccessBadge = () => (
    <div className="absolute top-2 right-2 z-20 bg-green-500 text-white rounded-full p-1 shadow-lg animate-bounce-short">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
       {/* Background */}
       <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/1.jpg')" }}></div>
       <div className="absolute inset-0 bg-black/70"></div>

       {/* Back Button */}
       <button 
         onClick={() => router.back()} 
         className="absolute top-8 left-8 z-20 text-white hover:text-yellow-400 font-bold flex items-center gap-2 transition"
       >
         ← Back to Map
       </button>

       {/* Content */}
       <div className="relative z-10 w-full max-w-5xl">
          <div className="text-center mb-20">
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
              Level {levelData.orderNum}: {levelData.title}
            </h1>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            
            {/* 1. LEARN CARD (Always available, no checkmark needed usually) */}
            <Link href={`/lessons/${subjectId}/${levelId}/learn`} className="group w-full md:w-80 lg:w-96">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 h-full hover:bg-white/20 hover:scale-[1.02] transition duration-300 shadow-xl cursor-pointer flex flex-col items-center text-center overflow-hidden">
                <div className="relative w-full h-48 mb-6 rounded-xl overflow-hidden shadow-inner">
                   <Image src="/card-theory.jpg" alt="Theory" fill className="object-cover group-hover:scale-110 transition duration-500" />
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition"></div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">The Theory</h2>
                <p className="text-gray-400 text-sm">Study the slides and ask the AI Tutor.</p>
              </div>
            </Link>

            {/* 2. QUIZ CARD */}
            <Link href={quizDone ? "#" : `/lessons/${subjectId}/${levelId}/quiz`} className={`group w-full md:w-80 lg:w-96 ${quizDone ? 'cursor-default' : ''}`}>
              <div className={`backdrop-blur-md rounded-2xl p-6 h-full transition duration-300 shadow-xl flex flex-col items-center text-center overflow-hidden relative
                  ${quizDone 
                    ? "bg-green-900/20 border-2 border-green-500" // Completed Style
                    : "bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-[1.02] cursor-pointer" // Normal Style
                  }
              `}>
                
                {/* Show Badge if Done */}
                {quizDone && <SuccessBadge />}

                <div className="relative w-full h-48 mb-6 rounded-xl overflow-hidden shadow-inner">
                   <Image src="/card-quiz.jpg" alt="Quiz" fill className="object-cover group-hover:scale-110 transition duration-500" />
                   {/* If done, make image slightly greener/darker */}
                   <div className={`absolute inset-0 transition ${quizDone ? 'bg-green-900/30' : 'bg-black/20 group-hover:bg-black/0'}`}></div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">
                    {quizDone ? "Quiz Completed" : "Quiz"}
                </h2>
                <p className="text-gray-400 text-sm">
                    {quizDone ? "Great job! You've mastered this." : "Multiple choice questions to test your logic."}
                </p>
              </div>
            </Link>

            {/* 3. CODE CARD */}
            {hasCoding && (
              <Link href={codingDone ? "#" : `/lessons/${subjectId}/${levelId}/code`} className={`group w-full md:w-80 lg:w-96 ${codingDone ? 'cursor-default' : ''}`}>
                <div className={`backdrop-blur-md rounded-2xl p-6 h-full transition duration-300 shadow-xl flex flex-col items-center text-center relative overflow-hidden
                    ${codingDone 
                        ? "bg-green-900/20 border-2 border-green-500" 
                        : "bg-white/10 border border-yellow-500/30 hover:bg-yellow-500/20 hover:scale-[1.02] cursor-pointer"
                    }
                `}>
                  
                  {/* Badge or Challenge Tag */}
                  {codingDone ? (
                      <SuccessBadge />
                  ) : (
                      <div className="absolute top-0 right-0 z-10 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg shadow-md">
                        CHALLENGE
                      </div>
                  )}

                  <div className="relative w-full h-48 mb-6 rounded-xl overflow-hidden shadow-inner">
                     <Image src="/card-code.jpg" alt="Coding" fill className="object-cover group-hover:scale-110 transition duration-500" />
                     <div className={`absolute inset-0 transition ${codingDone ? 'bg-green-900/30' : 'bg-black/20 group-hover:bg-black/0'}`}></div>
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-2">
                    {codingDone ? "Lab Completed" : "Coding Lab"}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {codingDone ? "You have proven your coding skills." : "Solve real programming problems."}
                  </p>
                </div>
              </Link>
            )}

          </div>
       </div>
       
       {/* Small animation for the checkmark */}
       <style jsx>{`
        @keyframes bounce-short {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        .animate-bounce-short {
            animation: bounce-short 1s ease-in-out;
        }
       `}</style>
    </div>
  );
}