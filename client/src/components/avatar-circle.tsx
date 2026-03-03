type AvatarCircleProps = {
  firstName: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function AvatarCircle({ firstName, color, size = "md", className = "" }: AvatarCircleProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color }}
      data-testid={`avatar-${firstName.toLowerCase()}`}
    >
      {firstName.charAt(0).toUpperCase()}
    </div>
  );
}
