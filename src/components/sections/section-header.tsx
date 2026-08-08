"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Section } from "@/types/database";
import { updateSection, deleteSection } from "@/actions/sections";

interface SectionHeaderProps {
  section: Section;
}

export function SectionHeader({ section: initialSection }: SectionHeaderProps) {
  const [section, setSection] = useState(initialSection);
  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState(initialSection.name);
  const [descriptionValue, setDescriptionValue] = useState(initialSection.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus();
  }, [isEditing]);

  const startEdit = () => {
    setNameValue(section.name);
    setDescriptionValue(section.description || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    const trimmedName = nameValue.trim();
    if (!trimmedName) {
      setNameValue(section.name);
      setIsEditing(false);
      return;
    }
    const trimmedDescription = descriptionValue.trim();
    setIsSaving(true);
    try {
      await updateSection(section.id, {
        name: trimmedName,
        description: trimmedDescription || null,
      });
      setSection((prev) => ({
        ...prev,
        name: trimmedName,
        description: trimmedDescription || null,
      }));
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    await deleteSection(section.id);
  };

  if (isEditing) {
    return (
      <div className="mb-3 max-w-xl space-y-2 rounded-md border bg-background p-3">
        <Input
          ref={nameInputRef}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setIsEditing(false);
          }}
          placeholder="Section name"
          disabled={isSaving}
        />
        <Textarea
          value={descriptionValue}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescriptionValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsEditing(false);
          }}
          placeholder="Add a description"
          rows={2}
          disabled={isSaving}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {section.name}
        </h2>
        {section.description && (
          <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap">
            {section.description}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={startEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit section
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete section
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
