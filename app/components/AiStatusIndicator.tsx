"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "online" | "offline";

export default function AiStatusIndicator() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/health/llm");
        const data = await response.json();
        if (data.status === "online") {
          setStatus("online");
        } else {
          setStatus("offline");
        }
      } catch (error) {
        setStatus("offline");
      }
    }

    checkStatus();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case "online":
        return "bg-herb-500";
      case "offline":
        return "bg-red-500";
      case "loading":
      default:
        return "bg-amber-400 animate-pulse";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "online":
        return "AI-Powered Extraction";
      case "offline":
        return "AI Offline";
      case "loading":
      default:
        return "Checking AI Status...";
    }
  };

  return (
    <div
      className={`flex items-center gap-1.5 transition-opacity duration-500 ${status === "loading" ? "opacity-40" : "opacity-60"}`}
      title={
        status === "offline"
          ? "The AI extraction service is currently unavailable."
          : "Powered by configured LLM gateway"
      }
    >
      <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
      <span className="text-[10px] font-bold uppercase tracking-wider">
        {getStatusText()}
      </span>
    </div>
  );
}
