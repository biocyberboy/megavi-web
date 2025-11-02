"use client";

import { useEffect, useState } from "react";

import PasscodeGate from "./passcode";

const STORAGE_KEY = "megavi-admin-pass";

export default function ClientGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === "ok") {
        setGranted(true);
      }
    } catch (error) {
      setGranted(false);
    }
  }, []);

  if (!granted) {
    return <PasscodeGate onSuccess={() => setGranted(true)} />;
  }

  return <>{children}</>;
}
