import { Box, Text, Paper } from '@mantine/core';
import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import {
  dayOfWeekKey,
  formatMonthLabel,
  getDaysInMonth,
  gridTotalHeightPx,
  hourLabels,
  HOUR_HEIGHT_PX,
  isWeekend,
  slotHeightPx,
  slotMinutesList,
  buildSlotId,
  type TeacherScheduleSession,
} from './schedule-utils';
import { SessionBlock } from './SessionBlock';

function TimeSlot({
  date,
  startMinutes,
}: {
  date: string;
  startMinutes: number;
}) {
  const id = buildSlotId(date, startMinutes);
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Box
      ref={setNodeRef}
      style={{
        height: slotHeightPx(),
        borderBottom: '1px solid var(--mantine-color-gray-1)',
        background: isOver ? 'var(--mantine-color-blue-1)' : undefined,
        transition: 'background 120ms ease',
      }}
    />
  );
}

function DayColumn({
  date,
  sessions,
  savingIds,
  onDeleteSession,
}: {
  date: string;
  sessions: TeacherScheduleSession[];
  savingIds: Set<string>;
  onDeleteSession: (session: TeacherScheduleSession) => void;
}) {
  const { t } = useTranslation();
  const weekend = isWeekend(date);

  return (
    <Paper
      withBorder
      radius="md"
      style={{
        flex: '0 0 108px',
        background: weekend ? 'var(--mantine-color-gray-0)' : undefined,
      }}
    >
      <Box
        p={6}
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          textAlign: 'center',
        }}
      >
        <Text fw={700} size="xs">
          {t(dayOfWeekKey(date))}
        </Text>
        <Text size="sm" fw={600}>
          {date.slice(8)}
        </Text>
      </Box>
      <Box pos="relative" style={{ height: gridTotalHeightPx() }}>
        {slotMinutesList().map((minutes) => (
          <TimeSlot key={minutes} date={date} startMinutes={minutes} />
        ))}
        {sessions.map((s) => (
          <SessionBlock
            key={s.id}
            session={s}
            isSaving={savingIds.has(s.id)}
            onDelete={onDeleteSession}
          />
        ))}
      </Box>
    </Paper>
  );
}

interface Props {
  monthStart: string;
  sessions: TeacherScheduleSession[];
  savingIds: Set<string>;
  onDeleteSession: (session: TeacherScheduleSession) => void;
}

export function MonthlyTimeGrid({ monthStart, sessions, savingIds, onDeleteSession }: Props) {
  const { t } = useTranslation();
  const days = getDaysInMonth(monthStart);
  const hours = hourLabels();

  return (
    <Box>
      <Text size="sm" fw={600} mb="xs" ta="center">
        {t('portal.teacher.schedule.monthLabel', { month: formatMonthLabel(monthStart) })}
      </Text>
      <Box style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 8 }}>
        <Box w={44} pt={48} style={{ flexShrink: 0 }}>
          {hours.map((h) => (
            <Text
              key={h}
              size="xs"
              c="dimmed"
              ta="right"
              pr={4}
              style={{ height: HOUR_HEIGHT_PX }}
            >
              {String(h).padStart(2, '0')}
            </Text>
          ))}
        </Box>
        {days.map((date) => (
          <DayColumn
            key={date}
            date={date}
            sessions={sessions.filter((s) => s.sessionDate === date)}
            savingIds={savingIds}
            onDeleteSession={onDeleteSession}
          />
        ))}
      </Box>
    </Box>
  );
}
