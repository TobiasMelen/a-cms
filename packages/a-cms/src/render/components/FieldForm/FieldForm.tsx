//@ts-expect-error Astro navigation has issues with typescript
import { navigate } from "astro:transitions/client";
import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import Input from "../Input/Input";
import { camelCaseToTitle } from "../../../utils/format";
import { Button } from "../Button/Button";
import FloatingWindow from "../FloatingWindow/FloatingWindow";
import { useApiClient } from "../../../api/client";

type Version = {
  versionId: string;
  published: boolean;
  updated: string;
  publishedDate: string | null;
  contentId: string;
};

type PropKey = { key: string; optional: boolean };

type Props = {
  pageName: string;
  pageSlug: string;
  pagePathPrefix: string;
  pageId: string;
  versionId: string | null;
  currentVersionId: string;
  templateId: string;
  props: Record<string, string>;
  propKeys: PropKey[];
  versions: Version[];
  className?: string;
};

const TextLink = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    style={{
      background: "none",
      border: "none",
      color: "var(--color-text-secondary)",
      cursor: "pointer",
      fontSize: "0.8125rem",
      textDecoration: "underline",
      padding: 0,
    }}
  >
    {children}
  </button>
);

export default function FieldForm({
  pageName,
  pageSlug,
  pagePathPrefix,
  pageId,
  versionId,
  currentVersionId,
  templateId,
  props: pageProps,
  propKeys,
  versions,
  className,
}: Props) {
  const api = useApiClient();

  const defaultValues = {
    title: pageName,
    slug: pageSlug,
    props: propKeys.reduce(
      (acc, { key }) => {
        acc[key] = pageProps[key] ?? "";
        return acc;
      },
      {} as Record<string, string>,
    ),
  };

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues,
  });

  const [activeField, setActiveField] = useState<string | null>(null);
  const activeFieldRef = useRef(activeField);
  activeFieldRef.current = activeField;

  useEffect(() => {
    reset(defaultValues);
  }, [pageId, versionId]);

  // Re-dispatch targeting after navigation so template Field stays highlighted
  useEffect(() => {
    const onPageLoad = () => {
      if (activeFieldRef.current) {
        document.dispatchEvent(
          new CustomEvent("a-cms:field-focus", { detail: { field: activeFieldRef.current } }),
        );
      }
    };
    document.addEventListener("astro:page-load", onPageLoad);
    return () => document.removeEventListener("astro:page-load", onPageLoad);
  }, []);

  const propKeySet = propKeys.map((p) => p.key).join(",");

  useEffect(() => {
    const formFields = new Set(propKeySet ? propKeySet.split(",") : []);
    const onEdit = (e: Event) => {
      const { field, value } = (e as CustomEvent<{ field: string; value: string }>).detail;
      if (formFields.has(field)) setValue(`props.${field}`, value);
    };
    const onFocus = (e: Event) => {
      const { field } = (e as CustomEvent<{ field: string }>).detail;
      if (formFields.has(field)) setActiveField(field);
    };
    const onBlur = (e: Event) => {
      const { field } = (e as CustomEvent<{ field: string }>).detail;
      if (activeField === field) setActiveField(null);
      clearScheduledUpdate();
      saveRef.current().catch((err) => console.error("Autosave failed:", err));
    };
    document.addEventListener("a-cms:field-edit", onEdit);
    document.addEventListener("a-cms:field-focus", onFocus);
    document.addEventListener("a-cms:field-blur", onBlur);
    return () => {
      document.removeEventListener("a-cms:field-edit", onEdit);
      document.removeEventListener("a-cms:field-focus", onFocus);
      document.removeEventListener("a-cms:field-blur", onBlur);
    };
  }, [propKeySet, activeField]);

  const scheduledUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScheduledUpdate = () => {
    if (scheduledUpdateRef.current) {
      clearTimeout(scheduledUpdateRef.current);
    }
  };

  const saveForm = async () => {
    const current = getValues();
    if (JSON.stringify(current) === JSON.stringify(defaultValues)) return;

    const currentVersion = versions.find((v) => v.versionId === versionId);
    const canUpdate = currentVersion ? !currentVersion.publishedDate : false;

    const payload = canUpdate
      ? { id: pageId, templateId, versionId: versionId ?? undefined, ...current }
      : { id: pageId, templateId, ...current };

    const res = await api.save.$post({ json: payload });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    const newVersionId = await res.text();
    navigate(`?version=${encodeURIComponent(newVersionId)}`);
  };

  const saveRef = useRef(saveForm);
  saveRef.current = saveForm;

  const handleChange = () => {
    clearScheduledUpdate();
    scheduledUpdateRef.current = setTimeout(() => {
      saveForm().catch((err) => {
        console.error("Autosave failed:", err);
      });
    }, 500);
  };

  const handleFieldFocus = (field: string) => {
    setActiveField(field);
    document.dispatchEvent(
      new CustomEvent("a-cms:field-focus", { detail: { field } }),
    );
  };

  const handleFieldBlur = (field: string) => {
    if (activeField === field) setActiveField(null);
    document.dispatchEvent(
      new CustomEvent("a-cms:field-blur", { detail: { field } }),
    );
  };

  const handleBlur = () => {
    clearScheduledUpdate();
    if (!isDirtyRef.current) return;
    saveForm().catch((err) => {
      console.error("Autosave failed:", err);
    });
  };

  const onSubmit = async () => {
    clearScheduledUpdate();

    try {
      await saveForm();

      if (!versionId) {
        alert("Cannot publish: no draft version available");
        return;
      }

      const res = await api.publish.$post({
        json: { versionId, contentId: pageId },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      navigate(window.location.href);
    } catch (err) {
      alert(
        "Publish failed: " + (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const currentVersion = versions.find((v) => v.versionId === currentVersionId);
  const isCurrentPublished = currentVersion?.published ?? false;
  const hasPublishedDate = currentVersion?.publishedDate ?? false;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this version?")) return;

    try {
      const res = await api.delete.$post({
        json: { versionId: currentVersionId },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      navigate(window.location.pathname);
    } catch (err) {
      alert(
        "Delete failed: " + (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const handleUnpublish = async () => {
    if (!confirm("Are you sure you want to unpublish this version?")) return;

    try {
      const res = await api.unpublish.$post({
        json: { versionId: currentVersionId },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      navigate(`?version=${encodeURIComponent(currentVersionId)}`);
    } catch (err) {
      alert(
        "Unpublish failed: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const getPublishButtonText = () => {
    if (isCurrentPublished) return "Published";
    if (hasPublishedDate) return "Republish";
    return "Publish";
  };

  const getPublishButtonVariant = () => {
    if (isCurrentPublished) return undefined;
    if (!hasPublishedDate) return "success";
    return undefined;
  };

  const latestPublishedDate = versions.reduce((max, v) => {
    if (!v.publishedDate) return max;
    return v.publishedDate > max ? v.publishedDate : max;
  }, "");

  return (
    <FloatingWindow
      defaultWidth={500}
      defaultHeight={400}
      className={className}
      positionKey="field-form"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1em",
        }}
      >
        <div style={{ flex: 1, marginRight: "1em" }}>
          <input
            {...register("title", { onChange: handleChange })}
            type="text"
            onFocus={() => handleFieldFocus("title")}
            onBlur={(e) => { handleFieldBlur("title"); handleBlur(); }}
            style={{
              fontSize: "1.3rem",
              fontWeight: "bold",
              margin: 0,
              padding: 0,
              border: "none",
              background: "transparent",
              color: "var(--color-text)",
              display: "block",
              outline: "none",
              width: "100%",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--color-text-secondary)", userSelect: "none", whiteSpace: "pre" }}>
              /{pagePathPrefix}{pagePathPrefix ? "/" : ""}
            </span>
            <input
              {...register("slug", { onChange: handleChange })}
              type="text"
              onFocus={() => handleFieldFocus("slug")}
              onBlur={(e) => { handleFieldBlur("slug"); handleBlur(); }}
              style={{
                fontSize: "inherit",
                margin: 0,
                padding: 0,
                border: "none",
                background: "transparent",
                color: "var(--color-text)",
                outline: "none",
                width: "100%",
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <select
            id="version-select"
            value={currentVersionId}
            onChange={(e) =>
              navigate(`?version=${encodeURIComponent(e.target.value)}`)
            }
            style={{
              padding: "0.25em 0.5em",
              borderRadius: "0.25em",
              border: "1px solid var(--color-border)",
              background: "var(--color-background)",
              color: "var(--color-text)",
              fontSize: "0.8125em",
            }}
          >
            {versions.map((v) => {
              const status = v.published
                ? "Published"
                : v.publishedDate
                  ? "Previous"
                  : latestPublishedDate && v.updated < latestPublishedDate
                    ? "Old Draft"
                    : "Draft";
              return (
                <option key={v.versionId} value={v.versionId}>
                  {status} - {new Date(v.updated).toLocaleString()}
                </option>
              );
            })}
          </select>
          {!isCurrentPublished && (
            <TextLink onClick={handleDelete}>Delete version</TextLink>
          )}
          {isCurrentPublished && (
            <TextLink onClick={handleUnpublish}>Unpublish</TextLink>
          )}
        </div>
      </div>

      <form
        id="edit-form"
        style={{ flex: "1", display: "flex", flexDirection: "column" }}
        onSubmit={handleSubmit(onSubmit)}
      >
        <div style={{ flex: "1" }}>
          {propKeys.map(({ key, optional }) => (
            <div
              key={key}
              style={{ position: "relative", marginBottom: "1.5em" }}
            >
              <Input
                {...register(`props.${key}`, { onChange: handleChange })}
                placeholder={`${camelCaseToTitle(key)}${optional ? " (optional)" : ""}`}
                onFocus={() => handleFieldFocus(key)}
                onBlur={(e) => { handleFieldBlur(key); handleBlur(); }}
                highlighted={activeField === key}
              />
            </div>
          ))}
        </div>
        <Button
          type="submit"
          variant={getPublishButtonVariant()}
          disabled={isCurrentPublished}
          loading={isSubmitting}
          style={{ marginTop: "0.5em" }}
        >
          {getPublishButtonText()}
        </Button>
      </form>
    </FloatingWindow>
  );
}
