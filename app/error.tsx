"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto p-8 text-center">
      <div className="card-cozy p-8">
        <div className="text-5xl mb-4">🍳</div>
        <h2 className="text-2xl font-black text-chocolate-900 mb-3">
          Something went wrong
        </h2>
        <p className="text-chocolate-600 mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button onClick={reset} className="btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}
