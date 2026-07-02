import { createSignal, splitProps, createEffect } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';

type ShortTextInputProps = {
  ref: HTMLInputElement | HTMLTextAreaElement | undefined;
  onInput: (value: string) => void;
  onPasteFiles?: (files: File[]) => void;
  fontSize?: number;
  disabled?: boolean;
  isFullPage?: boolean;
  inputHeight?: number;
} & Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onInput'>;

const FULL_DEFAULT_HEIGHT = 56;
const BUBBLE_DEFAULT_HEIGHT = 50;

export const ShortTextInput = (props: ShortTextInputProps) => {
  // value 는 스프레드({...others})에서 제외한다. 조합(IME) 중 다른 prop(disabled 등) 변경으로
  // 스프레드가 재적용될 때 stale 한 value 가 DOM 에 덮어써지는 것을 막기 위해 직접 동기화한다.
  const [local, others] = splitProps(props, ['ref', 'onInput', 'onPasteFiles', 'value']);
  const getDefaultHeight = () => props.inputHeight ?? (props.isFullPage ? FULL_DEFAULT_HEIGHT : BUBBLE_DEFAULT_HEIGHT);
  const [height, setHeight] = createSignal(getDefaultHeight());
  let textareaRef: HTMLTextAreaElement | undefined;
  let isComposing = false;

  const calculateHeight = (el: HTMLTextAreaElement) => {
    const defH = getDefaultHeight();
    if (el.value === '') {
      // 값이 없으면 기본 높이로 복원.
      el.style.height = `${defH}px`;
      setHeight(defH);
    } else {
      // 먼저 기본 높이로 줄여 scrollHeight 를 정확히 측정한 뒤, 최종 높이를 직접(권위적으로) 적용한다.
      // 반응형 style 은 height() 시그널이 '변할 때만' 재실행되므로, 같은 줄에서 타이핑 시
      // (scrollHeight 불변) DOM 이 측정용 defH 에 멈춰 한 줄로 접히는 문제를 방지한다.
      el.style.height = `${defH}px`;
      const newHeight = Math.max(defH, el.scrollHeight);
      el.style.height = `${newHeight}px`;
      setHeight(newHeight);
    }
  }

  // @ts-expect-error: unknown type
  const handleInput = (e) => {
    if (props.ref) {
      calculateHeight(e.currentTarget);
      e.currentTarget.scrollTo(0, e.currentTarget.scrollHeight);
      // 조합 중에는 propagate 하지 않는다. compositionend 에서 최종값을 전달.
      if (!isComposing) local.onInput(e.currentTarget.value);
    }
  };

  const handleCompositionStart = () => {
    isComposing = true;
  };

  // @ts-expect-error: unknown type
  const handleCompositionEnd = (e) => {
    isComposing = false;
    if (props.ref) local.onInput(e.currentTarget.value);
  };

  // 외부(전송 후 초기화, 프롬프트 버튼, 입력 히스토리 등)에서 value 가 바뀔 때만 DOM 에 동기화한다.
  // 조합(IME) 중에는 절대 덮어쓰지 않는다 — 입력이 리셋되어 최근 글자만 남는 문제를 방지.
  createEffect(() => {
    const next = (local.value ?? '') as string; // 반응형 의존성
    if (!textareaRef || isComposing) return;
    if (textareaRef.value !== next) {
      textareaRef.value = next;
      calculateHeight(textareaRef);
    }
  });

  // @ts-expect-error: unknown type
  const handleKeyDown = (e) => {
    // Handle Shift + Enter new line
    if (e.keyCode == 13 && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.value += '\n';
      handleInput(e);
	  return;
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
        textareaRef = el;
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
      class={`focus:outline-none bg-transparent ${props.isFullPage ? 'px-4' : 'px-2'} ${
        props.inputHeight ? `py-3 max-h-[128px]` : (props.isFullPage ? 'py-4 min-h-[56px] max-h-[128px]' : 'py-3 min-h-[50px] max-h-[128px]')
      } flex-1 w-full text-input disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 `}
      disabled={props.disabled}
      style={{
        'font-size': props.fontSize ? `${props.fontSize}px` : '16px',
        resize: 'none',
        height: `${height()}px`,
        ...(props.inputHeight ? { 'min-height': `${props.inputHeight}px` } : {}),
      }}
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData?.files || []);
        const imageFiles = files.filter((f) => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          e.preventDefault();
          local.onPasteFiles?.(imageFiles);
        }
      }}
      {...others}
    />
  );
};
