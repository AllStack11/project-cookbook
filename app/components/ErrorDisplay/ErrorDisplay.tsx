import { useMemo } from "react";
import { ErrorCode } from "@/types/api";
import { getFunnyCookingError } from "@/lib/utils/cookingMessages";

interface ErrorDisplayProps {
  error: string;
  errorCode?: ErrorCode;
  onRetry?: () => void;
}

export default function ErrorDisplay({
  error,
  errorCode,
  onRetry,
}: ErrorDisplayProps) {
  const isLLMError =
    errorCode === ErrorCode.INTERNAL_ERROR ||
    errorCode === ErrorCode.EXTRACTION_FAILED ||
    errorCode === ErrorCode.VALIDATION_FAILED;

  const displayMessage = useMemo(() => {
    if (isLLMError) {
      return getFunnyCookingError();
    }
    return error;
  }, [isLLMError, error]);

  const getErrorConfig = () => {
    switch (errorCode) {
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return {
          icon: "⏱️",
          title: "Slow Down, Chef!",
          bgGradient: "from-amber-50 to-orange-50",
          borderColor: "border-amber-200",
          iconBg: "bg-amber-100",
          titleColor: "text-amber-900",
          textColor: "text-amber-800",
        };
      case ErrorCode.NO_RECIPE_FOUND:
        return {
          icon: "🔍",
          title: "No Recipe Found",
          bgGradient: "from-blue-50 to-indigo-50",
          borderColor: "border-blue-200",
          iconBg: "bg-blue-100",
          titleColor: "text-blue-900",
          textColor: "text-blue-800",
        };
      case ErrorCode.INVALID_URL:
        return {
          icon: "🔗",
          title: "Invalid URL",
          bgGradient: "from-purple-50 to-pink-50",
          borderColor: "border-purple-200",
          iconBg: "bg-purple-100",
          titleColor: "text-purple-900",
          textColor: "text-purple-800",
        };
      case ErrorCode.EXTRACTION_FAILED:
        return {
          icon: "🍳",
          title: "Extraction Failed",
          bgGradient: "from-rose-50 to-red-50",
          borderColor: "border-rose-200",
          iconBg: "bg-rose-100",
          titleColor: "text-rose-900",
          textColor: "text-rose-800",
        };
      default:
        return {
          icon: "😅",
          title: "Oops, Something Went Wrong",
          bgGradient: "from-red-50 to-rose-50",
          borderColor: "border-red-200",
          iconBg: "bg-red-100",
          titleColor: "text-red-900",
          textColor: "text-red-800",
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className={`card-cozy bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} p-6 md:p-8 overflow-hidden relative`}>
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-bl-full pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start gap-5">
          {/* Icon */}
          <div className={`flex-shrink-0 w-14 h-14 ${config.iconBg} rounded-2xl flex items-center justify-center text-3xl shadow-warm-sm`}>
            {config.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`text-xl font-bold ${config.titleColor} mb-2`}>
              {config.title}
            </h3>
            <p className={`${config.textColor} leading-relaxed mb-6`}>
              {displayMessage}
            </p>

            {/* Contextual help boxes */}
            {errorCode === ErrorCode.RATE_LIMIT_EXCEEDED && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-5 border border-amber-100">
                <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">📊</span> Free Tier Limits
                </p>
                <ul className="space-y-1.5 text-sm text-amber-800">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    10 recipe extractions per day
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    Resets every 24 hours
                  </li>
                </ul>
              </div>
            )}

            {errorCode === ErrorCode.NO_RECIPE_FOUND && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-5 border border-blue-100">
                <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">💡</span> Tips to Try
                </p>
                <ul className="space-y-1.5 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    Make sure the URL contains an actual recipe
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    Try a different URL from a recipe website
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    Paste the recipe text directly instead
                  </li>
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              )}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="btn-soft inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Back to Top
              </button>
            </div>

            {/* Technical details for LLM errors */}
            {isLLMError && (
              <div className="mt-5 pt-4 border-t border-red-100">
                <p className="text-xs text-red-400 font-medium">
                  Technical details: {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
