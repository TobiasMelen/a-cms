import { forwardRef } from "react";
import type { ComponentProps } from "react";
import styles from "./Input.module.css";
import { cn } from "../../../utils/cn";

export default forwardRef<
  HTMLInputElement,
  ComponentProps<"input"> & { placeholder: string; highlighted?: boolean }
>(function Input(
  { placeholder, className, highlighted, ...props }: ComponentProps<"input"> & { placeholder: string; highlighted?: boolean },
  ref,
) {
  return (
    <div className={cn(styles.wrapper, highlighted && styles.highlighted, className)} data-placeholder={placeholder}>
      <input
        {...props}
        ref={ref}
        className={cn(styles.input, highlighted && styles.highlighted)}
        placeholder=" "
      />
    </div>
  );
});
