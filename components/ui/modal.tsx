"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  showCloseButton?: boolean;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onOpenChange,
  showCloseButton = true,
  title,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content asChild>
          <div
            className={cn(
              "fixed inset-0 z-[60] flex items-center justify-center p-4",
              className,
            )}
          >
            <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg p-6">
              {title && (
                <Dialog.Title className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </Dialog.Title>
              )}

              {children}

              {showCloseButton && (
                <Dialog.Close asChild>
                  <button
                    aria-label="Close"
                    className="absolute top-3 right-3 rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
