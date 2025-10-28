import { createSignal, splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';

type ShortTextInputProps = {
  ref: HTMLInputElement | HTMLTextAreaElement | undefined;
  onInput: (value: string) => void;
  fontSize?: number;
  disabled?: boolean;
  isFullPage?: boolean;
} & Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onInput'>;

const DEFAULT_HEIGHT = 56;

export const ShortTextInput = (props: ShortTextInputProps) => {
  const [local, others] = splitProps(props, ['ref', 'onInput']);
  const [height, setHeight] = createSignal(56);

  // @ts-expect-error: unknown type
  const handleInput = (e) => {
    if (props.ref) {
      if (e.currentTarget.value === '') {
        // reset height when value is empty
        setHeight(DEFAULT_HEIGHT);
      } else {
        setHeight(e.currentTarget.scrollHeight - 24);
      }
      e.currentTarget.scrollTo(0, e.currentTarget.scrollHeight);
      local.onInput(e.currentTarget.value);
    }
  };

  // @ts-expect-error: unknown type
  const handleKeyDown = (e) => {
    // Handle Shift + Enter new line
    if (e.keyCode == 13 && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.value += '\n';
      handleInput(e);
    }

    // 백스페이스 처리(버블 단계)
    if (e.key === 'Backspace') {
      if (!e.currentTarget.matches(':focus')) {
        // 포커스 보장
        e.currentTarget.focus();
      }
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }
  };

  return (
    <textarea
      ref={(el) => {
        // 사용자 ref 호환
        const assign = (node: HTMLTextAreaElement | null) => {
          if (typeof props.ref === 'function') props.ref(node as any);
          else if (props.ref) (props.ref as any) = node;
        };
        assign(el);

        if (el) {
          // keydown 캡처 단계에서 Backspace 전파 차단
          const keydownCapture = (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
              // 포커스 보장
              if (document.activeElement !== el) el.focus();
              e.stopPropagation();
              // preventDefault는 하지 않음(삭제 동작 허용)
            }
          };
          el.addEventListener('keydown', keydownCapture, { capture: true });

          // beforeinput 캡처 단계에서 deleteContentBackward 전파 차단
          const beforeInputCapture = (e: Event) => {
            const ie = e as InputEvent;
            if ((ie as any).inputType === 'deleteContentBackward') {
              e.stopPropagation();
            }
          };
          el.addEventListener('beforeinput', beforeInputCapture as EventListener, { capture: true });

          // 클린업
          return () => {
            el.removeEventListener('keydown', keydownCapture, { capture: true } as any);
            el.removeEventListener('beforeinput', beforeInputCapture as EventListener, { capture: true } as any);
          };
        }
      }}
      class={`focus:outline-none bg-transparent px-4 ${props.isFullPage === false ? 'py-3 h-[50px] min-h-[50px] max-h-[50px] overflow-y-auto' : 'py-4 min-h-[56px] max-h-[128px]'} flex-1 w-full text-input disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 `}
      disabled={props.disabled}
      style={{
        'font-size': props.fontSize ? `${props.fontSize}px` : '16px',
        resize: 'none',
        height: !props.isFullPage ? '50px' : `${props.value !== '' ? height() : DEFAULT_HEIGHT}px`,
      }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      {...others}
    />
  );
};
