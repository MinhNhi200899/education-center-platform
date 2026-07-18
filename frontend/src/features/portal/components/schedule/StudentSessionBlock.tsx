import type { CSSProperties } from 'react';
import { Box, Text, Badge, Group } from '@mantine/core';
import { IconBook } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  sessionHeightPx,
  sessionTopPx,
} from '@/features/teacher-portal/components/schedule/schedule-utils';
import {
  getSessionPhase,
  sessionPhaseColor,
} from '@/features/teacher-portal/components/schedule/session-phase';
import type { StudentScheduleSession } from './types';

interface Props {
  session: StudentScheduleSession;
  onSelect: (session: StudentScheduleSession) => void;
}

export function StudentSessionBlock({ session, onSelect }: Props) {
  const { t } = useTranslation();
  const phase = getSessionPhase(session);
  const displayColor = sessionPhaseColor(phase);
  const top = sessionTopPx(session.startTime);
  const height = sessionHeightPx(session.startTime, session.endTime);
  const hasHomework = session.hasHomework === true;

  const phaseLabel =
    phase === 'upcoming'
      ? t('portal.student.schedule.phase.upcoming')
      : phase === 'in_progress'
        ? t('portal.student.schedule.phase.inProgress')
        : phase === 'ended'
          ? t('portal.student.schedule.phase.ended')
          : t('portal.student.schedule.phase.cancelled');

  const style: CSSProperties = {
    position: 'absolute',
    top,
    left: 2,
    right: 2,
    height: Math.max(height, 32),
    zIndex: 2,
  };

  return (
    <Box
      style={{
        ...style,
        borderRadius: 6,
        border: `2px solid var(--mantine-color-${displayColor}-4)`,
        background: `var(--mantine-color-${displayColor}-0)`,
        padding: '3px 5px',
        cursor: phase === 'cancelled' ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
      }}
      onClick={() => {
        if (phase !== 'cancelled') onSelect(session);
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap={2}>
        <Text size="xs" fw={700} lineClamp={1} style={{ flex: 1 }}>
          {session.className}
        </Text>
        {hasHomework && <IconBook size={12} color={`var(--mantine-color-${displayColor}-7)`} />}
      </Group>
      <Text size="xs" c="dimmed" lineClamp={1}>
        {session.startTime}–{session.endTime}
      </Text>
      <Badge size="xs" variant="light" color={displayColor} mt={2}>
        {hasHomework ? t('portal.student.schedule.hasHomework') : phaseLabel}
      </Badge>
    </Box>
  );
}
