import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./FloatingWindow.module.css";

type Props = {
  children: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  positionKey?: string;
};

function loadPosition(key: string) {
  try {
    const raw = localStorage.getItem(`a-cms:fw:${key}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.x === "number" && typeof data.y === "number" &&
        typeof data.w === "number" && typeof data.h === "number") {
      return data as { x: number; y: number; w: number; h: number };
    }
  } catch {}
  return null;
}

function savePosition(key: string, pos: { x: number; y: number; w: number; h: number }) {
  try {
    localStorage.setItem(`a-cms:fw:${key}`, JSON.stringify(pos));
  } catch {}
}

export default function FloatingWindow({
  children,
  defaultWidth = 400,
  defaultHeight = 300,
  minWidth = 200,
  minHeight = 150,
  className,
  positionKey,
}: Props) {
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = useState(defaultHeight);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0, w: defaultWidth, h: defaultHeight });

  // Apply saved position on mount
  useEffect(() => {
    if (!positionKey) return;
    const saved = loadPosition(positionKey);
    if (saved) {
      setX(saved.x);
      setY(saved.y);
      setWidth(saved.w);
      setHeight(saved.h);
      posRef.current = saved;
    } else {
      posRef.current = { x: 0, y: 0, w: defaultWidth, h: defaultHeight };
    }
  }, []);

  // Keep ref in sync
  posRef.current = { x, y, w: width, h: height };

  const persist = () => {
    if (positionKey) savePosition(positionKey, posRef.current);
  };

  const startDrag = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startPosX = posRef.current.x;
    const startPosY = posRef.current.y;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = startPosX + (e.clientX - startMouseX);
      const newY = startPosY + (e.clientY - startMouseY);
      posRef.current.x = newX;
      posRef.current.y = newY;
      setX(newX);
      setY(newY);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      persist();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const startResize = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startWidth = posRef.current.w;
    const startHeight = posRef.current.h;
    const startPosX = posRef.current.x;
    const startPosY = posRef.current.y;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startMouseX;
      const deltaY = e.clientY - startMouseY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startPosX;
      let newY = startPosY;

      if (direction.includes("e")) {
        newWidth = Math.max(minWidth, startWidth + deltaX);
      }
      if (direction.includes("w")) {
        const requestedWidth = startWidth - deltaX;
        newWidth = Math.max(minWidth, requestedWidth);
        newX = startPosX + (startWidth - newWidth);
      }

      if (direction.includes("s")) {
        newHeight = Math.max(minHeight, startHeight + deltaY);
      }
      if (direction.includes("n")) {
        const requestedHeight = startHeight - deltaY;
        newHeight = Math.max(minHeight, requestedHeight);
        newY = startPosY + (startHeight - newHeight);
      }

      posRef.current = { x: newX, y: newY, w: newWidth, h: newHeight };
      setWidth(newWidth);
      setHeight(newHeight);
      setX(newX);
      setY(newY);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      persist();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className || ""}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${x}px, ${y}px)`,
      }}
      onMouseDown={startDrag}
    >
      <div className={styles.content}>{children}</div>

      <div className={`${styles.resizeHandle} ${styles.resizeN}`} onMouseDown={(e) => startResize(e, "n")} />
      <div className={`${styles.resizeHandle} ${styles.resizeS}`} onMouseDown={(e) => startResize(e, "s")} />
      <div className={`${styles.resizeHandle} ${styles.resizeE}`} onMouseDown={(e) => startResize(e, "e")} />
      <div className={`${styles.resizeHandle} ${styles.resizeW}`} onMouseDown={(e) => startResize(e, "w")} />
      <div className={`${styles.resizeHandle} ${styles.resizeNe}`} onMouseDown={(e) => startResize(e, "ne")} />
      <div className={`${styles.resizeHandle} ${styles.resizeNw}`} onMouseDown={(e) => startResize(e, "nw")} />
      <div className={`${styles.resizeHandle} ${styles.resizeSe}`} onMouseDown={(e) => startResize(e, "se")} />
      <div className={`${styles.resizeHandle} ${styles.resizeSw}`} onMouseDown={(e) => startResize(e, "sw")} />
    </div>
  );
}
