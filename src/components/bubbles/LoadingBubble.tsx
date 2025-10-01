import { TypingBubble } from '@/components';
import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { Avatar } from '../avatars/Avatar';

export type CalledTool = { name?: string } | string;

type LoadingBubbleProps = {
  calledTools?: CalledTool[];
  showAvatar?: boolean;
  avatarLoadingSrc?: string;
  avatarSrc?: string;
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

export const LoadingBubble = (props: LoadingBubbleProps) => (
  <div class="flex justify-start mb-2 items-start animate-fade-in host-container">
    <Show when={props.showAvatar}>
      <Avatar initialAvatarSrc={props.avatarLoadingSrc || props.avatarSrc} />
    </Show>
    <span class="px-4 py-4 ml-2 whitespace-pre-wrap max-w-full chatbot-host-bubble" data-testid="host-bubble">
      <Show when={props.calledTools && props.calledTools.length > 0} fallback={<TypingBubble />}>
        <div class="flex flex-col gap-1">
          <For each={props.calledTools as CalledTool[]}>{(tool) => {
            const name = typeof tool === 'string' ? tool : tool?.name ?? 'tool';
            return (
              <div class="text-sm text-gray-400">
                Calling '{name}' <LoadingDots />
              </div>
            );
          }}</For>
        </div>
      </Show>
    </span>
  </div>
);
