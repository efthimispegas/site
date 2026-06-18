import {
  clientProductProjects,
  conceptLabStudies,
  findPegasoftWorkBySlug,
  hasPublishableClientProjects,
} from './pegasoft-content';
import { individualProfile } from './individual-content';

describe('Pegasoft content taxonomy', () => {
  it('keeps speculative work explicitly labeled as Concept Lab', () => {
    expect(
      conceptLabStudies.every((study) => study.label === 'Concept Lab'),
    ).toBe(true);
  });

  it('does not publish client projects without approval', () => {
    expect(hasPublishableClientProjects()).toBe(false);
    expect(
      clientProductProjects.every(
        (project) => project.permissionStatus === 'approved',
      ),
    ).toBe(true);
  });

  it('finds Pegasoft work by slug across the public work taxonomy', () => {
    expect(findPegasoftWorkBySlug('helios-ledger')?.kind).toBe('concept');
  });
});

describe('individual profile scaffold', () => {
  it('discloses that the persona is provisional', () => {
    expect(individualProfile.disclosure.toLowerCase()).toContain('invented');
  });
});
