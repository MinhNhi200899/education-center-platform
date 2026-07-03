import { randomBytes } from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const ALL = UPPER + LOWER + DIGITS;

function pickChar(chars: string): string {
  return chars[randomBytes(1)[0] % chars.length];
}

/** Generates an 8-character alphanumeric password (upper, lower, digit). */
export function generateInitialPassword(length = 8): string {
  const required = [pickChar(UPPER), pickChar(LOWER), pickChar(DIGITS)];
  const rest = Array.from({ length: Math.max(length, 8) - required.length }, () => pickChar(ALL));
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export function isValidStudentPassword(password: string): boolean {
  return password.length >= 8;
}
