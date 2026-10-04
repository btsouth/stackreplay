"use client";
import { useEffect, useRef, useState } from "react";
import type { BenchmarkExport } from "@/lib/benchmark-export";
import type { BenchmarkImagePage } from "@/lib/benchmark-image-layout";

export function BenchmarkImageDialog({
  payload,
  onClose,
}: {
  payload: BenchmarkExport;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closed = useRef(false);
  function finishClose() {
    if (closed.current || dialog.current?.open) return;
    closed.current = true;
    onClose();
  }
  function close() {
    dialog.current?.close();
    finishClose();
  }
  const [prepared, setPrepared] = useState<{
    payload: BenchmarkExport;
    pages: BenchmarkImagePage[];
    attempt: number;
  } | null>(null);
  const [prepareAttempt, setPrepareAttempt] = useState(0);
  const pages =
    prepared?.payload === payload && prepared.attempt === prepareAttempt ? prepared.pages : [];
  const [pageIndex, setPageIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  function changePage(offset: number) {
    setPageIndex((index) => index + offset);
    // Back-navigation reuses page objects, but their previous URLs were revoked.
    // Invalidate the retained result in the same update as every navigation.
    setAttempt((value) => value + 1);
  }
  const [error, setError] = useState("");
  const [image, setImage] = useState<{
    url: string;
    page: BenchmarkImagePage;
    attempt: number;
  } | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    let cancelled = false;
    setPrepared(null);
    setPageIndex(0);
    setError("");
    import("@/lib/benchmark-image-renderer")
      .then((renderer) => renderer.prepareBenchmarkImages(payload))
      .then((result) => {
        if (!cancelled) setPrepared({ payload, pages: result, attempt: prepareAttempt });
      })
      .catch((reason) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : "Could not prepare images.");
      });
    return () => {
      cancelled = true;
    };
  }, [payload, prepareAttempt]);
  const page = pages[pageIndex];
  useEffect(() => {
    if (!page) return;
    let cancelled = false;
    let url: string | undefined;
    setError("");
    import("@/lib/benchmark-image-renderer")
      .then((renderer) => renderer.renderBenchmarkImage(page))
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImage({ url, page, attempt });
      })
      .catch((reason) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : "Could not create this PNG.");
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [page, attempt]);
  const ready = image?.page === page && image?.attempt === attempt && !error;
  const scope = page
    ? `Models ${page.modelStart + 1}–${page.modelStart + page.models.length} of ${payload.models.length} · Rows ${page.rows.length ? `${page.rowStart + 1}–${page.rowStart + page.rows.length}` : "0"} of ${payload.rows.length}`
    : error
      ? "Image preparation failed"
      : "Preparing pages…";
  return (
    <dialog
      ref={dialog}
      className="bench-dialog bench-image-dialog"
      aria-labelledby="benchmark-image-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={finishClose}
    >
      <button type="button" className="bench-dialog-close" onClick={close}>
        Close
      </button>
      <h2 id="benchmark-image-title">Export benchmark images</h2>
      <p>Readable pages with exact scores and sources. Images use a light background.</p>
      <nav className="bench-image-controls" aria-label="Image pages">
        <button
          type="button"
          className="bench-image-control"
          disabled={!pages.length || pageIndex === 0}
          onClick={() => changePage(-1)}
        >
          Previous page
        </button>
        <p className="bench-image-page-count" role="status" aria-live="polite">
          {pages.length
            ? `Page ${pageIndex + 1} of ${pages.length}`
            : error
              ? "Preparation failed"
              : "Preparing pages…"}
        </p>
        <button
          type="button"
          className="bench-image-control"
          disabled={!pages.length || pageIndex === pages.length - 1}
          onClick={() => changePage(1)}
        >
          Next page
        </button>
        {ready && image ? (
          <a
            className="bench-image-control"
            href={image.url}
            download={`stackreplay-benchmarks-${payload.edition}-page-${pageIndex + 1}-of-${pages.length}.png`}
          >
            Download PNG · Page {pageIndex + 1}
          </a>
        ) : (
          <button type="button" className="bench-image-control" disabled>
            Download PNG · {error ? "Unavailable" : "Preparing…"}
          </button>
        )}
      </nav>
      <p className="bench-source-label">{scope}</p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="bench-text-button"
            onClick={() =>
              page ? setAttempt((value) => value + 1) : setPrepareAttempt((value) => value + 1)
            }
          >
            Try again
          </button>
        </div>
      ) : (
        !ready && <p role="status">Rendering page…</p>
      )}
      <div className="bench-image-preview" aria-busy={!ready && !error}>
        {ready && image && (
          // This local PNG is the export itself; Next Image optimization would require uploading it.
          // biome-ignore lint/performance/noImgElement: locally generated blob preview
          <img
            src={image.url}
            width={image.page.width}
            height={image.page.height}
            alt={`Benchmark evidence, page ${pageIndex + 1} of ${pages.length}. ${scope}. ${page?.models.map((model) => model.name).join(", ")}. Exact text follows below.`}
          />
        )}
      </div>
      {page && (
        <details className="bench-image-text">
          <summary>Read page text</summary>
          {page.texts.map((block) => (
            <p className="bench-image-paragraph" key={`${block.x}-${block.y}`}>
              {block.text}
            </p>
          ))}
        </details>
      )}
      <p className="bench-image-footer">
        <a className="bench-image-link" href={payload.comparisonUrl}>
          Exact comparison and full evidence
        </a>{" "}
        · Download JSON from the comparison for all provenance.
      </p>
    </dialog>
  );
}
