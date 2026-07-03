import type { CSSProperties } from 'react';
import { useRef } from 'react';
import { Box, Text, Badge, ActionIcon, Group, Loader } from '@mantine/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TeacherScheduleSession } from './schedule-utils';
import { sessionHeightPx, sessionTopPx } from './schedule-utils';
import { getSessionPhase, sessionPhaseColor, ATTENDANCE_MARKED_COLOR, canDragSession } from './session-phase';

interface Props {
  session: TeacherScheduleSession;
  isSaving?: boolean;
  isOverlay?: boolean;
  onDelete?: (session: TeacherScheduleSession) => void;
  onSelect?: (session: TeacherScheduleSession) => void;
}

export function SessionBlock({ session, isSaving, isOverlay, onDelete, onSelect }: Props) {
  const { t } = useTranslation();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const phase = getSessionPhase(session);
  const phaseColor = sessionPhaseColor(phase);
  const draggable = !isOverlay && canDragSession(session);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
    data: { session },
    disabled: !draggable,
  });

  const attendanceMarked = session.attendanceMarked === true;
  const displayColor = attendanceMarked ? ATTENDANCE_MARKED_COLOR : phaseColor;

  const top = sessionTopPx(session.startTime);
  const height = sessionHeightPx(session.startTime, session.endTime);

  const borderColor = isSaving
    ? 'var(--mantine-color-orange-4)'
    : `var(--mantine-color-${displayColor}-4)`;

  const style: CSSProperties = {
    position: isOverlay ? 'relative' : 'absolute',
    top: isOverlay ? undefined : top,
    left: isOverlay ? undefined : 2,
    right: isOverlay ? undefined : 2,
    width: isOverlay ? 100 : undefined,
    height: Math.max(height, 32),
    zIndex: isDragging || isOverlay ? 30 : 2,
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
    opacity: isDragging && !isOverlay ? 0.35 : 1,
    pointerEvents: isOverlay ? 'none' : 'auto',
  };

  const phaseLabel =
    phase === 'upcoming'
      ? t('portal.teacher.schedule.phase.upcoming')
      : phase === 'in_progress'
        ? t('portal.teacher.schedule.phase.inProgress')
        : phase === 'ended'
          ? t('portal.teacher.schedule.phase.ended')
          : t('portal.teacher.schedule.phase.cancelled');

  let badgeLabel: string;
  let badgeColor: string;
  if (attendanceMarked) {
    badgeLabel = t('portal.teacher.schedule.phase.attendanceDone');
    badgeColor = ATTENDANCE_MARKED_COLOR;
  } else if (phase === 'in_progress') {
    badgeLabel = t('portal.teacher.schedule.phase.inProgress');
    badgeColor = displayColor;
  } else if (phase === 'ended') {
    badgeLabel = t('portal.teacher.schedule.phase.ended');
    badgeColor = displayColor;
  } else {
    badgeLabel = phaseLabel;
    badgeColor = displayColor;
  }

  return (
    <Box
      ref={isOverlay ? undefined : setNodeRef}
      style={{
        ...style,
        borderRadius: 6,
        border: `2px solid ${borderColor}`,
        background: `var(--mantine-color-${displayColor}-0)`,
        padding: '3px 5px',
        cursor: isOverlay
          ? 'grabbing'
          : phase === 'cancelled'
            ? 'not-allowed'
            : draggable
              ? 'grab'
              : 'pointer',
        overflow: 'hidden',
        boxShadow: isOverlay ? '0 8px 24px rgba(0,0,0,0.18)' : undefined,
      }}
      {...(isOverlay ? {} : attributes)}
      onPointerDown={(e) => {
        if (isOverlay || phase === 'cancelled') return;
        pointerStart.current = { x: e.clientX, y: e.clientY };
        if (draggable) listeners?.onPointerDown?.(e);
      }}
      onClick={(e) => {
        if (isOverlay || !onSelect || !pointerStart.current || phase === 'cancelled') return;
        const dx = Math.abs(e.clientX - pointerStart.current.x);
        const dy = Math.abs(e.clientY - pointerStart.current.y);
        pointerStart.current = null;
        if (dx < 6 && dy < 6) onSelect(session);
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap={2}>
        <Text size="xs" fw={700} lineClamp={1} style={{ flex: 1 }}>
          {session.className}
        </Text>
        {isSaving && <Loader size={12} color="orange" />}
        {!isOverlay && onDelete && !isSaving && phase === 'upcoming' && (
          <ActionIcon
            size="xs"
            variant="subtle"
            color="red"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session);
            }}
          >
            <IconTrash size={11} />
          </ActionIcon>
        )}
      </Group>
      <Text size="xs" c="dimmed" lineClamp={1}>
        {session.startTime}–{session.endTime}
      </Text>
      {!isOverlay && (
        <Badge size="xs" variant="light" color={badgeColor} mt={2}>
          {badgeLabel}
        </Badge>
      )}
    </Box>
  );
}
