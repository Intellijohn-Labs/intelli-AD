"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** Password field with a show/hide (eye) toggle. The toggle is type="button", so it never submits the form. */
export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={showPassword ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {showPassword ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" aria-hidden="true" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" aria-hidden="true" />}
      </button>
    </div>
  );
}
