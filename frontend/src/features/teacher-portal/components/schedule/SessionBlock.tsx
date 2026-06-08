import type { CSSProperties } from 'react';
import { Box, Text, Badge, ActionIcon, Group } from '@mantine/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { IconTrash } from '@tabler/icons-react';
import type { TeacherScheduleSession } from './schedule-utils';
import { sessionHeightPx, sessionTopPx } from './schedule-utils';

interface Props {
  session: TeacherScheduleSession;
  onDelete: (session: TeacherScheduleSession) => void;
}

export function SessionBlock({ session, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
    data: { session },
  });

  const top = sessionTopPx(session.startTime);
  const height = sessionHeightPx(session.startTime, session.endTime);

  const style: CSSProperties = {
    position: 'absolute',
    top,
    left: 4,
    right: 4,
    height: Math.max(height, 36),
    zIndex: isDragging ? 20 : 1,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
  };

  const statusColor =
    session.status === 'completed' ? 'green' : session.status === 'cancelled' ? 'gray' : 'blue';

  return (
    <Box
      ref={setNodeRef}
      style={{
        ...style,
        borderRadius: 8,
        border: '1px solid var(--mantine-color-blue-3)',
        background: 'var(--mantine-color-blue-0)',
        padding: '4px 6px',
        cursor: 'grab',
        overflow: 'hidden',
      }}
      {...listeners}
      {...attributes}
    >
      <Group justify="space-between" wrap="nowrap" gap={4}>
        <Text size="xs" fw={700} lineClamp={1} style={{ flex: 1 }}>
          {session.className}
        </Text>
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
          <IconTrash size={12} />
        </ActionIcon>
      </Group>
      <Text size="xs" c="dimmed">
        {session.startTime}–{session.endTime}
      </Text>
      {session.classroom && (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {session.classroom}
        </Text>
      )}
      <Badge size="xs" variant="light" color={statusColor} mt={2}>
        {session.status}
      </Badge>
    </Box>
  );
}
