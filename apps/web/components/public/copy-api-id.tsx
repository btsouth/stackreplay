"use client";
import { Button } from "@stackreplay/ui";
import { useId, useState } from "react";

/** An exact provider API model id with a copy control. */
export function CopyApiId({ value }: { value: string }) {
  const id = useId();
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied");
    } catch {
      setStatus("Copy failed; select the id and copy it by hand.");
    }
  }
  return (
    <div className="market-api-id">
      <code id={id} className="break-all">
        {value}
      </code>
      <Button
        variant="outline"
        size="sm"
        aria-label="Copy API model id"
        aria-describedby={id}
        data-testid="copy-api-id"
        onClick={() => void copy()}
      >
        Copy
      </Button>
      <span role="status" className="market-muted" data-testid="copy-api-id-status">
        {status}
      </span>
    </div>
  );
}
