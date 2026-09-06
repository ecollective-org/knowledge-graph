import { ulid } from 'ulid';
import { z } from 'zod';

/** The six entity types of the eCollective Knowledge Graph (SPEC §3, EKG-SPEC-15). */
export const EKG_TYPES = ['domain', 'outcome', 'course', 'assessment', 'credential', 'resource'] as const;
export type EkgType = (typeof EKG_TYPES)[number];

/**
 * Crockford base-32, uppercase, 26 characters. The alphabet deliberately excludes
 * I, L, O and U (EKG-SPEC-15).
 */
export const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** `ekg:<type>:<ULID>` for any of the six types (V-09). */
export const EKG_ID_PATTERN = new RegExp(`^ekg:(${EKG_TYPES.join('|')}):[0-9A-HJKMNP-TV-Z]{26}$`);

/** A stable, global, immutable identifier (SPEC §4.1). */
export type EkgId<T extends EkgType = EkgType> = `ekg:${T}:${string}`;

export function isEkgType(value: unknown): value is EkgType {
  return typeof value === 'string' && (EKG_TYPES as readonly string[]).includes(value);
}

export function isEkgId(value: unknown): value is EkgId {
  return typeof value === 'string' && EKG_ID_PATTERN.test(value);
}

export function isEkgIdOf<T extends EkgType>(type: T, value: unknown): value is EkgId<T> {
  return isEkgId(value) && value.startsWith(`ekg:${type}:`);
}

/** Zod schema for an `ekgId` of one specific type. */
export const ekgId = <T extends EkgType>(type: T) =>
  z
    .string()
    .regex(new RegExp(`^ekg:${type}:[0-9A-HJKMNP-TV-Z]{26}$`), `Expected ekg:${type}:<ULID> (V-09)`);

/** Zod schema for an `ekgId` of any type. */
export const anyEkgId = z.string().regex(EKG_ID_PATTERN, 'Expected ekg:<type>:<ULID> (V-09)');

/**
 * Mint a new identifier. Minted exactly once, at node creation, by whichever product
 * creates the node; never reused and never changed afterwards (EKG-SPEC-16).
 *
 * `seedTime` (milliseconds since the epoch) is only for deterministic tests.
 */
export function mintEkgId<T extends EkgType>(type: T, seedTime?: number): EkgId<T> {
  if (!isEkgType(type)) throw new Error(`Unknown EKG type: ${String(type)}`);
  return `ekg:${type}:${ulid(seedTime)}`;
}

/** Split an `ekgId` into its type and ULID. Throws on anything that is not an `ekgId`. */
export function parseEkgId(id: string): { type: EkgType; ulid: string } {
  const match = EKG_ID_PATTERN.exec(id);
  if (!match) throw new Error(`Not an ekgId: ${id}`);
  return { type: match[1] as EkgType, ulid: id.slice(id.lastIndexOf(':') + 1) };
}
