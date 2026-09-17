/*
 * The framework registry (SPEC §6.2). Normative for every framework listed; a new framework
 * is added by the same process as any other change to the specification.
 */

/** What a framework is: a standards document, a program classification, an exam outline, a credit recommendation, a credential format (SPEC §6.2, 0.2.0). */
export const FRAMEWORK_KINDS = [
  'standards',
  'program_classification',
  'exam_outline',
  'credit_recommendation',
  'credential_format',
] as const;
export type FrameworkKind = (typeof FRAMEWORK_KINDS)[number];

export interface Framework {
  /** A stable short key, added to alignments by the artifact builder. */
  id: string;
  /** The framework's full published name, exactly as `alignment.framework` must write it. */
  name: string;
  authority: string;
  kind?: FrameworkKind;
}

export const FRAMEWORKS: readonly Framework[] = [
  {
    id: 'nys-nextgen-math',
    name: 'NYS Next Generation Mathematics Learning Standards',
    authority: 'New York State Education Department',
  },
  {
    id: 'ccss-math',
    name: 'Common Core State Standards for Mathematics',
    authority: 'CCSSO / NGA',
  },
  { id: 'ngss', name: 'Next Generation Science Standards', authority: 'Achieve, Inc.' },
  { id: 'ob3', name: 'Open Badges 3.0', authority: '1EdTech' },
] as const;

/** The registry row whose name matches exactly, including case (V-22). */
export function frameworkByName(name: string): Framework | undefined {
  return FRAMEWORKS.find((f) => f.name === name);
}

/** The registry row whose name matches ignoring case and surrounding whitespace. */
export function frameworkByNameLoosely(name: string): Framework | undefined {
  const needle = name.trim().toLowerCase();
  return FRAMEWORKS.find((f) => f.name.toLowerCase() === needle);
}

export function frameworkById(id: string): Framework | undefined {
  return FRAMEWORKS.find((f) => f.id === id);
}
