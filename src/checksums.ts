import type { Checksums } from './artifact.js';

/*
 * Integrity helpers for the artifact (EKG-SPEC-50, V-24). Uses the Web Crypto API, which
 * Node 20+, browsers, and Lambda all provide as `globalThis.crypto`, so this module has no
 * Node-only import and is safe to bundle for any runtime that never calls it.
 */

const encoder = new TextEncoder();

/** Lowercase hex SHA-256 of a string or byte array. */
export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto is not available in this runtime');
  const digest = await subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ChecksumMismatch {
  path: string;
  expected: { sha256: string; bytes: number } | undefined;
  actual: { sha256: string; bytes: number };
}

/**
 * Compare fetched files against `checksums.json`. A consumer MUST abort the import on any
 * mismatch (EKG-SPEC-50); a path missing from the checksums is reported as a mismatch too.
 */
export async function verifyChecksums(
  files: ReadonlyMap<string, Uint8Array | string> | Record<string, Uint8Array | string>,
  expected: Checksums,
): Promise<{ ok: boolean; mismatches: ChecksumMismatch[] }> {
  const entries = files instanceof Map ? [...files.entries()] : Object.entries(files);
  const mismatches: ChecksumMismatch[] = [];
  for (const [path, content] of entries) {
    const bytes = typeof content === 'string' ? encoder.encode(content) : content;
    const actual = { sha256: await sha256Hex(bytes), bytes: bytes.byteLength };
    const want = expected[path];
    if (!want || want.sha256 !== actual.sha256 || want.bytes !== actual.bytes) {
      mismatches.push({ path, expected: want, actual });
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}
