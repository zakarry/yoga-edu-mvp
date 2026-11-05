/** Instruction lead-ins consume media time while the practice countdown stays still. */
export function practiceElapsedSeconds(segments: readonly {
  start: number; seconds: number; narrationSec: number;
}[], mediaSeconds: number): number {
  return segments.reduce((elapsed, segment) => elapsed + Math.min(
    segment.seconds - segment.narrationSec,
    Math.max(0, mediaSeconds - segment.start - segment.narrationSec),
  ), 0);
}
