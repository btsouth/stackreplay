/**
 * Native rollout headers precede tool output, which can be megabytes of text.
 * Only these record kinds need no fields beyond timestamp and payload.type.
 * Unfamiliar ordering, escaped header strings, messages and accounting records
 * fall back to JSON.parse. A torn final line must also go through that parser.
 */
const HEAD =
  /^\{"timestamp":"([^"\\]*)",(?:"ordinal":\d+,)?"type":"(response_item|event_msg)","payload":\{"type":"([^"\\]+)"[,}]/u;

export function codexRecordHead(
  line: string,
): { timestamp: string; type: string; payload: { type: string } } | undefined {
  if (line.length <= 4096 || !line.endsWith("}}")) return undefined;
  const head = HEAD.exec(line);
  if (!head) return undefined;
  const type = head[2] as string;
  const payloadType = head[3] as string;
  if (payloadType === "message" || (type === "event_msg" && payloadType === "token_count"))
    return undefined;
  return { timestamp: head[1] as string, type, payload: { type: payloadType } };
}
