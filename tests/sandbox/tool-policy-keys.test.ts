import {
  expandToolPolicyCandidateKeys,
  findPermissionRowByNormalizedKey,
  normalizeSkillToolLogicalName,
  normalizeToolPolicyKey,
  parseSkillDotToolId,
  resolveSkillToolHubName,
  skillToolHubKey,
  isPathContainedInRoot,
  pathMatchesBlockedPrefix,
} from '../../src/sandbox/tool-policy-keys';

describe('tool-policy-keys', () => {
  describe('normalizeToolPolicyKey', () => {
    it('NFKC trims and lowercases', () => {
      expect(normalizeToolPolicyKey('  Skill:Foo:Bar  ')).toBe('skill:foo:bar');
    });
  });

  describe('normalizeSkillToolLogicalName', () => {
    it('returns trimmed input when not skill: prefix', () => {
      expect(normalizeSkillToolLogicalName('  fs_read  ')).toBe('fs_read');
    });

    it('strips nested skill: segments when well-formed', () => {
      expect(normalizeSkillToolLogicalName('skill:pkg:skill:inner:tool')).toBe('tool');
    });

    it('returns original when skill: but not enough segments to normalize', () => {
      expect(normalizeSkillToolLogicalName('Skill:')).toBe('Skill:');
    });
  });


  describe('resolveSkillToolHubName', () => {
    it('normalizes nested skill logical segment', () => {
      expect(resolveSkillToolHubName('skill:pkg:skill:inner:tool')).toBe('skill:pkg:tool');
    });

    it('leaves non skill: ids unchanged', () => {
      expect(resolveSkillToolHubName('fs_read')).toBe('fs_read');
    });
  });

  describe('skillToolHubKey', () => {
    it('builds canonical key', () => {
      expect(skillToolHubKey('MySkill', 'doThing')).toBe('skill:MySkill:doThing');
    });
  });

  describe('parseSkillDotToolId', () => {
    it('parses segment and logical', () => {
      expect(parseSkillDotToolId('skill.my.pkg.run')).toEqual({
        segment: 'my.pkg',
        logical: 'run',
      });
    });

    it('returns null for invalid', () => {
      expect(parseSkillDotToolId('skill.only')).toBeNull();
      expect(parseSkillDotToolId('fs_read')).toBeNull();
    });
  });

  describe('expandToolPolicyCandidateKeys', () => {
    it('dedupes and adds hub key from skill dot form', () => {
      const keys = expandToolPolicyCandidateKeys('skill.a.b', ['skill.a.b']);
      expect(keys).toContain('skill.a.b');
      expect(keys).toContain('skill:a:b');
    });

    it('normalizes skill: form', () => {
      const keys = expandToolPolicyCandidateKeys('skill:x:skill:y:z', []);
      expect(keys).toContain('skill:x:z');
    });
  });

  describe('findPermissionRowByNormalizedKey', () => {
    it('finds row by normalized match', () => {
      const row = findPermissionRowByNormalizedKey(
        [{ toolName: 'skill:Foo:Bar', policy: 'ALLOW' }],
        'SKILL:foo:bar',
      );
      expect(row?.policy).toBe('ALLOW');
    });
  });

  describe('isPathContainedInRoot', () => {
    it('allows same root and children', () => {
      expect(isPathContainedInRoot('/proj/src/a.ts', '/proj')).toBe(true);
      expect(isPathContainedInRoot('/proj', '/proj')).toBe(true);
    });

    it('rejects escape via ..', () => {
      expect(isPathContainedInRoot('/other', '/proj')).toBe(false);
    });
  });

  describe('pathMatchesBlockedPrefix', () => {
    it('detects blocked prefix', () => {
      expect(pathMatchesBlockedPrefix('/etc/passwd', ['/etc'])).toBe('/etc');
    });

    it('returns undefined when clear', () => {
      expect(pathMatchesBlockedPrefix('/home/u/x', ['/etc'])).toBeUndefined();
    });
  });
});
