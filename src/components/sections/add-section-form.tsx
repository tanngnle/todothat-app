"use client";

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSection } from "@/actions/sections";

interface AddSectionFormProps {
  projectId: string;
}

export function AddSectionForm({ projectId }: AddSectionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) nameInputRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    try {
      await createSection(projectId, trimmedName, description.trim());
      setName("");
      setDescription("");
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Add section
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-2 rounded-md border bg-background p-3"
    >
      <Input
        ref={nameInputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name this section"
        disabled={isSubmitting}
      />
      <Textarea
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        placeholder="Add a description"
        rows={2}
        disabled={isSubmitting}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!name.trim() || isSubmitting}>
          Add section
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
