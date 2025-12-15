"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { data: session, status } = useSession();
   const router = useRouter();
const handleGetStarted = () => {
    if (session) {
      router.push("/lessons");  // redirect if logged in
    } else {
      signIn("google", { prompt: "login" }); // login first
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Floating Header */}
      <header className="flex justify-between items-center p-6 bg-white/80 backdrop-blur-md fixed w-full z-10">
        {/* Left side: user profile after login */}
        {session ? (
          <div className="flex items-center gap-4 ml-auto">
            <img
  src={session.user?.image || "/default-avatar.png"}
  
  alt="Avatar"
  className="w-10 h-10 rounded-full"
/>

            <span className="font-medium text-black">{session.user?.name || session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={() => signIn("google", { prompt: "login" })}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold"
            >
              Login with Google
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative">
        {/* Background logo as full-screen image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/1.jpg')" }} // your logo as background
        ></div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center px-4">
          {/* Main text */}
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
            Welcome to Your Personal Tutor
          </h1>
          

          {/* Get Started button */}
          <button
            onClick={handleGetStarted}
            className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold transition mb-4"
          >
            Get Started
          </button>

          {/* Optional: show sign-in button only if not logged in */}
          {!session && (
            <p className="text-white mt-2">Sign in to save your progress</p>
          )}
        </div>
      </main>
    </div>
  );
}
