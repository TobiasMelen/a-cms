//@ts-expect-error Something is going on with astro imports
import { navigate } from "astro:transitions/client";
import { useState, useRef, useMemo, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import FloatingWindow from "../FloatingWindow/FloatingWindow";
import { useApiClient } from "../../../api/client";

// -- types --

type TreeItem = {
  index: string;
  data: string;
  children?: string[];
  italic?: boolean;
  dotColor?: string;
};

type FlatItem = TreeItem & { depth: number };

type Props = {
  items: Record<string, TreeItem>;
  urls: Record<string, string>;
  currentPageId: string;
};

// -- tree helpers --

function findRoots(items: Record<string, TreeItem>): string[] {
  const childIds = new Set<string>();
  for (const it of Object.values(items)) {
    if (it.children) for (const c of it.children) childIds.add(c);
  }
  return Object.keys(items).filter((id) => !childIds.has(id));
}

function buildFlat(items: Record<string, TreeItem>, roots: string[], expanded: Set<string>): FlatItem[] {
  const result: FlatItem[] = [];
  function walk(children: string[], depth: number) {
    for (const id of children) {
      const it = items[id];
      if (!it) continue;
      result.push({ ...it, depth });
      if (expanded.has(id) && it.children?.length) walk(it.children, depth + 1);
    }
  }
  walk(roots, 0);
  return result;
}

function buildParentMap(items: Record<string, TreeItem>, roots: string[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const [, it] of Object.entries(items)) {
    if (it.children) for (const c of it.children) map[c] = it.index;
  }
  for (const id of roots) map[id] = null;
  return map;
}

function moveItem(
  items: Record<string, TreeItem>,
  roots: string[],
  activeId: string,
  overId: string,
  newParent: string | null,
  oldParent: string | null,
  isAbove: boolean,
): { items: Record<string, TreeItem>; roots: string[] } {
  const next = { ...items };
  let nextRoots = [...roots];

  if (oldParent === null) {
    nextRoots = nextRoots.filter((c) => c !== activeId);
  } else if (next[oldParent]) {
    next[oldParent] = {
      ...next[oldParent],
      children: (next[oldParent].children ?? []).filter((c) => c !== activeId),
    };
  }

  const siblings = newParent === null ? nextRoots : [...(next[newParent]?.children ?? [])];
  const at = Math.max(0, siblings.indexOf(overId)) + (isAbove ? 0 : 1);
  siblings.splice(at, 0, activeId);

  if (newParent === null) {
    nextRoots = siblings;
  } else if (next[newParent]) {
    next[newParent] = { ...next[newParent], children: siblings };
  }

  return { items: next, roots: nextRoots };
}

// -- collision detection --

// -- sub-components --

function ExpandZone({ itemId, hasChildren, isExpanded, isDraggingSome, isDragging, onToggle }: {
  itemId: string;
  hasChildren: boolean;
  isExpanded: boolean;
  isDraggingSome: boolean;
  isDragging: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `__expand__${itemId}` });

  return (
    <button
      ref={setNodeRef}
      data-dnd-expand={itemId}
      onClick={onToggle}
      style={{
        padding: 0,
        alignSelf: "stretch",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1.5em",
        background: isOver ? "var(--color-primary)" : "transparent",
        border: "none",
        color: "var(--color-text)",
        opacity: hasChildren ? 1 : (isDraggingSome ? 0.5 : 0),
        cursor: isDragging || isDraggingSome ? undefined : "pointer",
        borderRadius: "0.25em",
        transition: "opacity 0.2s, background 0.15s, transform 0.2s",
        flexShrink: 0,
        transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
      }}
    >
      <svg width="10" height="6" viewBox="0 0 10 6" style={{ display: "block" }}>
        <path d="M0.5 0.5 L5 5.5 L9.5 0.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function SortableNode({
  item,
  urls,
  currentPageId,
  expandedItems,
  toggleExpanded,
  isDraggingSome,
}: {
  item: FlatItem;
  urls: Record<string, string>;
  currentPageId: string;
  expandedItems: Set<string>;
  toggleExpanded: (id: string) => void;
  isDraggingSome: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.index as string });

  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.index as string);
  return (
    <div
      ref={setNodeRef}
      data-dnd-id={item.index}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        paddingLeft: `${item.depth * 0.5 + 0.5}em`,
        background: item.index === currentPageId ? "var(--color-primary)" : "transparent",
        borderRadius: "0.25em",
        display: "flex",
        alignItems: "center",
        fontSize: "0.8125rem",
      }}
    >
      <ExpandZone itemId={item.index as string} hasChildren={!!hasChildren} isExpanded={isExpanded} isDraggingSome={isDraggingSome} isDragging={isDragging} onToggle={() => toggleExpanded(item.index as string)} />
      <span
        {...attributes}
        {...listeners}
        onClick={() => { const u = urls[item.index as string]; if (u) navigate(u); }}
        style={{
          cursor: isDraggingSome ? undefined : "pointer",
          userSelect: "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          padding: "0.125em 0.5em 0.125em 0",
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: "0.375em",
          ...(item.italic ? { fontStyle: "italic", color: "var(--color-text-secondary)" } : {}),
        }}
      >
        {item.data}
        {item.dotColor ? (
          <span style={{ width: "0.375em", height: "0.375em", borderRadius: "50%", background: item.dotColor, flexShrink: 0 }} />
        ) : null}
      </span>
    </div>
  );
}

