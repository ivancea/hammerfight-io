export function joinUrl(...segments: string[]) {
  return segments.join("/").replace(/\/+/g, "/");
}
