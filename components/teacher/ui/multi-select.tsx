"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/teacher/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/teacher/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/teacher/ui/popover";
import { Badge } from "@/components/teacher/ui/badge";

export interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeOption = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-[40px] px-3 py-2 text-left font-normal", className)}
        >
          <div className="flex flex-wrap gap-1 items-center overflow-hidden">
            {selected.length === 0 && (
              <span className="text-muted-foreground line-clamp-1">{placeholder}</span>
            )}
            {selected.length > 0 && selected.length <= 2 &&
              selected.map((val) => {
                const opt = options.find((o) => o.value === val);
                return (
                  <Badge variant="secondary" key={val} className="mr-1 rounded-sm px-1 font-normal flex items-center gap-1">
                    {opt?.label || val}
                    <X className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={(e) => removeOption(e, val)} />
                  </Badge>
                );
              })}
            {selected.length > 2 && (
               <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                 {selected.length} selected
               </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => toggleOption(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
