import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/shadcn/alert-dialog";
import { Button } from "../../../components/ui/shadcn/button";

export function DeletePreemptionDialog({
  config,
  open,
  onOpenChange,
  onConfirm,
  isBusy,
}) {
  if (!config) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs h-8 bg-red-600/10 text-red-400 border-red-500/30 hover:bg-red-600/20"
        onClick={() => onOpenChange(true)}
        disabled={isBusy}
      >
        Delete "{config.name}"
      </Button>
      <AlertDialogContent className="bg-zinc-900 border-zinc-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Delete Preemption Zone?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            This will permanently delete{" "}
            <span className="text-white font-medium">{config.name}</span>.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
