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
  kind: FrameworkKind;
  /** An ISO 3166 country or ISO 3166-2 region code, or `international`. */
  jurisdiction?: string;
  /** `mathematics`, `science`, … or `all`. */
  subject?: string;
  url?: string;
}

/**
 * A state framework's id: `<iso-region>-<subject>-<year>`, lowercased (EKG-SPEC-140), for
 * example `us-ny-science-2016`. `nys-nextgen-math` predates the convention and is kept.
 */
export const STATE_FRAMEWORK_ID_PATTERN = /^[a-z]{2}-[a-z0-9]{1,3}-[a-z0-9]+(-[a-z0-9]+)*-\d{4}$/;

export function isStateFrameworkId(id: string): boolean {
  return STATE_FRAMEWORK_ID_PATTERN.test(id);
}

export const FRAMEWORKS: readonly Framework[] = [
  {
    id: 'nys-nextgen-math',
    name: 'NYS Next Generation Mathematics Learning Standards',
    authority: 'New York State Education Department',
    kind: 'standards',
    jurisdiction: 'US-NY',
    subject: 'mathematics',
    url: 'https://www.nysed.gov/standards-instruction/mathematics',
  },
  {
    id: 'ccss-math',
    name: 'Common Core State Standards for Mathematics',
    authority: 'CCSSO / NGA',
    kind: 'standards',
    jurisdiction: 'US',
    subject: 'mathematics',
    url: 'https://www.thecorestandards.org/Math/',
  },
  {
    id: 'ngss',
    name: 'Next Generation Science Standards',
    authority: 'Achieve, Inc.',
    kind: 'standards',
    jurisdiction: 'US',
    subject: 'science',
    url: 'https://www.nextgenscience.org/',
  },
  {
    id: 'ob3',
    name: 'Open Badges 3.0',
    authority: '1EdTech',
    kind: 'credential_format',
    jurisdiction: 'international',
    subject: 'all',
    url: 'https://www.imsglobal.org/spec/ob/v3p0',
  },
  {
    id: 'cip-2020',
    name: 'Classification of Instructional Programs, 2020',
    authority: 'National Center for Education Statistics',
    kind: 'program_classification',
    jurisdiction: 'US',
    subject: 'all',
    url: 'https://nces.ed.gov/ipeds/cipcode/',
  },
  {
    id: 'ap',
    name: 'Advanced Placement Course and Exam Descriptions',
    authority: 'College Board',
    kind: 'exam_outline',
    jurisdiction: 'US',
    subject: 'all',
    url: 'https://apcentral.collegeboard.org/',
  },
  {
    id: 'clep',
    name: 'College-Level Examination Program',
    authority: 'College Board',
    kind: 'exam_outline',
    jurisdiction: 'US',
    subject: 'all',
    url: 'https://clep.collegeboard.org/',
  },
  {
    id: 'dsst',
    name: 'DSST Exams',
    authority: 'Prometric',
    kind: 'exam_outline',
    jurisdiction: 'US',
    subject: 'all',
    url: 'https://getcollegecredit.com/',
  },
  {
    id: 'ace-credit',
    name: 'ACE CREDIT Recommendations',
    authority: 'American Council on Education',
    kind: 'credit_recommendation',
    jurisdiction: 'US',
    subject: 'all',
    url: 'https://www.acenet.edu/',
  },
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
