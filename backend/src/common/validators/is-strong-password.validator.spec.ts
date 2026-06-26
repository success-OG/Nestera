import { validate } from 'class-validator';
import {
  IsStrongPassword,
  getPasswordErrors,
} from './is-strong-password.validator';

// ─── Dummy DTO used only inside tests ────────────────────────────────────────

class TestDto {
  @IsStrongPassword()
  password: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function errorsFor(password: string): Promise<string[]> {
  const dto = new TestDto();
  dto.password = password;
  const errors = await validate(dto);
  if (errors.length === 0) return [];
  // Return the constraint messages for easier assertions
  return Object.values(errors[0].constraints ?? {});
}

// ─── getPasswordErrors unit tests ────────────────────────────────────────────

describe('getPasswordErrors', () => {
  it('returns empty array for a fully valid password', () => {
    expect(getPasswordErrors('Secure@1')).toHaveLength(0);
    expect(getPasswordErrors('MyP@ssw0rd!')).toHaveLength(0);
    expect(getPasswordErrors('Tr0ub4dor&3')).toHaveLength(0);
  });

  it('reports missing length when password is too short', () => {
    const errs = getPasswordErrors('Ab1!');
    expect(errs.some((e) => e.includes('8 characters'))).toBe(true);
  });

  it('reports missing uppercase letter', () => {
    const errs = getPasswordErrors('secure@1abc');
    expect(errs.some((e) => e.includes('uppercase'))).toBe(true);
  });

  it('reports missing lowercase letter', () => {
    const errs = getPasswordErrors('SECURE@1ABC');
    expect(errs.some((e) => e.includes('lowercase'))).toBe(true);
  });

  it('reports missing digit', () => {
    const errs = getPasswordErrors('Secure@abc!');
    expect(errs.some((e) => e.includes('digit'))).toBe(true);
  });

  it('reports missing special character', () => {
    const errs = getPasswordErrors('Secure1abc');
    expect(errs.some((e) => e.includes('special'))).toBe(true);
  });

  it('reports all violations simultaneously', () => {
    // "abc" – short, no uppercase, no digit, no special char
    const errs = getPasswordErrors('abc');
    expect(errs.length).toBeGreaterThanOrEqual(4);
  });

  it('returns an error when the value is not a string', () => {
    expect(getPasswordErrors(null)).toEqual(['Password must be a string']);
    expect(getPasswordErrors(12345678)).toEqual(['Password must be a string']);
    expect(getPasswordErrors(undefined)).toEqual(['Password must be a string']);
  });
});

// ─── @IsStrongPassword decorator integration tests ───────────────────────────

describe('@IsStrongPassword decorator', () => {
  // ── Valid passwords ────────────────────────────────────────────────────────

  it('passes validation for a strongly complex password', async () => {
    expect(await errorsFor('Secure@1')).toHaveLength(0);
  });

  it('passes validation with various special characters', async () => {
    const specials = ['!', '@', '#', '$', '%', '^', '&', '*', '-', '_', '+'];
    for (const ch of specials) {
      expect(await errorsFor(`Password1${ch}`)).toHaveLength(0);
    }
  });

  // ── Minimum-length boundary ───────────────────────────────────────────────

  it('rejects passwords shorter than 8 characters', async () => {
    const msgs = await errorsFor('Ab1!xyz'); // 7 chars
    expect(msgs.some((m) => m.includes('8 characters'))).toBe(true);
  });

  it('accepts passwords exactly 8 characters long', async () => {
    expect(await errorsFor('Secure@1')).toHaveLength(0); // exactly 8 chars
  });

  // ── Character-class requirements ──────────────────────────────────────────

  it('rejects passwords with no uppercase letter', async () => {
    const msgs = await errorsFor('secure@123');
    expect(msgs.some((m) => m.includes('uppercase'))).toBe(true);
  });

  it('rejects passwords with no lowercase letter', async () => {
    const msgs = await errorsFor('SECURE@123');
    expect(msgs.some((m) => m.includes('lowercase'))).toBe(true);
  });

  it('rejects passwords with no digit', async () => {
    const msgs = await errorsFor('Secure@abc!');
    expect(msgs.some((m) => m.includes('digit'))).toBe(true);
  });

  it('rejects passwords with no special character', async () => {
    const msgs = await errorsFor('Secure1abc');
    expect(msgs.some((m) => m.includes('special'))).toBe(true);
  });

  // ── Common weak password patterns ─────────────────────────────────────────

  it('rejects a plain dictionary word', async () => {
    const msgs = await errorsFor('password');
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('rejects password with only digits', async () => {
    const msgs = await errorsFor('12345678');
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('rejects the classic weak pattern "Password1" (no special char)', async () => {
    const msgs = await errorsFor('Password1');
    expect(msgs.some((m) => m.includes('special'))).toBe(true);
  });

  // ── Error message format ──────────────────────────────────────────────────

  it('error message references the property name', async () => {
    const dto = new TestDto();
    dto.password = 'weak';
    const errors = await validate(dto);
    const msg = Object.values(errors[0]?.constraints ?? {}).join(' ');
    expect(msg).toContain('password');
  });
});
