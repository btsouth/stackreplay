import type { Metadata } from "next";
import { ImportSurface } from "@/components/import/import-surface";

export const metadata: Metadata = {
  title: "Scan your history",
  description:
    "Load supported AI history files, a folder, ZIP archive, or a StackReplay export in your browser.",
};

export default function ScanPage() {
  return (
    <div className="app-scan">
      <div className="page-command">
        <div className="path">
          <b>›</b> LOCAL SCAN
        </div>
        <h1>Scan your history</h1>
        <p>
          Drag your home folder below, or choose a tool folder. Your logs never leave this browser.
        </p>
      </div>
      <ImportSurface initialImports={[]} />
    </div>
  );
}
