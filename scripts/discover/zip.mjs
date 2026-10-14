/**
 * Minimal, read-only ZIP reader for GitHub repository archives, entirely in memory.
 * Nothing is ever written to disk or executed: entries are listed, and text entries are
 * inflated only when asked for. Archives are untrusted input, so every size is checked.
 */
import { inflateRawSync } from "node:zlib";

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

/** @returns {{ comment: string, entries: { path: string, mode: string, size: number, read: (max: number) => Buffer | null }[] }} */
export function readZip(buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--) {
    if (buffer.readUInt32LE(i) === EOCD) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("Not a ZIP archive.");
  const count = buffer.readUInt16LE(end + 10);
  const dirOffset = buffer.readUInt32LE(end + 16);
  const commentLength = buffer.readUInt16LE(end + 20);
  const comment = buffer.subarray(end + 22, end + 22 + commentLength).toString("utf8");
  if (dirOffset === 0xffffffff) throw new Error("ZIP64 archives are not supported.");

  const entries = [];
  let at = dirOffset;
  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(at) !== CENTRAL) throw new Error("Corrupt central directory.");
    const method = buffer.readUInt16LE(at + 10);
    const compressed = buffer.readUInt32LE(at + 20);
    const size = buffer.readUInt32LE(at + 24);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLen = buffer.readUInt16LE(at + 32);
    const external = buffer.readUInt32LE(at + 38);
    const localOffset = buffer.readUInt32LE(at + 42);
    const name = buffer.subarray(at + 46, at + 46 + nameLength).toString("utf8");
    at += 46 + nameLength + extraLength + commentLen;
    if (name.endsWith("/")) continue;

    const unixMode = (external >>> 16) & 0xffff;
    const mode = (unixMode & 0o170000) === 0o120000 ? "120000" : unixMode & 0o111 ? "100755" : "100644";
    entries.push({
      path: name,
      mode,
      size,
      read(max) {
        if (size > max || compressed > max) return null;
        if (buffer.readUInt32LE(localOffset) !== LOCAL) return null;
        const start = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
        const data = buffer.subarray(start, start + compressed);
        if (method === 0) return Buffer.from(data);
        if (method === 8) return inflateRawSync(data, { maxOutputLength: max });
        return null;
      },
    });
  }
  return { comment, entries };
}
