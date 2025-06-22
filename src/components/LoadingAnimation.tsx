import { Loader2 } from "lucide-react";

export const LoadingAnimation = ({ message = "Loading..." }: { message?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-green-200 rounded-full animate-pulse"></div>
        <Loader2 className="w-12 h-12 absolute top-0 left-0 animate-spin text-green-600" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-gray-700">{message}</p>
        <p className="text-sm text-gray-500">This might take a few moments...</p>
      </div>
    </div>
  );
}; 