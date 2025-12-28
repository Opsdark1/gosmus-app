import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-lg font-medium">Chargement...</p>
      </div>
    </div>
  );
}
