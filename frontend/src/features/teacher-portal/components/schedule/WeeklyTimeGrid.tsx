import { Box, Text, Paper, Group } from '@mantine/core';
import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import {
  addDays,
  gridTotalHeightPx,
  hourLabels,
  HOUR_HEIGHT_PX,
  type TeacherScheduleSession,
} from './schedule-utils';
import { SessionBlock } from './SessionBlock';

const DAY_I18N = [
  'common.monday',
  'common.tuesday',
  'common.wednesday',
  'common.thursday',
  'common.friday',
  'common.saturday',
  'common.sunday',
] as const;

interface DayColumnProps {
  date: string;
  label: string;
  sessions: TeacherScheduleSession[];
  onDeleteSession: (session: TeacherScheduleSession) => void;
}

function DayColumn({ date, label, sessions, onDeleteSession }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${date}` });

  return (
    <Paper
      withBorder
      radius="md"
      style={{
        flex: 1,
        minWidth: 100,
        background: isOver ? 'var(--mantine-color-blue-0)' : undefined,
      }}
    >
      <Box p="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <Text fw={700} size="sm">
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          {date.slice(8)}/{date.slice(5, 7)}
        </Text>
      </Box>
      <Box
        ref={setNodeRef}
        pos="relative"
        style={{ height: gridTotalHeightPx(), borderLeft: '1px dashed var(--mantine-color-gray-2)' }}
      >
        {hourLabels().map((h) => (
          <Box
            key={h}
            style={{
              height: HOUR_HEIGHT_PX,
              borderBottom: '1px solid var(--mantine-color-gray-2)',
            }}
          />
        ))}
        {sessions.map((s) => (
          <SessionBlock key={s.id} session={s} onDelete={onDeleteSession} />
        ))}
      </Box>
    </Paper>
  );
}

interface Props {
  weekStart: string;
  sessions: TeacherScheduleSession[];
  onDeleteSession: (session: TeacherScheduleSession) => void;
}

export function WeeklyTimeGrid({ weekStart, sessions, onDeleteSession }: Props) {
  const { t } = useTranslation();
  const hours = hourLabels();

  return (
    <Group align="flex-start" gap="xs" wrap="nowrap" style={{ overflowX: 'auto' }}>
      <Box w={48} pt={52}>
        {hours.map((h) => (
          <Text key={h} size="xs" c="dimmed" ta="right" pr={4} style={{ height: HOUR_HEIGHT_PX }}>
            {String(h).padStart(2, '0')}:00
          </Text>
        ))}
      </Box>
      {DAY_I18N.map((key, i) => {
        const date = addDays(weekStart, i);
        const daySessions = sessions.filter((s) => s.sessionDate === date);
        return (
          <DayColumn
            key={date}
            date={date}
            label={t(key)}
            sessions={daySessions}
            onDeleteSession={onDeleteSession}
          />
        );
      })}
    </Group>
  );
}
