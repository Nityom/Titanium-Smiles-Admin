import React from 'react';
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
  loading?: boolean;
}

export const ErrorDisplay = ({ error, onRetry, loading = false }: ErrorDisplayProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 w-full max-w-md">
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              <ReloadIcon className="h-4 w-4" />
            </div>
            <div className="flex-grow text-left">
              <h4 className="font-medium">Error Loading Data</h4>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </Alert>
        <Button 
          onClick={onRetry} 
          variant="default"
          className="flex items-center gap-2 mx-auto"
          disabled={loading}
        >
          {loading ? (
            <>
              <ReloadIcon className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <ReloadIcon className="h-4 w-4" />
              <span>Try Again</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
