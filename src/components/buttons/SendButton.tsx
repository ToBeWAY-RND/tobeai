import { Show } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { DeleteIcon, SendIcon } from '../icons';

type SendButtonProps = {
  sendButtonColor?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  disableIcon?: boolean;
  width?: string;
  showCloseButton?: boolean;
  sendButtonSrc?: string;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const SendButton = (props: SendButtonProps) => {
  const iconWidth = props.width || '24px';
  return (
    <button
      type="submit"
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={
        'py-2 justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 chatbot-button ' +
        props.class
      }
      style={{ background: 'transparent', border: 'none' }}
    >
      <Show when={!props.isLoading} fallback={<Spinner class="text-white" />}>
        <Show when={!!props.sendButtonSrc} fallback={<SendIcon color={props.sendButtonColor} width={props.width} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} />}>
          <img
            src={props.sendButtonSrc}
            alt="Send"
            width={iconWidth}
            height={iconWidth}
            class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')}
            style={{ 'object-fit': 'contain' }}
          />
        </Show>
      </Show>
    </button>
  );
};
export const DeleteButton = (props: SendButtonProps) => {
  return (
    <button
      type="submit"
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={
        `py-2 ` + (props.showCloseButton ? 'pl-3 pr-1' : 'px-2') + ` justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 chatbot-button ` +
        (props.showCloseButton ? '' : 'mr-1') +
        props.class
      }
      style={{ background: 'transparent', border: 'none' }}
      title="Reset Chat"
    >
      <Show when={!props.isLoading} fallback={<Spinner class="text-white" />}>
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill={props.sendButtonColor || '#ffffff'}
            d="M17.6498 6.35C16.1998 4.9 14.2098 4 11.9998 4C7.57977 4 4.00977 7.58 4.00977 12C4.00977 16.42 7.57977 20 11.9998 20C15.7298 20 18.8398 17.45 19.7298 14H17.6498C16.8298 16.33 14.6098 18 11.9998 18C8.68977 18 5.99977 15.31 5.99977 12C5.99977 8.69 8.68977 6 11.9998 6C13.6598 6 15.1398 6.69 16.2198 7.78L12.9998 11H19.9998V4L17.6498 6.35Z"
          />
        </svg>
      </Show>
    </button>
  );
};

export const CloseButton = (props: SendButtonProps & { title?: string }) => {
  return (
    <button
      type="button"
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={
        `py-2 ` + (props.showCloseButton ? 'pl-1 pr-2' : 'px-2') + ` justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 chatbot-button ` +
        props.class
      }
      style={{ background: 'transparent', border: 'none' }}
      title={props.title ?? 'Close Chat'}
    >
      <Show when={!props.isLoading} fallback={<Spinner class="text-white" />}>
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill={props.sendButtonColor || '#ffffff'}
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"
          />
        </svg>
      </Show>
    </button>
  );
};

export const Spinner = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  <svg
    {...props}
    class={'animate-spin -ml-1 mr-3 h-5 w-5 ' + props.class}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    data-testid="loading-spinner"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path
      class="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);
