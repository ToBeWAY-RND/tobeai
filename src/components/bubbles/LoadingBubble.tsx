import { TypingBubble } from '@/components';
import { For, Show, createSignal, onCleanup, onMount, createMemo } from 'solid-js';
// 도구별 로딩 메시지는 호스트 페이지(JSP)의 renderSummaryText 옵저버에서 관리
import { Avatar } from '../avatars/Avatar';
import { isMobile } from '@/utils/isMobileSignal';

type LoadingBubbleProps = {
  calledTools?: any[];
  showAvatar?: boolean;
  avatarLoadingSrc?: string;
  avatarSrc?: string;
  isAppending?: boolean;
  renderSummaryText?: (grouped: Map<string, any[]>) => string[] | undefined;
};

const LoadingDots = () => {
  const [dots, setDots] = createSignal(0);
  let intervalId: any;
  onMount(() => {
    intervalId = setInterval(() => {
      setDots((d) => ((d + 1) % 4));
    }, 500);
  });
  onCleanup(() => clearInterval(intervalId));
  return <span>{'.'.repeat(dots())}</span>;
};

export const LoadingBubble = (props: LoadingBubbleProps) => {
  // 도구 호출 목록을 이름별로 그룹화
  const grouped = createMemo(() => {
    const arr = Array.isArray(props.calledTools) ? props.calledTools : [];
    const map = new Map<string, any[]>();
    for (const t of arr) {
      const key = t?.name ?? 'tool';
      const item = map.get(key) ?? [];
      item.push(t);
      map.set(key, item);
    }
    return map;
  });

  // 로딩 중 표시할 요약 텍스트 — 호스트 페이지의 renderSummaryText 콜백 우선 사용
  const summaryText = createMemo<string[]>(() => {
    if (typeof props.renderSummaryText === 'function') {
      const result = props.renderSummaryText(grouped());
      if (Array.isArray(result)) return result;
    }
    // 기본값: 도구 이름만 표시
    const g = grouped();
    if (!g.size) return [];
    const parts: string[] = [];
    for (const [name] of g) {
      parts.push(`Calling '${name}'`);
    }
    return parts;
  });

  return (
  <div class="flex justify-start mb-2 items-start animate-fade-in host-container" style={{ 'background-color': 'transparent' }}>
    <Show when={props.showAvatar}>
      <Show when={!props.isAppending} fallback={<div class={(isMobile() ? 'w-6 h-6' : 'w-10 h-10') + ' rounded-full flex-shrink-0'} />}>
        <Avatar initialAvatarSrc={props.avatarLoadingSrc || props.avatarSrc} />
      </Show>
    </Show>
    <span class="px-4 py-4 ml-2 whitespace-pre-wrap max-w-full chatbot-host-bubble" style={{ 'background-color': 'transparent' }} data-testid="host-bubble">
      <Show when={summaryText().length > 0} fallback={<TypingBubble />}>
        <div class="flex flex-col gap-1">
          <For each={summaryText()}>{(tool) => (
              <div class="text-sm text-gray-400">
                {tool} <LoadingDots />
              </div>
          )}</For>
        </div>
      </Show>
    </span>
  </div>
)};
