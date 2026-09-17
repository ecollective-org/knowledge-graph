import { describe, expect, it } from 'vitest';

import {
  FRAMEWORKS,
  FRAMEWORK_KINDS,
  STATE_FRAMEWORK_ID_PATTERN,
  frameworkById,
  frameworkByName,
  isStateFrameworkId,
} from '../src/index.js';

describe('framework registry (SPEC §6.2)', () => {
  it('carries a kind, a jurisdiction and a subject on every row', () => {
    for (const f of FRAMEWORKS) {
      expect(FRAMEWORK_KINDS).toContain(f.kind);
      expect(f.jurisdiction).toBeTruthy();
      expect(f.subject).toBeTruthy();
      expect(f.url).toMatch(/^https:\/\//);
    }
    expect(frameworkById('nys-nextgen-math')?.kind).toBe('standards');
    expect(frameworkById('ob3')?.kind).toBe('credential_format');
  });

  it('registers the exam outlines, the credit recommendations and the program classification (0.2.0)', () => {
    expect(frameworkById('cip-2020')?.kind).toBe('program_classification');
    expect(frameworkById('ap')?.kind).toBe('exam_outline');
    expect(frameworkById('clep')?.kind).toBe('exam_outline');
    expect(frameworkById('dsst')?.kind).toBe('exam_outline');
    expect(frameworkById('ace-credit')?.kind).toBe('credit_recommendation');
    expect(frameworkByName('College-Level Examination Program')?.id).toBe('clep');
    expect(frameworkByName('Classification of Instructional Programs, 2020')?.id).toBe('cip-2020');
    expect(new Set(FRAMEWORKS.map((f) => f.id)).size).toBe(FRAMEWORKS.length);
    expect(new Set(FRAMEWORKS.map((f) => f.name)).size).toBe(FRAMEWORKS.length);
  });

  it('names the state framework id convention <iso-region>-<subject>-<year> (EKG-SPEC-140)', () => {
    expect(isStateFrameworkId('us-ny-science-2016')).toBe(true);
    expect(isStateFrameworkId('us-tx-social-studies-2022')).toBe(true);
    expect(isStateFrameworkId('nys-nextgen-math')).toBe(false); // grandfathered, not the convention
    expect(isStateFrameworkId('US-NY-science-2016')).toBe(false);
    expect(STATE_FRAMEWORK_ID_PATTERN.test('us-ny-science')).toBe(false);
  });
});
