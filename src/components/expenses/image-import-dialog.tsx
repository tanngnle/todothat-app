"use client";

import { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Loader2,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ExpenseCategory, Wallet } from "@/types/database";
import type { TransactionDraft } from "@/lib/finance/draft";
import { processReceiptImage } from "@/actions/images";
import { createTransactionsBatch } from "@/actions/transactions";
import { ImagePreviewRow } from "./image-preview-row";

// ---------------------------------------------------------------------------
// Client-side image prep: downscale big images before upload so the AI call
// stays fast and cheap. Max 1568px long edge, JPEG q0.8 output; images that
// are already small are sent untouched.
// ---------------------------------------------------------------------------

const MAX_LONG_EDGE = 1568;

async function downscaleImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // undecodable — let the server-side validation reject it
  }

  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  if (longest <= MAX_LONG_EDGE) {
    bitmap.close();
    return file;
  }

  const scale = MAX_LONG_EDGE / longest;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.8
    )
  );
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

interface ImageImportDialogProps {
  wallets: Wallet[];
  categories: ExpenseCategory[];
  /** Called after a successful batch save (parent refreshes the page). */
  onSaved: () => void;
}

type Status = "idle" | "processing" | "unconfigured" | "preview";

export function ImageImportDialog({
  wallets,
  categories,
  onSaved,
}: ImageImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [drafts, setDrafts] = useState<TransactionDraft[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStatus("idle");
    setDrafts([]);
    setAttachmentUrl(null);
    setInlineError(null);
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setStatus("processing");
    setInlineError(null);
    try {
      const prepared = await downscaleImage(file);
      const fd = new FormData();
      fd.append("file", prepared);
      fd.append("default_wallet_id", wallets[0]?.id ?? "");
      fd.append(
        "categories_json",
        JSON.stringify(
          categories.map((c) => ({
            id: c.id,
            name: c.name,
            name_vi: c.name_vi,
          }))
        )
      );

      const result = await processReceiptImage(fd);

      if ("configured" in result) {
        setStatus("unconfigured");
        return;
      }
      if ("error" in result) {
        toast.error(result.error);
        setInlineError(result.error);
        setStatus("idle");
        return;
      }
      setDrafts(result.drafts);
      setAttachmentUrl(result.attachmentUrl);
      setStatus("preview");
    } catch {
      toast.error("Something went wrong while processing the image");
      setInlineError("Something went wrong while processing the image");
      setStatus("idle");
    }
  };

  const handleRowChange = (index: number, patch: Partial<TransactionDraft>) => {
    setInlineError(null);
    setDrafts((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const next = { ...d, ...patch };
        if (next.type !== "transfer") next.to_wallet_id = undefined;
        return next;
      })
    );
  };

  const handleRemove = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Rows without a wallet cannot be saved — drop them with a notice.
    const valid = drafts.filter((d) => d.wallet_id !== "");
    const dropped = drafts.length - valid.length;
    if (valid.length === 0) {
      setInlineError("Every row needs a wallet — pick one or remove the row.");
      return;
    }
    const badAmount = valid.find(
      (d) => d.amount === "" || !Number.isInteger(d.amount) || d.amount <= 0
    );
    if (badAmount) {
      setInlineError("Every row needs a positive whole-number amount (VND).");
      return;
    }
    const badTransfer = valid.find(
      (d) =>
        d.type === "transfer" &&
        (!d.to_wallet_id || d.to_wallet_id === d.wallet_id)
    );
    if (badTransfer) {
      setInlineError(
        "Transfer rows need a destination wallet that differs from the source."
      );
      return;
    }

    const payload = valid.map((d) => ({
      type: d.type,
      amount: d.amount as number,
      wallet_id: d.wallet_id,
      to_wallet_id: d.type === "transfer" ? (d.to_wallet_id ?? null) : null,
      category_id: d.type === "transfer" ? null : (d.category_id ?? null),
      person_id: null,
      note: d.note ?? null,
      date: d.date,
      source: "image" as const,
      attachment_url: attachmentUrl,
    }));

    setSaving(true);
    setInlineError(null);
    try {
      const result = await createTransactionsBatch(JSON.stringify(payload));
      if (result.saved !== undefined) {
        toast.success(`Saved ${result.saved} transaction${result.saved === 1 ? "" : "s"} from image`);
        if (dropped > 0) {
          toast.warning(
            `${dropped} row${dropped === 1 ? " was" : "s were"} skipped (no wallet selected)`
          );
        }
        onSaved();
        handleOpenChange(false);
      } else {
        toast.error(result.error);
        setInlineError(result.error);
      }
    } catch {
      toast.error("Failed to save transactions");
      setInlineError("Failed to save transactions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImageIcon className="mr-2 h-4 w-4" />
          Scan receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan receipt
          </DialogTitle>
        </DialogHeader>

        {/* Hidden file input — every phase routes through it. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {status === "idle" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ImageIcon className="h-10 w-10" />
              <span className="text-sm font-medium">
                Choose a receipt photo to scan
              </span>
              <span className="text-xs">
                JPEG, PNG or WebP · up to 10 MB
              </span>
            </button>
            {inlineError && (
              <p className="text-sm text-destructive dark:text-destructive-foreground">{inlineError}</p>
            )}
          </div>
        )}

        {status === "processing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Extracting transactions from your image…
            </p>
          </div>
        )}

        {status === "unconfigured" && (
          <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              AI extraction not configured
            </h3>
            <p className="text-sm text-muted-foreground">
              Receipt scanning needs an Alibaba Cloud Model Studio API key. To
              enable it:
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                Set{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  MODELSTUDIO_API_KEY
                </code>{" "}
                in <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>
              </li>
              <li>Restart the dev server</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Your image was not processed.
            </p>
          </div>
        )}

        {status === "preview" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Review the extracted transaction{drafts.length === 1 ? "" : "s"} —
              every field is editable before saving.
            </p>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {drafts.map((draft, index) => (
                <ImagePreviewRow
                  key={draft.key}
                  draft={draft}
                  index={index}
                  wallets={wallets}
                  categories={categories}
                  onChange={handleRowChange}
                  onRemove={handleRemove}
                />
              ))}
            </div>
            {drafts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                All rows removed — close the dialog or scan another image.
              </p>
            )}
            {inlineError && (
              <p className="text-sm text-destructive dark:text-destructive-foreground">{inlineError}</p>
            )}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                <ImageIcon className="mr-1 h-4 w-4" />
                Scan another
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={drafts.length === 0 || saving}
              >
                {saving
                  ? "Saving…"
                  : `Save ${drafts.length} transaction${drafts.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
