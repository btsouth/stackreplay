import { emptyState, validateState } from "./state.mjs";

const STATE_BRANCH = "watcher-state";
export function createGitHub({ token, repository, fetchImpl = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Invalid repository");
  const base = `https://api.github.com/repos/${repository}`;
  async function api(path, { method = "GET", body, missing = false } = {}) {
    const response = await fetchImpl(`${base}${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (missing && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  }
  async function pages(path) {
    const rows = [];
    for (let page = 1; page <= 100; page++) {
      const part = await api(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
      rows.push(...part);
      if (part.length < 100) return rows;
    }
    throw new Error("GitHub pagination budget exceeded");
  }
  let parent = null;
  let previousSerialized = null;
  async function readState({ reset = false } = {}) {
    const ref = await api(`/git/ref/heads/${STATE_BRANCH}`, { missing: true });
    if (!ref) return emptyState();
    parent = ref.object.sha;
    const commit = await api(`/git/commits/${parent}`);
    const tree = await api(`/git/trees/${commit.tree.sha}`);
    if (
      tree.truncated ||
      tree.tree.some((entry) => entry.path !== "state.json" || entry.type !== "blob")
    )
      throw new Error("State branch contains unexpected files; refusing mutation");
    const file = tree.tree.find((entry) => entry.path === "state.json");
    if (!file) throw new Error("State branch missing state.json");
    if (reset) return emptyState();
    const blob = await api(`/git/blobs/${file.sha}`);
    if (blob.encoding !== "base64" || blob.size > 30 * 1024 * 1024)
      throw new Error("State blob unsupported/oversized");
    previousSerialized = Buffer.from(blob.content, "base64").toString("utf8");
    return validateState(JSON.parse(previousSerialized));
  }
  async function saveState(state) {
    const serialized = `${JSON.stringify(state, null, 2)}\n`;
    if (serialized === previousSerialized) return false;
    if (Buffer.byteLength(serialized) > 30 * 1024 * 1024)
      throw new Error("Watcher state exceeds 30 MiB budget");
    const blob = await api("/git/blobs", {
      method: "POST",
      body: { content: serialized, encoding: "utf-8" },
    });
    const tree = await api("/git/trees", {
      method: "POST",
      body: { tree: [{ path: "state.json", mode: "100644", type: "blob", sha: blob.sha }] },
    });
    const commit = await api("/git/commits", {
      method: "POST",
      body: {
        message: "Update catalog watcher state",
        tree: tree.sha,
        parents: parent ? [parent] : [],
      },
    });
    if (parent)
      await api(`/git/refs/heads/${STATE_BRANCH}`, {
        method: "PATCH",
        body: { sha: commit.sha, force: false },
      });
    else
      await api("/git/refs", {
        method: "POST",
        body: { ref: `refs/heads/${STATE_BRANCH}`, sha: commit.sha },
      });
    parent = commit.sha;
    previousSerialized = serialized;
    return true;
  }
  let issues;
  const machineOwned = (issue) =>
    issue.user?.login === "github-actions[bot]" && !issue.pull_request;
  async function syncIssue(intent) {
    issues ??= (await pages("/issues?state=all&sort=created&direction=desc")).filter(machineOwned);
    const matches = issues.filter((issue) => issue.body?.includes(intent.marker));
    for (const issue of matches) {
      Object.assign(issue, await api(`/issues/${issue.number}`));
    }
    const open = matches.find((issue) => issue.state === "open");
    const eventMarker = `<!-- stackreplay-watcher:event:${intent.eventId} -->`;
    if (intent.kind === "source" || intent.kind === "source-digest") {
      // A closed issue for this exact episode means it has already been reviewed.
      if (matches.some((issue) => issue.body?.includes(eventMarker))) return "unchanged";
      for (const issue of matches) {
        const comments = await pages(`/issues/${issue.number}/comments`);
        if (
          comments.some(
            (c) => c.user?.login === "github-actions[bot]" && c.body?.includes(eventMarker),
          )
        )
          return "unchanged";
      }
      if (open) {
        await api(`/issues/${open.number}/comments`, {
          method: "POST",
          body: { body: intent.body },
        });
        return "commented";
      }
      if (intent.kind === "source-digest" && matches.length) {
        if (!intent.allowCreate) return "no open issue";
        const issue = matches[0];
        const updated = await api(`/issues/${issue.number}`, {
          method: "PATCH",
          body: {
            title: intent.title,
            body: intent.body,
            state: "open",
            ...(intent.labels?.length ? { labels: intent.labels } : {}),
          },
        });
        Object.assign(issue, updated);
        return "updated";
      }
    } else if (matches.length) {
      const issue = open ?? matches[0];
      if (issue.body === intent.body && issue.title === intent.title) return "unchanged";
      const updated = await api(`/issues/${issue.number}`, {
        method: "PATCH",
        body: {
          title: intent.title,
          body: intent.body,
          state: "open",
          ...(intent.labels?.length ? { labels: intent.labels } : {}),
        },
      });
      Object.assign(issue, updated);
      return "updated";
    }
    if (!intent.allowCreate) return "no open issue";
    const created = await api("/issues", {
      method: "POST",
      body: {
        title: intent.title,
        body: intent.body,
        ...(intent.labels?.length ? { labels: intent.labels } : {}),
      },
    });
    issues.unshift(created);
    return "created";
  }
  return { readState, saveState, syncIssue };
}
