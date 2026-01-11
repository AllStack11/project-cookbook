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

  const getErrorIcon = () => {
    switch (errorCode) {
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return "⏱️";
      case ErrorCode.NO_RECIPE_FOUND:
        return "🔍";
      case ErrorCode.INVALID_URL:
        return "🔗";
      default:
        return "⚠️";
    }
  };

  const getErrorTitle = () => {
    switch (errorCode) {
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return "Rate Limit Exceeded";
      case ErrorCode.NO_RECIPE_FOUND:
        return "No Recipe Found";
      case ErrorCode.INVALID_URL:
        return "Invalid URL";
      case ErrorCode.EXTRACTION_FAILED:
        return "Extraction Failed";
      default:
        return "Error";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-4xl mr-4">{getErrorIcon()}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              {getErrorTitle()}
            </h3>
            <p className="text-red-700 mb-6">{displayMessage}</p>

            {errorCode === ErrorCode.RATE_LIMIT_EXCEEDED && (
              <div className="bg-red-100 rounded-md p-3 mb-4 text-sm text-red-800">
                <p className="font-semibold mb-1">Free tier limits:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>10 recipe extractions per day</li>
                  <li>Resets every 24 hours</li>
                </ul>
              </div>
            )}

            {errorCode === ErrorCode.NO_RECIPE_FOUND && (
              <div className="bg-red-100 rounded-md p-3 mb-4 text-sm text-red-800">
                <p className="font-semibold mb-1">Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Make sure the URL contains a recipe</li>
                  <li>Try a different URL from a recipe website</li>
                  <li>Paste the recipe text directly instead</li>
                </ul>
              </div>
            )}

            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors mb-6"
              >
                Try Again
              </button>
            )}

            {isLLMError && (
              <p className="text-xs text-red-400 italic opacity-60">
                Technical details: {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
