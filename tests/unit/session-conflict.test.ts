import { describe, it, expect } from 'vitest';
import { SessionService } from '../../src/modules/sessions/services/session.service';

describe('SessionService time overlap', () => {
  const service = new SessionService() as SessionService & {
    timesOverlap: (a: string, b: string, c: string, d: string) => boolean;
  };

  it('detects overlapping ranges', () => {
    const overlap = (service as any).timesOverlap.bind(service);
    expect(overlap('08:00', '09:30', '09:00', '10:00')).toBe(true);
    expect(overlap('08:00', '09:00', '09:00', '10:00')).toBe(false);
    expect(overlap('08:00', '09:00', '10:00', '11:00')).toBe(false);
  });
});
