import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { motion, LayoutGroup } from "framer-motion";
import { AnimatedCounter } from "@/components/effects/AnimatedCounter";

export interface KanbanColumn<T> {
  id: string;
  title: string;
  color: string;
  items: T[];
}

export interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumn<T>[];
  onDragEnd: (itemId: string, fromColumn: string, toColumn: string) => void;
  renderCard: (item: T) => React.ReactNode;
}

function DroppableColumn<T extends { id: string }>({
  column,
  renderCard,
}: {
  column: KanbanColumn<T>;
  renderCard: (item: T) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] w-[280px] shrink-0 rounded-lg border bg-muted/30 ${
        isOver ? "ring-2 ring-primary/50" : ""
      }`}
    >
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: column.color }}
      >
        <span className="text-sm font-semibold text-white">{column.title}</span>
        <span className="text-xs font-medium text-white/80 bg-white/20 rounded-full px-2 py-0.5">
          <AnimatedCounter value={column.items.length} duration={0.6} className="text-xs" />
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-[120px] overflow-y-auto max-h-[calc(100vh-240px)]">
        {column.items.map((item) => (
          <DraggableCard key={item.id} item={item} columnId={column.id} renderCard={renderCard} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard<T extends { id: string }>({
  item,
  columnId,
  renderCard,
}: {
  item: T;
  columnId: string;
  renderCard: (item: T) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { columnId },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      {renderCard(item)}
    </motion.div>
  );
}

export function KanbanBoard<T extends { id: string }>({
  columns,
  onDragEnd,
  renderCard,
}: KanbanBoardProps<T>) {
  const [activeItem, setActiveItem] = useState<T | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const columnId = active.data.current?.columnId as string;
    setActiveColumnId(columnId);
    const col = columns.find((c) => c.id === columnId);
    const item = col?.items.find((i) => i.id === active.id);
    setActiveItem(item ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && activeColumnId) {
      const toColumn = over.id as string;
      if (toColumn !== activeColumnId) {
        onDragEnd(active.id as string, activeColumnId, toColumn);
      }
    }
    setActiveItem(null);
    setActiveColumnId(null);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <LayoutGroup>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <DroppableColumn key={column.id} column={column} renderCard={renderCard} />
        ))}
      </div>
      </LayoutGroup>
      <DragOverlay>
        {activeItem ? <div className="rotate-2 opacity-90">{renderCard(activeItem)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
