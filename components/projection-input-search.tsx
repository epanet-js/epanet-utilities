"use client";

import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Projection } from "@/lib/types";

interface ProjectionInputSearchProps {
  value: Projection | null;
  onValueChange: (value: Projection | null) => void;
  placeholder?: string;
  projections: Projection[];
  loading: boolean;
  onProjectionSelect?: (projection: Projection) => void;
}

export function ProjectionInputSearch({
  value,
  onValueChange,
  placeholder = "Search projections...",
  projections,
  loading,
  onProjectionSelect,
}: ProjectionInputSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Projection[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  // Handle projection search
  React.useEffect(() => {
    if (!searchQuery) {
      // if no query, show default projection
      setItems([
        {
          id: "EPSG:4326",
          name: "WGS 84",
          code: "+proj=longlat +datum=WGS84 +no_defs",
        },
      ]);
      return;
    }
    // Filter from the "projections" prop
    const filtered = projections
      .filter(
        (proj) =>
          proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          proj.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .slice(0, 25);
    setItems(filtered);
  }, [searchQuery, projections]);

  const handleProjectionSelect = (proj: Projection) => {
    setOpen(false);
    onValueChange(proj);
    onProjectionSelect?.(proj);
  };

  return (
    <Command
      ref={dropdownRef}
      className="w-full"
      shouldFilter={false}
      onBlur={(e) => {
        if (
          dropdownRef.current &&
          dropdownRef.current.contains(e.relatedTarget)
        ) {
          return; // Prevent closing if clicking inside dropdown
        }
        setTimeout(() => setOpen(false), 100); // Close if clicked outside
      }}
    >
      <div className="flex flex-row gap-4 items-center">
        <p className="text-sm text-gray-500 dark:text-gray-300 text-nowrap">Select projection</p>
        <button
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800",
            "hover:bg-gray-100 dark:hover:bg-slate-700/50",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
          )}
          onClick={() => {
            setOpen(!open);
            // set focus to input when opening dropdown
            if (!open) {
              setTimeout(() => inputRef.current?.focus(), 10);
            }
          }}
        >
          {value ? (
            value.name
          ) : (
            <span className="text-gray-500 dark:text-slate-400">
              Projection...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </div>
      {open && (
        <div className="relative mt-2">
          <div className="absolute top-0 z-50 w-full rounded-sm border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800">
            <CommandInput
              ref={inputRef}
              placeholder={placeholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="w-full border-0 border-b border-gray-200 px-3 py-2 text-sm dark:border-slate-700"
            />
            <CommandList>
              {loading && (
                <CommandLoading>Loading projections...</CommandLoading>
              )}
              <CommandEmpty className="py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                No projection found.
              </CommandEmpty>
              <CommandGroup className="max-h-60 overflow-auto p-1 ">
                {items.map((proj) => (
                  <CommandItem
                    key={proj.id}
                    value={proj.id}
                    onMouseDown={(e) => e.preventDefault()} // Prevents blur when clicking an item
                    onSelect={(currentValue) => {
                      const proj = items.find((p) => p.id === currentValue);
                      if (!proj) return;

                      if (currentValue === value?.id) {
                        // Deselect current projection
                        setOpen(false);
                        onValueChange(null);
                      } else {
                        // Select new projection
                        handleProjectionSelect(proj);
                      }
                    }}
                    className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-purple-100 dark:hover:bg-slate-700"
                  >
                    <div>
                      <div className="font-medium">{proj.name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 truncate overflow-hidden whitespace-nowrap max-w-[280px]">
                        {proj.code}
                      </div>
                    </div>
                    {value?.id === proj.id && <Check className="h-4 w-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        </div>
      )}
    </Command>
  );
}
