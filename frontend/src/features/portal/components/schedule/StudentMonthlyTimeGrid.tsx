import { ActionIcon, Box, Group, Text, Paper, Tooltip, Popover, UnstyledButton } from '@mantine/core';
import { MonthPicker } from '@mantine/dates';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  dayOfWeekKey,
  formatWeekLabel,
  getDaysInWeek,
  getWeekStart,
  gridTotalHeightPx,
  hourLabels,
  HOUR_HEIGHT_PX,
  isToday,
  isWeekend,
  slotHeightPx,
  slotMinutesList,
} from '@/features/teacher-portal/components/schedule/schedule-utils';
import { StudentSessionBlock } from './StudentSessionBlock';
import type { StudentScheduleSession } from './types';

function DayColumn({
  date,
  sessions,
  onSelectSession,
}: {
  date: string;
  sessions: StudentScheduleSession[];
  onSelectSession: (session: StudentScheduleSession) => void;
}) {
  const { t } = useTranslation();
  const weekend = isWeekend(date);
  const today = isToday(date);

  return (
    <Paper
      withBorder
      radius="md"
      style={{
        flex: '1 1 0',
        minWidth: 72,
        background: today
          ? 'var(--mantine-color-yellow-0)'
          : weekend
            ? 'var(--mantine-color-gray-0)'
            : undefined,
        borderColor: today ? 'var(--mantine-color-yellow-5)' : undefined,
        borderWidth: today ? 2 : undefined,
      }}
    >
      <Box
        p={6}
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          textAlign: 'center',
          background: today ? 'var(--mantine-color-yellow-1)' : undefined,
        }}
      >
        <Text fw={700} size="xs" c={today ? 'yellow.9' : undefined}>
          {t(dayOfWeekKey(date))}
        </Text>
        <Text size="sm" fw={600} c={today ? 'yellow.9' : undefined}>
          {date.slice(8)}
        </Text>
      </Box>
      <Box pos="relative" style={{ height: gridTotalHeightPx() }}>
        {slotMinutesList().map((minutes) => (
          <Box
            key={minutes}
            style={{
              height: slotHeightPx(),
              borderBottom: '1px solid var(--mantine-color-gray-1)',
            }}
          />
        ))}
        {sessions.map((s) => (
          <StudentSessionBlock key={s.id} session={s} onSelect={onSelectSession} />
        ))}
      </Box>
    </Paper>
  );
}

interface Props {
  weekStart: string;
  sessions: StudentScheduleSession[];
  onSelectSession: (session: StudentScheduleSession) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onWeekSelect: (weekStart: string) => void;
}

export function StudentMonthlyTimeGrid({
  weekStart,
  sessions,
  onSelectSession,
  onPrevWeek,
  onNextWeek,
  onWeekSelect,
}: Props) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const days = getDaysInWeek(weekStart);
  const hours = hourLabels();
  const [year, month] = weekStart.split('-').map(Number);
  const selectedMonth = new Date(year, month - 1, 1);

  return (
    <Box>
      <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
        <Tooltip label={t('portal.student.schedule.prevWeek')}>
          <ActionIcon
            variant="light"
            size="lg"
            onClick={onPrevWeek}
            aria-label={t('portal.student.schedule.prevWeek')}
          >
            <IconChevronLeft size={20} />
          </ActionIcon>
        </Tooltip>
        <Box style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Popover opened={pickerOpen} onChange={setPickerOpen} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <UnstyledButton
                onClick={() => setPickerOpen((open) => !open)}
                px="sm"
                py={4}
                style={{ borderRadius: 'var(--mantine-radius-sm)' }}
              >
                <Text size="sm" fw={600}>
                  {t('portal.student.schedule.weekLabel', { week: formatWeekLabel(weekStart) })}
                </Text>
              </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown p="xs">
              <MonthPicker
                value={selectedMonth}
                onChange={(date) => {
                  if (date) {
                    onWeekSelect(getWeekStart(date));
                    setPickerOpen(false);
                  }
                }}
                maxLevel="year"
              />
            </Popover.Dropdown>
          </Popover>
        </Box>
        <Tooltip label={t('portal.student.schedule.nextWeek')}>
          <ActionIcon
            variant="light"
            size="lg"
            onClick={onNextWeek}
            aria-label={t('portal.student.schedule.nextWeek')}
          >
            <IconChevronRight size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Box style={{ display: 'flex', alignItems: 'flex-start' }}>
        <Box
          w={44}
          style={{
            flexShrink: 0,
            background: 'var(--mantine-color-body)',
            borderRight: '1px solid var(--mantine-color-gray-3)',
            boxShadow: '4px 0 8px -4px rgba(0, 0, 0, 0.06)',
            zIndex: 2,
          }}
        >
          <Box h={48} />
          <Box pos="relative" style={{ height: gridTotalHeightPx() }}>
            {hours.map((h) => (
              <Text
                key={h}
                size="xs"
                c="dimmed"
                ta="right"
                pr={4}
                style={{ height: HOUR_HEIGHT_PX, lineHeight: `${HOUR_HEIGHT_PX}px` }}
              >
                {String(h).padStart(2, '0')}
              </Text>
            ))}
            <Text size="xs" c="dimmed" pos="absolute" bottom={0} right={4} style={{ lineHeight: 1 }}>
              24
            </Text>
          </Box>
        </Box>
        <Box style={{ flex: 1, display: 'flex', gap: 4, paddingBottom: 8, minWidth: 0 }}>
          {days.map((date) => (
            <DayColumn
              key={date}
              date={date}
              sessions={sessions.filter((s) => s.sessionDate === date)}
              onSelectSession={onSelectSession}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
