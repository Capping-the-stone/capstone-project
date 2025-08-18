"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

type Language = Record<"value" | "label", string>;

const LANGUAGES = [
  {
    "label": "C",
    "value": "c",
  },
  {
    "label": "Python",
    "value": "py",
  }
] satisfies Language[];

const valueLabelMapping = {
  "py": "Python",
  "c": "C",
}

// UPDATE LANGUAGES HERE WHEN WE ADD MORE LANGUAGES

export function LanguageMultiSelect({ languagesSelected, onSelect, onUnselect }: { languagesSelected: string[], onSelect: (value: string) => void, onUnselect: (value: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  let initialSelectedLanguages = languagesSelected.map((lang: string) => {
    return {
      value: lang,
      label: valueLabelMapping[lang],
    }
  });

  const [selected, setSelected] = React.useState<Language[]>(initialSelectedLanguages);

  React.useEffect(() => {
    setSelected(initialSelectedLanguages)
  }, [languagesSelected])

  const [inputValue, setInputValue] = React.useState("");
  const handleUnselect = React.useCallback((language: Language) => {
    setSelected((prev) => prev.filter((s) => s.value !== language.value));
    onUnselect(language.value);
  }, [onUnselect]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            setSelected((prev) => {
              const newSelected = [...prev];
              newSelected.pop();
              return newSelected;
            });
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    []
  );

  const selectables = LANGUAGES.filter(
    (language) => !selected.some((selLang) => selLang.value === language.value)
  );


  return (
    <Command
      onKeyDown={handleKeyDown}
      className="overflow-visible bg-transparent"
    >
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((language) => {
            return (
              <Badge key={language.value} variant="secondary">
                {language.label}
                <button
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(language);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(language)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
          {/* Avoid having the "Search" Icon */}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder="Select languages..."
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="relative mt-2">
        <CommandList>
          {open && selectables.length > 0 ? (
            <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup className="h-full overflow-auto">
                {selectables.map((language) => {
                  return (
                    <CommandItem
                      key={language.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={(value) => {
                        setInputValue("");
                        setSelected((prev) => [...prev, language]);
                        onSelect(language.value)
                      }}
                      className={"cursor-pointer"}
                    >
                      {language.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ) : null}
        </CommandList>
      </div>
    </Command>
  );
}
