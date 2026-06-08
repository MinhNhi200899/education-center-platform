import type { CSSProperties } from 'react';
import { Box, Text, Badge, ActionIcon, Group, Loader } from '@mantine/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { IconTrash } from '@tabler/icons-react';
import type { TeacherScheduleSession } from './schedule-utils';
import { sessionHeightPx, sessionTopPx } from './schedule-utils';

interface Props {
  session: TeacherScheduleSession;
  isSaving?: boolean;
  isOverlay?: boolean;
  onDelete?: (session: TeacherScheduleSession) => void;
}

export function SessionBlock({ session, isSaving, isOverlay, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
    data: { session },
    disabled: isOverlay,
  });

  const top = sessionTopPx(session.startTime);
  const height = sessionHeightPx(session.startTime, session.endTime);

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

  const statusColor =
    session.status === 'completed' ? 'green' : session.status === 'cancelled' ? 'gray' : 'blue';

  return (
    <Box
      ref={isOverlay ? undefined : setNodeRef}
      style={{
        ...style,
        borderRadius: 6,
        border: `2px solid var(--mantine-color-${isSaving ? 'orange' : 'blue'}-4)`,
        background: 'var(--mantine-color-blue-0)',
        padding: '3px 5px',
        cursor: isOverlay ? 'grabbing' : 'grab',
        overflow: 'hidden',
        boxShadow: isOverlay ? '0 8px 24px rgba(0,0,0,0.18)' : undefined,
      }}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
    >
      <Group justify="space-between" wrap="nowrap" gap={2}>
        <Text size="xs" fw={700} lineClamp={1} style={{ flex: 1 }}>
          {session.className}
        </Text>
        {isSaving && <Loader size={12} color="orange" />}
        {!isOverlay && onDelete && !isSaving && (
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
        <Badge size="xs" variant="light" color={statusColor} mt={2}>
          {session.status}
        </Badge>
      )}
    </Box>
  );
}
