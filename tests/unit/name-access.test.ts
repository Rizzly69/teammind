import { describe, it, expect } from 'vitest';
import {
  isAuthorizedName,
  getAuthorizedMemberByName,
  AUTHORIZED_MEMBERS,
} from '@/lib/auth/authorized-members';

describe('Name-Based Access Verification (Dana, Shivansh, Lial, Niya)', () => {
  it('Allows exact authorized team member names', () => {
    expect(isAuthorizedName('dana')).toBe(true);
    expect(isAuthorizedName('shivansh')).toBe(true);
    expect(isAuthorizedName('lial')).toBe(true);
    expect(isAuthorizedName('niya')).toBe(true);
  });

  it('Is case-insensitive and trims whitespace properly', () => {
    expect(isAuthorizedName('  Dana  ')).toBe(true);
    expect(isAuthorizedName('SHIVANSH')).toBe(true);
    expect(isAuthorizedName('Lial')).toBe(true);
    expect(isAuthorizedName('  NiYa ')).toBe(true);
  });

  it('Strictly denies unauthorized names', () => {
    expect(isAuthorizedName('alice')).toBe(false);
    expect(isAuthorizedName('bob')).toBe(false);
    expect(isAuthorizedName('john doe')).toBe(false);
    expect(isAuthorizedName('')).toBe(false);
    expect(isAuthorizedName('attacker')).toBe(false);
  });

  it('Resolves correct member profile and role', () => {
    const shivansh = getAuthorizedMemberByName('shivansh');
    expect(shivansh).toBeDefined();
    expect(shivansh?.name).toBe('Shivansh');
    expect(shivansh?.role).toBe('owner');

    const dana = getAuthorizedMemberByName('dana');
    expect(dana).toBeDefined();
    expect(dana?.name).toBe('Dana');
    expect(dana?.role).toBe('member');

    const lial = getAuthorizedMemberByName('lial');
    expect(lial).toBeDefined();
    expect(lial?.name).toBe('Lial');

    const niya = getAuthorizedMemberByName('niya');
    expect(niya).toBeDefined();
    expect(niya?.name).toBe('Niya');
  });

  it('Verifies exactly 4 authorized team members exist in roster', () => {
    expect(AUTHORIZED_MEMBERS.length).toBe(4);
    const names = AUTHORIZED_MEMBERS.map((m) => m.normalized).sort();
    expect(names).toEqual(['dana', 'lial', 'niya', 'shivansh']);
  });
});
