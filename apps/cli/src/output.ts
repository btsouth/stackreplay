/**
 * Terminal output.
 *
 * Plain text by default. Color is added only when stdout is a terminal and
 * NO_COLOR is unset, so piped and redirected output stays clean. `--json`
 * always prints one machine-readable object and nothing else.
 */

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  /** Whether stdout is a terminal; defaults to false (plain output). */
  isTty?: boolean;
}

export interface RenderOptions {
  json: boolean;
  color: boolean;
}

export function resolveRenderOptions(
  io: CliIo,
  flags: { json: boolean; noColor: boolean },
): RenderOptions {
  const color = !flags.noColor && io.isTty === true && process.env.NO_COLOR === undefined;
  return { json: flags.json, color };
}

export class Renderer {
  private readonly io: CliIo;
  private readonly options: RenderOptions;
  private readonly lines: string[] = [];

  constructor(io: CliIo, options: RenderOptions) {
    this.io = io;
    this.options = options;
  }

  get json(): boolean {
    return this.options.json;
  }

  heading(text: string): this {
    this.push(this.options.color ? `\u001b[1m${text}\u001b[22m` : text);
    return this;
  }

  line(text = ""): this {
    this.push(text);
    return this;
  }

  /** Aligned "label: value" line, with the value left-aligned in a column. */
  field(label: string, value: string): this {
    const width = Math.max(22, label.length + 2);
    this.push(`${label.padEnd(width, " ")}${value}`);
    return this;
  }

  bullet(text: string): this {
    this.push(`  - ${text}`);
    return this;
  }

  /** Emits a machine-readable object; human rendering is suppressed. */
  jsonOutput(value: unknown): void {
    this.io.stdout(JSON.stringify(value, null, 2));
  }

  /** Flushes accumulated human-readable lines. */
  flush(): void {
    if (this.options.json) return;
    if (this.lines.length === 0) return;
    this.io.stdout(this.lines.join("\n"));
  }

  error(text: string): void {
    this.io.stderr(text);
  }

  private push(text: string): void {
    this.lines.push(text);
  }
}

/** Formats a count with thousands separators, without locale dependence. */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}