// -- main component --

export default function PageTree({ items: serverItems, urls, currentPageId }: Props) {
  const api = useApiClient();
  const [items, setItems] = useState(serverItems);
  const [roots, setRoots] = useState<string[]>(() => findRoots(serverItems));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(findRoots(serverItems)));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const pointer = useRef({ x: 0, y: 0 });
  const depthRef = useRef(0);

  useEffect(() => { setItems(serverItems); setRoots(findRoots(serverItems)); }, [serverItems]);

  const flat = useMemo(() => buildFlat(items, roots, expanded), [items, roots, expanded]);
  const parentMap = useMemo(() => buildParentMap(items, roots), [items, roots]);

  const activeDepth = activeId ? (flat.find((i) => i.index === activeId)?.depth ?? 0) : 0;

  const toggle = (id: string) => setExpanded((p) => {
    const n = new Set(p);
    if (n.has(id)) { n.delete(id); } else { n.add(id); }
    return n;
  });

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
    const ev = e.activatorEvent as PointerEvent;
    pointer.current = { x: ev.clientX, y: ev.clientY };
    const d = flat.find((i) => i.index === (e.active.id as string))?.depth ?? 0;
    depthRef.current = d;
    requestAnimationFrame(() => {
      const el = document.querySelector("[data-cms-overlay]") as HTMLElement | null;
      if (el) el.style.paddingLeft = `${d * 0.5 + 0.5}em`;
    });
  }

  function onDragMove(e: DragMoveEvent) {
    pointer.current = { x: pointer.current.x + e.delta.x, y: pointer.current.y + e.delta.y };

    // Hit-test flat items to sync overlay depth
    for (const item of flat) {
      const el = document.querySelector(`[data-dnd-id="${item.index}"]`) as HTMLElement | null;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (pointer.current.y >= r.top && pointer.current.y <= r.bottom) {
        if (item.depth !== depthRef.current) {
          depthRef.current = item.depth;
          const overlay = document.querySelector("[data-cms-overlay]") as HTMLElement | null;
          if (overlay) overlay.style.paddingLeft = `${item.depth * 0.5 + 0.5}em`;
        }
        break;
      }
    }

    // Manual expand zone hit-test — dnd-kit collision detection is unreliable for nested droppables
    const expandEls = document.querySelectorAll("[data-dnd-expand]");
    for (const el of expandEls) {
      const r = el.getBoundingClientRect();
      if (pointer.current.x < r.left || pointer.current.x > r.right ||
          pointer.current.y < r.top || pointer.current.y > r.bottom) continue;
      const targetId = (el as HTMLElement).dataset.dndExpand;
      if (!targetId) continue;
      const target = items[targetId];
      if (target?.children?.length) {
        setExpanded((prev) => { const n = new Set(prev); n.add(targetId); return n; });
      }
      break;
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    let overId_ = e.over?.id as string | undefined;

    // Manual hit-test for expand zone (more reliable than dnd-kit collision for nested droppables)
    const expandEls = document.querySelectorAll("[data-dnd-expand]");
    let expandTarget: string | null = null;
    for (const el of expandEls) {
      const r = el.getBoundingClientRect();
      if (pointer.current.x >= r.left && pointer.current.x <= r.right &&
          pointer.current.y >= r.top && pointer.current.y <= r.bottom) {
        expandTarget = (el as HTMLElement).dataset.dndExpand ?? null;
        break;
      }
    }

    async function commitMove(
      id: string,
      json: { id: string; parentId?: string | null; beforeId?: string; afterId?: string },
      prevItems: typeof items,
      prevRoots: typeof roots,
    ) {
      try {
        const res = await api.move.$post({ json });
        if (!res.ok) throw new Error(await res.text());
        const { url: newUrl } = await res.json();
        const oldUrl = urls[id];
        navigate(oldUrl && window.location.pathname === oldUrl ? newUrl : window.location.href);
      } catch (err) {
        console.error(`[PageTree] move failed:`, err);
        setItems(prevItems);
        setRoots(prevRoots);
        alert("Failed to move page: " + (err instanceof Error ? err.message : String(err)));
      }
    }

    // Dropped on expand zone → make first child
    if (expandTarget) {
      const id = e.active.id as string;
      if (id === expandTarget) { setActiveId(null); return; }
      const oldParent = parentMap[id] ?? null;
      const prevItems = items;
      const prevRoots = roots;
      const result = moveItem(items, roots, id, expandTarget, expandTarget, oldParent, true);
      setItems(result.items);
      setRoots(result.roots);
      setActiveId(null);
      await commitMove(id, { id, parentId: expandTarget }, prevItems, prevRoots);
      return;
    }

    if (!overId_) {
      const last = flat[flat.length - 1];
      if (!last) { setActiveId(null); return; }
      overId_ = last.index as string;
    }

    if (e.active.id === overId_) { setActiveId(null); return; }

    const newParent = parentMap[overId_] ?? null;
    const isAbove = e.over?.rect ? pointer.current.y < e.over.rect.top + e.over.rect.height / 2 : false;

    const id = e.active.id as string;
    const oldParent = parentMap[id] ?? null;
    const prevItems = items;
    const prevRoots = roots;
    const result = moveItem(items, roots, id, overId_, newParent, oldParent, isAbove);
    setItems(result.items);
    setRoots(result.roots);
    setActiveId(null);

    await commitMove(
      id,
      isAbove
        ? { id, parentId: newParent, beforeId: overId_ }
        : { id, parentId: newParent, afterId: overId_ },
      prevItems,
      prevRoots,
    );
  }

  const activeData = activeId ? items[activeId] : null;

  return (
    <FloatingWindow defaultWidth={300} defaultHeight={400} className="a-cms-edit" positionKey="page-tree">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <SortableContext items={flat.map((i) => i.index as string)} strategy={verticalListSortingStrategy}>
            {flat.map((item) => (
              <SortableNode
                key={item.index as string}
                item={item}
                urls={urls}
                currentPageId={currentPageId}
                expandedItems={expanded}
                toggleExpanded={toggle}
                isDraggingSome={activeId !== null}
              />
            ))}
          </SortableContext>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeData ? (
            <div
              data-cms-overlay
              style={{
                padding: "0.25em 0.5em",
                paddingLeft: `${activeDepth * 0.5 + 0.5}em`,
                background: "var(--color-primary)",
                borderRadius: "0.25em",
                fontSize: "0.8125rem",
                whiteSpace: "nowrap",
              }}
            >
              {activeData.data}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </FloatingWindow>
  );
}
