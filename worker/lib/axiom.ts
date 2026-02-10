import type { LogEvent } from "./logger.js";

export async function ingestToAxiom(
  events: LogEvent[],
  dataset: string,
  token: string,
): Promise<void> {
  if (events.length === 0) return;

  try {
    const res = await fetch(
      `https://api.axiom.co/v1/datasets/${encodeURIComponent(dataset)}/ingest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(events),
      },
    );
    if (!res.ok) {
      console.error(`Axiom ingest failed: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.error("Axiom ingest error:", e);
  }
}
