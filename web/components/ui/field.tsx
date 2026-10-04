/**
 * Field primitives for the forms. The repo has no shadcn Field set, so this is
 * the documented fallback composition: a bound label, the control, and an inline
 * error paragraph wired with aria-invalid on the control and role="alert" on the
 * message. The control class is the same one the Actions panel bid input uses.
 */

export const inputClass =
  "w-full rounded-control border border-hairline-strong bg-surface px-3 py-2 font-mono text-body text-text placeholder:text-muted focus-visible:border-brass focus-visible:outline-none";

interface FieldLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  /** Optional helper text that sits under the label, muted. */
  hint?: string;
}

/** A label bound to its control by id. */
export function FieldLabel({ htmlFor, children, hint }: FieldLabelProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block font-mono text-label uppercase tracking-[0.14em] text-muted"
      >
        {children}
      </label>
      {hint ? <p className="mt-1 font-mono text-small text-muted">{hint}</p> : null}
    </div>
  );
}

interface FieldErrorProps {
  /** Id of the control this message describes. */
  id: string;
  children: React.ReactNode | null;
}

/**
 * The inline error line. It stays in the DOM only when there is a message, and
 * role="alert" makes a screen reader announce it as soon as it appears.
 */
export function FieldError({ id, children }: FieldErrorProps) {
  if (!children) return null;

  return (
    <p id={id} role="alert" className="mt-1.5 text-small text-destructive">
      {children}
    </p>
  );
}