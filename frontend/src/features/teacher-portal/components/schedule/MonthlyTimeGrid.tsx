import { ActionIcon, Box, Group, Text, Paper, Tooltip, Popover, UnstyledButton } from '@mantine/core';
import { MonthPicker } from '@mantine/dates';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  dayOfWeekKey,
  formatMonthLabel,
  getDaysInMonth,
  getMonthStart,
  getTodayIso,
  gridTotalHeightPx,
  hourLabels,
  HOUR_HEIGHT_PX,
  isToday,
  isWeekend,
  slotHeightPx,
  slotMinutesList,
  buildSlotId,
  resolveCreateSlotRange,
  sessionHeightPx,
  sessionTopPx,
  yOffsetToSlotMinutes,
  type CreateSlotDraft,
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
  isDraggingSession,
  onDeleteSession,
  onSelectSession,
  onCreateSlot,
  columnRef,
}: {
  date: string;
  sessions: TeacherScheduleSession[];
  savingIds: Set<string>;
  isDraggingSession?: boolean;
  onDeleteSession: (session: TeacherScheduleSession) => void;
  onSelectSession: (session: TeacherScheduleSession) => void;
  onCreateSlot?: (draft: CreateSlotDraft) => void;
  columnRef?: (el: HTMLDivElement | null) => void;
}) {
  const { t } = useTranslation();
  const weekend = isWeekend(date);
  const today = isToday(date);
  const gridRef = useRef<HTMLDivElement>(null);
  const selectingRef = useRef(false);
  const draftRef = useRef<{ anchor: number; current: number } | null>(null);
  const [draft, setDraft] = useState<{ anchor: number; current: number } | null>(null);

  const minutesFromEvent = (e: ReactPointerEvent) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return yOffsetToSlotMinutes(e.clientY - rect.top);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onCreateSlot || isDraggingSession || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-session-block]')) return;

    const minutes = minutesFromEvent(e);
    if (minutes == null) return;

    selectingRef.current = true;
    const next = { anchor: minutes, current: minutes };
    draftRef.current = next;
    setDraft(next);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!selectingRef.current || !draftRef.current) return;
    const minutes = minutesFromEvent(e);
    if (minutes == null) return;
    const next = { ...draftRef.current, current: minutes };
    draftRef.current = next;
    setDraft(next);
  };

  const finishSelection = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!selectingRef.current) return;
    selectingRef.current = false;

    const draftValue = draftRef.current;
    draftRef.current = null;
    setDraft(null);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (!onCreateSlot || !draftValue) return;

    const minutes = minutesFromEvent(e) ?? draftValue.current;
    const range = resolveCreateSlotRange(draftValue.anchor, minutes);
    onCreateSlot({ date, startTime: range.startTime, endTime: range.endTime });
  };

  const preview =
    draft != null ? resolveCreateSlotRange(draft.anchor, draft.current) : null;

  return (
    <Paper
      ref={columnRef}
      withBorder
      radius="md"
      style={{
        flex: '0 0 108px',
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
        {today && (
          <Text size="xs" fw={700} c="yellow.9">
            {t('portal.teacher.schedule.today')}
          </Text>
        )}
      </Box>
      <Box
        ref={gridRef}
        pos="relative"
        style={{
          height: gridTotalHeightPx(),
          cursor: onCreateSlot && !isDraggingSession ? 'crosshair' : undefined,
          userSelect: draft ? 'none' : undefined,
          touchAction: onCreateSlot ? 'none' : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishSelection}
        onPointerCancel={finishSelection}
      >
        {slotMinutesList().map((minutes) => (
          <TimeSlot key={minutes} date={date} startMinutes={minutes} />
        ))}
        {preview && (
          <Box
            style={{
              position: 'absolute',
              top: sessionTopPx(preview.startTime),
              height: sessionHeightPx(preview.startTime, preview.endTime),
              left: 2,
              right: 2,
              background: 'var(--mantine-color-blue-2)',
              border: '1px solid var(--mantine-color-blue-5)',
              borderRadius: 6,
              zIndex: 1,
              pointerEvents: 'none',
              opacity: 0.9,
            }}
          >
            <Text size="xs" fw={600} c="blue.8" px={4} pt={2} lineClamp={1}>
              {preview.startTime}–{preview.endTime}
            </Text>
          </Box>
        )}
        {sessions.map((s) => (
          <SessionBlock
            key={s.id}
            session={s}
            isSaving={savingIds.has(s.id)}
            onDelete={onDeleteSession}
            onSelect={onSelectSession}
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
  isDraggingSession?: boolean;
  onDeleteSession: (session: TeacherScheduleSession) => void;
  onSelectSession: (session: TeacherScheduleSession) => void;
  onCreateSlot?: (draft: CreateSlotDraft) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthSelect: (monthStart: string) => void;
}

export function MonthlyTimeGrid({
  monthStart,
  sessions,
  savingIds,
  isDraggingSession,
  onDeleteSession,
  onSelectSession,
  onCreateSlot,
  onPrevMonth,
  onNextMonth,
  onMonthSelect,
}: Props) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const days = getDaysInMonth(monthStart);
  const hours = hourLabels();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement | null>(null);
  const today = getTodayIso();
  const [year, month] = monthStart.split('-').map(Number);
  const selectedMonth = new Date(year, month - 1, 1);

  useEffect(() => {
    if (!days.includes(today) || !todayRef.current || !scrollRef.current) return;
    const container = scrollRef.current;
    const column = todayRef.current;
    const offsetLeft = column.offsetLeft - container.offsetLeft;
    const centered = offsetLeft - container.clientWidth / 2 + column.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, centered), behavior: 'smooth' });
  }, [monthStart, days, today]);

  return (
    <Box>
      <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
        <Tooltip label={t('portal.teacher.schedule.prevMonth')}>
          <ActionIcon variant="light" size="lg" onClick={onPrevMonth} aria-label={t('portal.teacher.schedule.prevMonth')}>
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
                  {t('portal.teacher.schedule.monthLabel', { month: formatMonthLabel(monthStart) })}
                </Text>
              </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown p="xs">
              <MonthPicker
                value={selectedMonth}
                onChange={(date) => {
                  if (date) {
                    onMonthSelect(getMonthStart(date));
                    setPickerOpen(false);
                  }
                }}
                maxLevel="year"
              />
            </Popover.Dropdown>
          </Popover>
        </Box>
        <Tooltip label={t('portal.teacher.schedule.nextMonth')}>
          <ActionIcon variant="light" size="lg" onClick={onNextMonth} aria-label={t('portal.teacher.schedule.nextMonth')}>
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
        <Box
          ref={scrollRef}
          style={{ flex: 1, display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 8 }}
        >
          {days.map((date) => (
            <DayColumn
              key={date}
              date={date}
              sessions={sessions.filter((s) => s.sessionDate === date)}
              savingIds={savingIds}
              isDraggingSession={isDraggingSession}
              onDeleteSession={onDeleteSession}
              onSelectSession={onSelectSession}
              onCreateSlot={onCreateSlot}
              columnRef={isToday(date) ? (el) => { todayRef.current = el; } : undefined}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
