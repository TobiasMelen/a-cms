import { forwardRef } from "react";
import type { ComponentProps } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Button.module.css";

type Props<
  T extends
    | keyof React.JSX.IntrinsicElements
    | React.JSXElementConstructor<any>,
> = ComponentProps<T> & {
  variant?: "primary" | "secondary" | "success" | "danger";
  loading?: boolean
};

export const Button = forwardRef<HTMLButtonElement, Props<"button">>(
  function Button({ variant, ...props }, ref) {
    return (
      <button
        ref={ref}
        {...props}
        className={cn(
          styles.button,
          variant && styles[variant],
          props.loading && styles.loading,
          props.className,
        )}
      />
    );
  },
);

export const LinkButton = forwardRef<HTMLAnchorElement, Props<"a">>(
  function LinkButton({ variant, ...props }, ref) {
    return (
      <a
        ref={ref}
        {...props}
        className={cn(
          styles.button,
          variant && styles[variant],
          props.loading && styles.loading,
          props.className,
        )}
      />
    );
  },
);
