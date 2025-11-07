import { createSignal, Show } from 'solid-js';

type Props = {
  label?: string;
  defaultValue?: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
  backgroundColor?: string;
  symbolColor?: string;
  labelInButton?: boolean;
};

export const CheckBox = (props: Props) => {
  const [checked, setChecked] = createSignal(!!props.defaultValue);
  const bg = props.backgroundColor ?? "#2563EB"; // blue-600
  const fg = props.symbolColor ?? "#FFFFFF";

  const border = "border border-gray-300";
  const borderHover = "hover:border-gray-400";
  const borderRadius = "rounded-md";
  const textStyle = "text-sm font-medium text-gray-700 whitespace-nowrap";

  const toggle = () => {
    if (props.disabled) return;
    const next = !checked();
    setChecked(next);
    props.onChange?.(next);
  };

  const Chip = () => (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked()}
      aria-disabled={props.disabled}
      tabIndex={props.disabled ? -1 : 0}
      onClick={toggle}
      class={[
        'inline-flex items-center gap-1 px-2 h-[26px] transition-all duration-200 cursor-pointer select-none',
        borderRadius,
        `${border}`,
        props.disabled ? 'cursor-not-allowed' : '',
        checked() ? 'border-transparent hover:border-transparent' : `bg-transparent ${borderHover}`,
      ].join(' ')}
      style={checked() ? { background: bg, color: fg } : { color: '#374151' }}
    >
      <span class="text-[12px] leading-none font-medium">
        {(props.label? (props.label + ' ') : '') + (checked() ? "✔︎" : "✕")}
      </span>
    </button>
  );

  const Labeled = () => (
    <div class="inline-flex items-center gap-1.5 select-none" role="group" aria-label={props.label ?? 'Checkbox'}>
      <span
        class={[textStyle, props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'].join(' ')}
        role="button"
        tabIndex={props.disabled ? -1 : 0}
        onClick={() => {
          if (!props.disabled) toggle();
        }}
      >
        {props.label ?? ''}
      </span>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked()}
        aria-disabled={props.disabled}
        tabIndex={props.disabled ? -1 : 0}
        onClick={toggle}
        class={[
          'relative inline-flex items-center justify-center',
          'h-4 w-4 transition-all duration-150',
          borderRadius,
          props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          checked() ? 'border-0' : `${border} ${borderHover} bg-transparent`,
        ].join(' ')}
        style={checked() ? { background: bg } : {}}
      >
        <Show when={checked()}>
          <span class="text-[12px] leading-none" style={{ color: fg }} aria-hidden="true">
            ✔︎
          </span>
        </Show>
        <span class="sr-only">{checked() ? 'Checked' : 'Unchecked'}</span>
      </button>
    </div>
  );

  return <Show when={props.labelInButton && !!props.label} fallback={<Labeled />}><Chip /></Show>;
};