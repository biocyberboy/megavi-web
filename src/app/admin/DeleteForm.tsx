"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import DeleteButton from "./DeleteButton";
import { useToast } from "./Toast";

type ActionState = {
  success: boolean;
  message: string;
};

type DeleteFormProps = {
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  confirmMessage: string;
  itemName?: string;
  children: React.ReactNode;
};

const initialState = { success: false, message: "" };

export default function DeleteForm({ action, confirmMessage, itemName, children }: DeleteFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const prevStateRef = useRef(state);

  useEffect(() => {
    // Only show toast if state actually changed (not on initial render)
    if (state.message && state !== prevStateRef.current) {
      showToast(state.message, state.success ? "success" : "error");
      
      // Reset form if successful
      if (state.success && formRef.current) {
        formRef.current.reset();
      }
    }
    prevStateRef.current = state;
  }, [state, showToast]);

  return (
    <form ref={formRef} action={formAction}>
      {children}
      <DeleteButton confirmMessage={confirmMessage} itemName={itemName} />
    </form>
  );
}
