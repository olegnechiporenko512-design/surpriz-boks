import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

export function Boot() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
