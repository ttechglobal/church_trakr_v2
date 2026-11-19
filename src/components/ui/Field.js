'use client'

/**
 * Field — a label that is genuinely connected to its input.
 *
 * Gives screen readers the field's name, makes tapping the label focus the input,
 * and wires hint / error text via aria-describedby. Pass a function as the child to
 * receive the props to spread onto the control:
 *
 *   <Field label="Phone" hint="Include the country code" error={errors.phone}>
 *     {p => <input className="input" type="tel" {...p} value={v} onChange={…} />}
 *   </Field>
 *
 * Or pass a ready-made control as the child and an explicit `htmlFor` that matches its id.
 */
import { useId } from 'react'

export default function Field({ label, hint, error, required = false, htmlFor, className, children }) {
  const autoId = useId()
  const id = htmlFor ?? autoId
  const hintId = hint ? `${id}-hint` : undefined
  const errId  = error ? `${id}-err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined

  const control = typeof children === 'function'
    ? children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required: required || undefined })
    : children

  return (
    <div className={className}>
      <label htmlFor={id} className="input-label">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      {control}
      {hint && !error && <p id={hintId} className="field-hint">{hint}</p>}
      {error && <p id={errId} className="field-error" role="alert">{error}</p>}
    </div>
  )
}
