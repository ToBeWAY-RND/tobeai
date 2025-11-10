import { createSignal } from 'solid-js';

type Props = {
  label?: string;
  defaultValue?: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
  onColor?: string;
  offColor?: string;
};

export const Slider = (props: Props) => {
  const [checked, setChecked] = createSignal(!!props.defaultValue);
  const onColor = props.onColor ?? '#2563EB'; // on color (default blue)
  const offColor = props.offColor ?? '#AFAFAF'; // off color (default gray)

  const textStyle = 'text-sm font-medium text-gray-700 whitespace-nowrap';

  const toggle = () => {
    if (props.disabled) return;
    const next = !checked();
    setChecked(next);
    props.onChange?.(next);
  };

  return (
    <div class="inline-flex items-center gap-1.5 select-none" role="group" aria-label={props.label ?? ''}>
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
        role="switch"
        aria-checked={checked()}
        aria-disabled={props.disabled}
        tabIndex={props.disabled ? -1 : 0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (props.disabled) return;
        }}
        class={[
          'relative inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1',
          'transition-all duration-150',
          props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ].join(' ')}
        aria-label={checked() ? 'On' : 'Off'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="20" viewBox="0 0 36 20" fill="none" aria-hidden="true">
          <rect
            x="1"
            y="4"
            width="34"
            height="12"
            rx="6"
            fill={checked() ? onColor : offColor}
            stroke={checked() ? onColor : offColor}
            stroke-width="2"
            style={{ transition: 'fill 150ms ease, stroke 150ms ease' }}
          />
          <g
            style={{
              transform: `translateX(${checked() ? 16 : 0}px)`,
              transition: 'transform 150ms ease',
            }}
          >
            <rect x="1" y="1" width="18" height="18" rx="9" fill="white" stroke={checked() ? onColor : offColor} stroke-width="2" />
          </g>
        </svg>
        <span class="sr-only">{checked() ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
};