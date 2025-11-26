import { createSignal, Show, splitProps, onCleanup, createEffect } from 'solid-js';
import styles from '../../../assets/index.css';
import { BubbleButton } from './BubbleButton';
import { BubbleParams } from '../types';
import { Bot, BotProps } from '../../../components/Bot';
import Tooltip from './Tooltip';
import { getBubbleButtonSize } from '@/utils';
import theme from 'tailwindcss/defaultTheme';

const defaultButtonColor = '#3B81F6';
const defaultIconColor = 'white';

export type BubbleProps = BotProps & BubbleParams;

export const Bubble = (props: BubbleProps) => {
  const [bubbleProps] = splitProps(props, ['theme']);

  const [isBotOpened, setIsBotOpened] = createSignal(false);
  const [isBotStarted, setIsBotStarted] = createSignal(false);
  const [buttonPosition, setButtonPosition] = createSignal({
    bottom: bubbleProps.theme?.button?.bottom ?? 20,
    right: bubbleProps.theme?.button?.right ?? 20,
  });

  const loadBot = () => {
	  if (!isBotStarted()) {
		  setIsBotStarted(true);
	  }
  }

  const openBot = () => {
    if (!isBotStarted()) setIsBotStarted(true);
    setIsBotOpened(true);
    window.dispatchEvent(new CustomEvent('flowise:state-change', { detail: { isOpen: true } }));
  };

  const closeBot = () => {
    setIsBotOpened(false);
    window.dispatchEvent(new CustomEvent('flowise:state-change', { detail: { isOpen: false } }));
  };

  const toggleBot = () => {
    isBotOpened() ? closeBot() : openBot();
  };


  onCleanup(() => {
    setIsBotStarted(false);
  });

  const buttonSize = getBubbleButtonSize(props.theme?.button?.size); // Default to 48px if size is not provided
  const buttonBottom = props.theme?.button?.bottom ?? 20;
  const chatWindowBottom = buttonBottom + buttonSize + 10; // Adjust the offset here for slight shift

  // Add viewport meta tag dynamically
  createEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, interactive-widget=resizes-content';
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  });

  // eslint-disable-next-line solid/reactivity
  const hideButton = (bubbleProps.theme as any)?.button?.hideButton ?? false;

  // eslint-disable-next-line solid/reactivity
  const externalTriggerElementId: string | undefined = (bubbleProps.theme as any)?.button?.externalTriggerElementId;

  const disableButton = () => {
    if (!externalTriggerElementId) return;
    try {
      const el = document.querySelector(`#${externalTriggerElementId}`);
      if (el) el.classList.add('disabled');
    } catch (error) { /* ignored */ }

  }

  createEffect(() => {
    const onOpen = () => openBot();
    const onClose = () => closeBot();
    const onToggle = () => toggleBot();
	  const onLoad = () => loadBot();
    window.addEventListener('flowise:open', onOpen);
    window.addEventListener('flowise:close', onClose);
    window.addEventListener('flowise:toggle', onToggle);
	  window.addEventListener('flowise:load', onLoad);
    return () => {
      window.removeEventListener('flowise:open', onOpen);
      window.removeEventListener('flowise:close', onClose);
      window.removeEventListener('flowise:toggle', onToggle);
	    window.removeEventListener('flowise:load', onLoad);
    };
  });

  createEffect(() => {
    if (!externalTriggerElementId) return;
    const el = document.getElementById(externalTriggerElementId);
    if (el) {
      const handler = () => {
        toggleBot();
      };
      el.addEventListener('click', handler);
      return () => el.removeEventListener('click', handler);
    }
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest(`#${externalTriggerElementId}`);
      if (el) {
        toggleBot();
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  });

  // eslint-disable-next-line solid/reactivity
  const autoOpen = bubbleProps.theme?.button?.autoWindowOpen?.autoOpen ?? false;
  // eslint-disable-next-line solid/reactivity
  const autoOpenOnMobile = bubbleProps.theme?.button?.autoWindowOpen?.autoOpenOnMobile ?? false;
  // eslint-disable-next-line solid/reactivity
  const openDelay = bubbleProps.theme?.button?.autoWindowOpen?.openDelay ?? 2;

  if (externalTriggerElementId) {
    createEffect(() => {
      if (autoOpen && (autoOpenOnMobile || window.innerWidth > 640)) {
        const delayInSeconds = openDelay ?? 2; // Default to 2 seconds if openDelay is not defined
        const delayInMilliseconds = delayInSeconds * 1000; // Convert seconds to milliseconds
        setTimeout(() => {
          openBot();
        }, delayInMilliseconds);
      }
    });
  }

  // eslint-disable-next-line solid/reactivity
  const showTooltip = bubbleProps.theme?.tooltip?.showTooltip ?? false;

  return (
    <>
      <Show when={props.theme?.customCSS}>
        <style>{props.theme?.customCSS}</style>
      </Show>
      <style>{styles}</style>
      <Show when={!hideButton}>
        <Tooltip
          showTooltip={showTooltip && !isBotOpened()}
          position={buttonPosition()}
          buttonSize={buttonSize}
          tooltipMessage={bubbleProps.theme?.tooltip?.tooltipMessage}
          tooltipBackgroundColor={bubbleProps.theme?.tooltip?.tooltipBackgroundColor}
          tooltipTextColor={bubbleProps.theme?.tooltip?.tooltipTextColor}
          tooltipFontSize={bubbleProps.theme?.tooltip?.tooltipFontSize} // Set the tooltip font size
        />
      </Show>
      <Show when={!hideButton}>
        <BubbleButton
          {...bubbleProps.theme?.button}
          toggleBot={toggleBot}
          isBotOpened={isBotOpened()}
          setButtonPosition={setButtonPosition}
          dragAndDrop={bubbleProps.theme?.button?.dragAndDrop ?? false}
          autoOpen={autoOpen}
          openDelay={openDelay}
          autoOpenOnMobile={autoOpenOnMobile}
        />
      </Show>
      <div
        part="bot"
        style={{
          overflow: 'hidden',
          height: bubbleProps.theme?.chatWindow?.height ? `${bubbleProps.theme?.chatWindow?.height.toString()}px` : `calc(100% - ${bubbleProps.theme?.chatWindow?.antiHeight?.toString() || '50'}px)`,
          width: bubbleProps.theme?.chatWindow?.width ? `${bubbleProps.theme?.chatWindow?.width.toString()}px` : undefined,
          transition: isBotOpened() ? 'opacity 150ms ease-out' : 'opacity 300ms ease-in',
          'transform-origin': 'bottom right',
          transform: 'none',
          'box-shadow': '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
          'background-color': bubbleProps.theme?.chatWindow?.backgroundColor || '#ffffff',
          'background-image': bubbleProps.theme?.chatWindow?.backgroundImage ? `url(${bubbleProps.theme?.chatWindow?.backgroundImage})` : 'none',
          'background-size': 'cover',
          'background-position': 'center',
          'background-repeat': 'no-repeat',
          border: bubbleProps.theme?.border,
          'border-radius':
            typeof bubbleProps.theme?.borderRadius === 'number'
              ? `${bubbleProps.theme?.borderRadius}px`
              : bubbleProps.theme?.borderRadius || undefined,
          'z-index': 42424242,
          bottom: hideButton
            ? `${buttonPosition().bottom}px`
            : `${Math.min(buttonPosition().bottom + buttonSize + 10, window.innerHeight - chatWindowBottom)}px`,
          right: `${Math.max(0, Math.min(buttonPosition().right, window.innerWidth - (bubbleProps.theme?.chatWindow?.width ?? 410) - 10))}px`,
        }}
        class={
          `fixed sm:right-5 rounded-lg w-full sm:w-[400px]` +
          (isBotOpened() ? ' opacity-1' : ' opacity-0 pointer-events-none') +
          ` bottom-${chatWindowBottom}px`
        }
      >
        <Show when={isBotStarted()}>
          <div class="relative h-full">
            <Bot
              backgroundColor={bubbleProps.theme?.chatWindow?.backgroundColor}
              formBackgroundColor={bubbleProps.theme?.form?.backgroundColor}
              formTextColor={bubbleProps.theme?.form?.textColor}
              badgeBackgroundColor={bubbleProps.theme?.chatWindow?.backgroundColor}
              bubbleBackgroundColor={bubbleProps.theme?.button?.backgroundColor ?? defaultButtonColor}
              bubbleTextColor={bubbleProps.theme?.button?.iconColor ?? defaultIconColor}
              showTitle={bubbleProps.theme?.chatWindow?.showTitle}
              showAgentMessages={bubbleProps.theme?.chatWindow?.showAgentMessages}
              title={bubbleProps.theme?.chatWindow?.title}
              titleAvatarSrc={bubbleProps.theme?.chatWindow?.titleAvatarSrc}
              titleTextColor={bubbleProps.theme?.chatWindow?.titleTextColor}
              titleBackgroundColor={bubbleProps.theme?.chatWindow?.titleBackgroundColor}
              welcomeMessage={bubbleProps.theme?.chatWindow?.welcomeMessage}
              initialMessage={bubbleProps.theme?.chatWindow?.initialMessage}
              errorMessage={bubbleProps.theme?.chatWindow?.errorMessage}
              poweredByTextColor={bubbleProps.theme?.chatWindow?.poweredByTextColor}
              textInput={bubbleProps.theme?.chatWindow?.textInput}
              botMessage={bubbleProps.theme?.chatWindow?.botMessage}
              userMessage={bubbleProps.theme?.chatWindow?.userMessage}
              feedback={bubbleProps.theme?.chatWindow?.feedback}
              fontSize={bubbleProps.theme?.chatWindow?.fontSize}
              footer={bubbleProps.theme?.chatWindow?.footer}
              sourceDocsTitle={bubbleProps.theme?.chatWindow?.sourceDocsTitle}
              starterPrompts={bubbleProps.theme?.chatWindow?.starterPrompts}
              starterPromptFontSize={bubbleProps.theme?.chatWindow?.starterPromptFontSize}
              chatflowid={props.chatflowid}
              chatflowConfig={props.chatflowConfig}
              apiHost={props.apiHost}
              onRequest={props.onRequest}
              observersConfig={props.observersConfig}
              clearChatOnReload={bubbleProps.theme?.chatWindow?.clearChatOnReload}
              disclaimer={bubbleProps.theme?.disclaimer}
              dateTimeToggle={bubbleProps.theme?.chatWindow?.dateTimeToggle}
              renderHTML={props.theme?.chatWindow?.renderHTML}
			  openBot={openBot}
              closeBot={closeBot}
              showCloseButton={bubbleProps.theme?.chatWindow?.showCloseButton}
              useObserverClose={bubbleProps.theme?.chatWindow?.useObserverClose}
              gptModels={bubbleProps.theme?.chatWindow?.gptModels}
              mdmModules={bubbleProps.theme?.chatWindow?.mdmModules}
              closeButtonColor={bubbleProps.theme?.chatWindow?.closeButtonColor}
              fastMode={bubbleProps.theme?.chatWindow?.fastMode}
              disableButton={disableButton}
            />
          </div>
        </Show>
      </div>
    </>
  );
};
