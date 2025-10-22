import { observersConfigType } from './components/Bot';
import { BubbleTheme } from './features/bubble/types';

/* eslint-disable solid/reactivity */
type BotProps = {
  chatflowid: string;
  apiHost?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  chatflowConfig?: Record<string, unknown>;
  observersConfig?: observersConfigType;
  theme?: BubbleTheme;
};

let elementUsed: Element | undefined;

const dispatchBotEvent = (type: 'flowise:open' | 'flowise:close' | 'flowise:toggle') => {
  elementUsed?.dispatchEvent(new CustomEvent(type, { bubbles: true }));
};

export const open = () => dispatchBotEvent('flowise:open');
export const close = () => dispatchBotEvent('flowise:close');
export const toggle = () => dispatchBotEvent('flowise:toggle');

export const initFull = (props: BotProps & { id?: string }) => {
  destroy();
  const fullElement = props.id ? document.getElementById(props.id) : document.querySelector('flowise-fullchatbot');
  if (!fullElement) throw new Error('<flowise-fullchatbot> element not found.');
  Object.assign(fullElement, props);
  elementUsed = fullElement;
};

export const init = (props: BotProps) => {
  destroy();
  const element = document.createElement('flowise-chatbot');
  Object.assign(element, props);
  document.body.appendChild(element);
  elementUsed = element;
};

export const destroy = () => {
  elementUsed?.remove();
};

type Chatbot = {
  initFull: typeof initFull;
  init: typeof init;
  destroy: typeof destroy;
  open: typeof open;
  close: typeof close;
  toggle: typeof toggle;
};

declare const window:
  | {
      Chatbot: Chatbot | undefined;
    }
  | undefined;

export const parseChatbot = () => ({
  initFull,
  init,
  destroy,
  open,
  close,
  toggle,
});

export const injectChatbotInWindow = (bot: Chatbot) => {
  if (typeof window === 'undefined') return;
  window.Chatbot = { ...bot };
};
