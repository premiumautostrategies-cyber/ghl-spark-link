/**
 * Lane layout for overlapping time spans.
 *
 * Any calendar or bay row that can hold two vehicles at the same time needs
 * side-by-side lanes so the blocks never render on top of each other.
 * Returns, per id, which lane the span sits in and how many lanes its
 * overlapping cluster needs.
 */
export type TimeSpan = { id: string; start: number; end: number };

export type Lane = { lane: number; lanes: number };

export function laneLayout(spans: TimeSpan[]): Map<string, Lane> {
  const out = new Map<string, Lane>();
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);

  let cluster: TimeSpan[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const assigned: Array<{ id: string; lane: number }> = [];
    for (const s of cluster) {
      let lane = laneEnds.findIndex((end) => end <= s.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(s.end);
      } else {
        laneEnds[lane] = s.end;
      }
      assigned.push({ id: s.id, lane });
    }
    for (const a of assigned) out.set(a.id, { lane: a.lane, lanes: laneEnds.length });
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const s of sorted) {
    if (cluster.length > 0 && s.start >= clusterEnd) flush();
    cluster.push(s);
    clusterEnd = Math.max(clusterEnd, s.end);
  }
  flush();

  return out;
}

/** Minutes since midnight for a timestamp, used as the span scale. */
export function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}
