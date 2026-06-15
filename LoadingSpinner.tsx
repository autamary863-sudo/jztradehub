import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

const LoadingSpinner = ({ className, size = "md", fullScreen = false }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-12 h-12 text-xl",
    lg: "w-16 h-16 text-2xl",
  };

  const spinner = (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className={cn(
        "rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white animate-pulse",
        sizeClasses[size]
      )}>
        <span className="animate-bounce">JZ</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
