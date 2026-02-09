export interface DiffSegment {
  type: "equal" | "added" | "removed";
  text: string;
}

/**
 * Word-level diff using a simple LCS algorithm.
 * Splits on word boundaries and produces segments.
 */
export function wordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = tokenize(oldText);
  const newWords = tokenize(newText);

  // Build LCS table
  const m = oldWords.length;
  const n = newWords.length;

  // Use 1D rolling array for space efficiency
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);

  // First pass: compute LCS lengths
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const segments: DiffSegment[] = [];
  let i = m;
  let j = n;

  const stack: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      stack.push({ type: "equal", text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "added", text: newWords[j - 1] });
      j--;
    } else {
      stack.push({ type: "removed", text: oldWords[i - 1] });
      i--;
    }
  }

  stack.reverse();

  // Merge consecutive segments of the same type
  for (const seg of stack) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}

/** Split text into words preserving whitespace as separate tokens */
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}
