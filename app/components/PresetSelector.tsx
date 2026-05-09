"use client";

import * as Select from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import type { PresetWithHint } from "../types";

interface PresetSelectorProps {
  presets: PresetWithHint[];
  value: string;
  onChange: (id: string) => void;
}

export function PresetSelector({ presets, value, onChange }: PresetSelectorProps) {
  const selected = presets.find((p) => p.id === value) ?? presets[0];

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label="Quality preset"
        className={`
          flex h-8 flex-1 w-full items-center justify-between gap-2 rounded-lg border
          border-zinc-700/70 bg-zinc-800 pl-3 pr-2.5 text-xs text-white outline-none
          transition-all duration-150
          hover:border-zinc-600
          focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20
          data-[state=open]:border-blue-500/70 data-[state=open]:ring-2 data-[state=open]:ring-blue-500/20
          data-[placeholder]:text-zinc-400
        `}
      >
        <Select.Value>
          <span className="truncate font-medium">{selected?.name ?? "Select preset…"}</span>
        </Select.Value>
        <Select.Icon>
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          align="start"
          avoidCollisions
          className={`
            z-[200] min-w-[var(--radix-select-trigger-width)] overflow-hidden
            rounded-xl border border-zinc-700/70 bg-zinc-900/98 shadow-2xl
            ring-1 ring-white/5 backdrop-blur-sm
            data-[state=open]:animate-[scale-in_0.15s_ease-out]
            data-[state=closed]:animate-[scale-out_0.1s_ease-in]
            origin-top
          `}
        >
          <Select.Viewport className="p-1">
            {presets.map((preset) => (
              <Select.Item
                key={preset.id}
                value={preset.id}
                title={preset.hint}
                className={`
                  group relative flex cursor-pointer select-none items-center gap-2.5
                  rounded-lg px-3 py-2 text-xs outline-none
                  transition-colors duration-100
                  text-zinc-300
                  data-[highlighted]:bg-zinc-800 data-[highlighted]:text-white
                  data-[state=checked]:text-white
                `}
              >
                {/* Check indicator */}
                <span className="flex w-3.5 flex-shrink-0 items-center justify-center">
                  <Select.ItemIndicator>
                    <Check className="h-3 w-3 text-blue-400" />
                  </Select.ItemIndicator>
                </span>

                <div className="min-w-0 flex-1">
                  <Select.ItemText>
                    <span className="block truncate font-semibold">{preset.name}</span>
                  </Select.ItemText>
                  {preset.hint && (
                    <span className="block truncate text-[10px] text-zinc-500 group-data-[state=checked]:text-zinc-400 mt-0.5">
                      {preset.hint}
                    </span>
                  )}
                </div>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
