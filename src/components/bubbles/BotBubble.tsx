import { createEffect, Show, createSignal, onMount, For } from 'solid-js';
import { Avatar } from '../avatars/Avatar';
import { Marked } from '@ts-stack/markdown';
import { FeedbackRatingType, sendFeedbackQuery, sendFileDownloadQuery, updateFeedbackQuery } from '@/queries/sendMessageQuery';
import { FileUpload, IAction, MessageType } from '../Bot';
import { CopyToClipboardButton, ThumbsDownButton, ThumbsUpButton } from '../buttons/FeedbackButtons';
import FeedbackContentDialog from '../FeedbackContentDialog';
import { AgentReasoningBubble } from './AgentReasoningBubble';
import { TickIcon, XIcon } from '../icons';
import { SourceBubble } from '../bubbles/SourceBubble';
import { DateTimeToggleTheme } from '@/features/bubble/types';
import { WorkflowTreeView } from '../treeview/WorkflowTreeView';

type Props = {
  message: MessageType;
  chatflowid: string;
  chatId: string;
  apiHost?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  fileAnnotations?: any;
  showAvatar?: boolean;
  avatarSrc?: string;
  avatarLoadingSrc?: string;
  avatarInfoSrc?: string;
  avatarEmptySrc?: string;
  backgroundColor?: string;
  backgroundColorEmphasize?: string;
  textColor?: string;
  chatFeedbackStatus?: boolean;
  fontSize?: number;
  feedbackColor?: string;
  isLoading: boolean;
  dateTimeToggle?: DateTimeToggleTheme;
  showAgentMessages?: boolean;
  sourceDocsTitle?: string;
  renderHTML?: boolean;
  handleActionClick: (elem: any, action: IAction | undefined | null) => void;
  handleSourceDocumentsClick: (src: any) => void;
  observeSourceClick?: (sourceDocuments: any) => void;
  observeMenuClick?: (menu: any) => void;
  observeMastClick?: (mastid: any) => void;
  langCode?: string;
};

const defaultBackgroundColor = '#f7f8ff';
const defaultTextColor = '#303235';
const defaultFontSize = 16;
const defaultFeedbackColor = '#3B81F6';

export const BotBubble = (props: Props) => {
  const [orderedSources, setOrderedSources] = createSignal<any[]>([]);
  const [orderedMenus, setOrderedMenus] = createSignal<any[]>([]);
  const [orderedMastIds, setOrderedMastIds] = createSignal<string[]>([]);
  let botDetailsEl: HTMLDetailsElement | undefined;

  Marked.setOptions({ isNoP: true, sanitize: props.renderHTML !== undefined ? !props.renderHTML : true });

  const [rating, setRating] = createSignal('');
  const [feedbackId, setFeedbackId] = createSignal('');
  const [showFeedbackContentDialog, setShowFeedbackContentModal] = createSignal(false);
  const [copiedMessage, setCopiedMessage] = createSignal(false);
  const [thumbsUpColor, setThumbsUpColor] = createSignal(props.feedbackColor ?? defaultFeedbackColor); // default color
  const [thumbsDownColor, setThumbsDownColor] = createSignal(props.feedbackColor ?? defaultFeedbackColor); // default color

  // Store a reference to the bot message element for the copyMessageToClipboard function
  const [botMessageElement, setBotMessageElement] = createSignal<HTMLElement | null>(null);

  const setBotMessageRef = (el: HTMLSpanElement) => {
    if (el) {
      el.innerHTML = Marked.parse(props.message.message);

      // Apply textColor to all links, headings, and other markdown elements except code
      const textColor = props.textColor ?? defaultTextColor;
      el.querySelectorAll('a, h1, h2, h3, h4, h5, h6, strong, em, blockquote, li').forEach((element) => {
        (element as HTMLElement).style.color = textColor;
      });

      // Code blocks (with pre) get white text
      el.querySelectorAll('pre').forEach((element) => {
        (element as HTMLElement).style.color = '#FFFFFF';
        // Also ensure any code elements inside pre have white text
        element.querySelectorAll('code').forEach((codeElement) => {
          (codeElement as HTMLElement).style.color = '#FFFFFF';
        });
      });

      // Inline code (not in pre) gets green text
      el.querySelectorAll('code:not(pre code)').forEach((element) => {
        (element as HTMLElement).style.color = '#4CAF50'; // Green color
      });

      let prevMenus: any[] = [];
      let prevDocs: any[] = [];
      let prevMastSearches: any[] = [];
      try {
        const chatDetails = localStorage.getItem(`${props.chatflowid}_EXTERNAL`);
        if (chatDetails) {
          const parsedDetails = JSON.parse(chatDetails);
          const history: MessageType[] = parsedDetails.chatHistory || [];
          const currentIdx = history.findIndex((m: MessageType) => m.messageId === props.message.messageId);
          const prev = currentIdx >= 0 ? history.slice(0, currentIdx) : history;
          for (const msg of prev) {
            if (Array.isArray(msg.menus)) prevMenus = prevMenus.concat(msg.menus);
            if (Array.isArray(msg.sourceDocuments)) prevDocs = prevDocs.concat(msg.sourceDocuments);
            if (Array.isArray(msg.mastSearches)) prevMastSearches = prevMastSearches.concat(msg.mastSearches);
          }
        }
      } catch (e) {
        // ignore parsing errors
      }

      const currentDocs = Array.isArray(props.message.sourceDocuments) ? props.message.sourceDocuments : [];

      const orderedCurrentSources: any[] = [];
      const orderedCurrentMenus: any[] = [];
      const orderedCurrentMastIds: string[] = [];
      let currentDocCounter = 0;
      const docNumberMap = new Map<string, number>();

      el.querySelectorAll('a').forEach((link) => {
        let href = link.getAttribute('href') || '';

        let invalid_link = true;
        if (href.startsWith('menu:')) {
          const key = href.substring('menu:'.length).trim();
          const menus = Array.isArray(props.message.menus) ? props.message.menus : [];
          let matched = menus.find((m: any) => m?.menuid === key || m?.menu_alias === key);
          const matchedFromCurrent = matched;
          if (!matched && Array.isArray(prevMenus) && prevMenus.length > 0) {
            matched = prevMenus.find((m: any) => m?.menuid === key || m?.menu_alias === key);
          }

          if (matched) {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              if (!props.isLoading && props.observeMenuClick) {
                props.observeMenuClick(matched);
              }
            });

            link.setAttribute('role', 'button');
            link.style.cursor = props.isLoading ? 'not-allowed' : 'pointer';
            link.style.color = props.textColor ?? defaultTextColor;
            link.style.textDecoration = 'underline';
            link.title = matched.menu_alias !== '' ? matched.menu_alias : matched.menuid;

            const img = document.createElement('img');
            img.dataset.menuIcon = '1';
            img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAD1SURBVHgBzZE/DgFREMZnZjdqN8AJHIEjcAMShQjFokAUCkRhUSCiwQlwA0fgBusGG4mCMOtteGLFnxUFXzPzZvL9Mm8G4NdCmTT0QZCRvbdNZjbK+fS62uz6iMgv62SRWcglV3auyqKFPEO8oyvKQoQ4IXVEjFzByIYIAQfgrGO8qGUWcKdSLhW1Y03vjRAxdtsjcKmLOSzS2McAaWaPJyyGNj4C1PV+W5rL6cR6j1t7eRXXAHGnpTTbz4qmmfvNbi7b6jt/KZuaOCZqDUMAhzFcruB6ic/0NcDxBcuiab3VN19bDo8BjGqU4OgFF1KATfgbnQDU3UrgFaO0lAAAAABJRU5ErkJggg==';
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');

            img.style.display = 'inline-block';
            img.style.width = '1em';
            img.style.height = '1em';
            img.style.padding = '0';
            img.style.margin = '0';
            img.style.marginRight = '0.25em';
            (img.style as any).verticalAlign = 'text-bottom';
            img.style.lineHeight = '1';
            link.insertBefore(img, link.firstChild);
            invalid_link = false;
            if (matchedFromCurrent) {
              orderedCurrentMenus.push(matchedFromCurrent);
            }
          }
        } else if (href.startsWith('document:')) {
          const key = href.substring('document:'.length).trim();
          const idxCurrent = currentDocs.findIndex((m: any) => m?.documentId === key);

          if (idxCurrent !== -1) {
            const doc = currentDocs[idxCurrent];
            link.addEventListener('click', (e) => {
              e.preventDefault();
              if (!props.isLoading && props.observeSourceClick) {
                props.observeSourceClick(doc);
              }
            });

            link.setAttribute('role', 'button');
            const docId = (doc && (doc as any).documentId) ? (doc as any).documentId : key;
            let assigned = docNumberMap.get(docId);
            if (!assigned) {
              currentDocCounter += 1;
              assigned = currentDocCounter;
              docNumberMap.set(docId, assigned);
              orderedCurrentSources.push(doc);
            }
            link.textContent = String(assigned);
            link.style.cursor = props.isLoading ? 'not-allowed' : 'pointer';
            link.style.display = 'inline-flex';
            (link.style as any).alignItems = 'center';
            (link.style as any).justifyContent = 'center';
            link.style.width = '16px';
            link.style.height = '16px';
            link.style.borderRadius = '9999px';
            link.style.backgroundColor = '#E0E0E0';
            link.style.color = '#333333';
            link.style.fontSize = '11px';
            link.style.fontWeight = '600';
            link.style.textDecoration = 'none';
            (link.style as any).lineHeight = '16px';
            invalid_link = false;
          } else {
            const prevDoc = Array.isArray(prevDocs) ? prevDocs.find((m: any) => m?.documentId === key) : undefined;
            if (prevDoc) {
              link.addEventListener('click', (e) => {
                e.preventDefault();
                if (!props.isLoading && props.observeSourceClick) {
                  props.observeSourceClick(prevDoc);
                }
              });
              link.setAttribute('role', 'button');
              link.textContent = '*';
              link.style.cursor = props.isLoading ? 'not-allowed' : 'pointer';
              link.style.display = 'inline-flex';
              (link.style as any).alignItems = 'center';
              (link.style as any).justifyContent = 'center';
              link.style.width = '16px';
              link.style.height = '16px';
              link.style.borderRadius = '9999px';
              link.style.backgroundColor = '#E0E0E0';
              link.style.color = '#333333';
              link.style.fontSize = '11px';
              link.style.fontWeight = '600';
              link.style.textDecoration = 'none';
              (link.style as any).lineHeight = '16px';
              invalid_link = false;
            } else {
              link.textContent = '';
              href = '';
            }
          }
        } else if (href.startsWith('master:')) {
          const key = href.substring('master:'.length).trim();
          const searches = Array.isArray(props.message.mastSearches) ? props.message.mastSearches : [];

          let matched: string | null = null;
          const scanMast = (list: any[]) => {
            for (const search of list) {
              for (const m of search.mastids || []) {
                if (m === key) {
                  return m;
                }
              }
            }
            return null;
          };
          const matchedFromCurrent = scanMast(searches);
          matched = matchedFromCurrent;
          if (matched === null && Array.isArray(prevMastSearches) && prevMastSearches.length > 0) {
            matched = scanMast(prevMastSearches);
          }

          if (matched !== null) {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              if (!props.isLoading && props.observeMastClick) {
                props.observeMastClick(matched);
              }
            });

            link.setAttribute('role', 'button');
            link.style.cursor = props.isLoading ? 'not-allowed' : 'pointer';
            link.style.color = props.textColor ?? defaultTextColor;
            link.style.textDecoration = 'underline';

            const img = document.createElement('img');
            img.dataset.menuIcon = '1';
            img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAD1SURBVHgBzZE/DgFREMZnZjdqN8AJHIEjcAMShQjFokAUCkRhUSCiwQlwA0fgBusGG4mCMOtteGLFnxUFXzPzZvL9Mm8G4NdCmTT0QZCRvbdNZjbK+fS62uz6iMgv62SRWcglV3auyqKFPEO8oyvKQoQ4IXVEjFzByIYIAQfgrGO8qGUWcKdSLhW1Y03vjRAxdtsjcKmLOSzS2McAaWaPJyyGNj4C1PV+W5rL6cR6j1t7eRXXAHGnpTTbz4qmmfvNbi7b6jt/KZuaOCZqDUMAhzFcruB6ic/0NcDxBcuiab3VN19bDo8BjGqU4OgFF1KATfgbnQDU3UrgFaO0lAAAAABJRU5ErkJggg==';
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');

            img.style.display = 'inline-block';
            img.style.width = '1em';
            img.style.height = '1em';
            img.style.padding = '0';
            img.style.margin = '0';
            img.style.marginRight = '0.25em';
            (img.style as any).verticalAlign = 'text-bottom';
            img.style.lineHeight = '1';
            link.insertBefore(img, link.firstChild);
            invalid_link = false;
            if (matchedFromCurrent) {
              orderedCurrentMastIds.push(matchedFromCurrent);
            }
          }
        }

        if (invalid_link && !href.startsWith('http://') && !href.startsWith("https://")) {
          const span = document.createElement('span');
          span.textContent = link.textContent || href;
          (span as HTMLElement).style.color = props.textColor ?? defaultTextColor;
          if (link.parentNode) link.parentNode.replaceChild(span, link);
        }
      });

      // Update ordered sources for rendering
      setOrderedSources(orderedCurrentSources);
      setOrderedMenus(orderedCurrentMenus);
      setOrderedMastIds(orderedCurrentMastIds);

      // Store the element ref for the copy function
      setBotMessageElement(el);

      if (props.message.rating) {
        setRating(props.message.rating);
        if (props.message.rating === 'THUMBS_UP') {
          setThumbsUpColor('#006400');
        } else if (props.message.rating === 'THUMBS_DOWN') {
          setThumbsDownColor('#8B0000');
        }
      }
      if (props.fileAnnotations && props.fileAnnotations.length) {
        for (const annotations of props.fileAnnotations) {
          const button = document.createElement('button');
          button.textContent = annotations.fileName;
          button.className =
            'py-2 px-4 mb-2 justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 file-annotation-button';
          button.addEventListener('click', function () {
            downloadFile(annotations);
          });
          const svgContainer = document.createElement('div');
          svgContainer.className = 'ml-2';
          svgContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-download" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>`;

          button.appendChild(svgContainer);
          el.appendChild(button);
        }
      }
    }
  };

  const downloadFile = async (fileAnnotation: any) => {
    try {
      const response = await sendFileDownloadQuery({
        apiHost: props.apiHost,
        body: { fileName: fileAnnotation.fileName, chatflowId: props.chatflowid, chatId: props.chatId } as any,
        onRequest: props.onRequest,
      });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileAnnotation.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const copyMessageToClipboard = async () => {
    try {
      const text = botMessageElement() ? botMessageElement()?.textContent : '';
      await navigator.clipboard.writeText(text || '');
      setCopiedMessage(true);
      setTimeout(() => {
        setCopiedMessage(false);
      }, 2000); // Hide the message after 2 seconds
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const saveToLocalStorage = (rating: FeedbackRatingType) => {
    const chatDetails = localStorage.getItem(`${props.chatflowid}_EXTERNAL`);
    if (!chatDetails) return;
    try {
      const parsedDetails = JSON.parse(chatDetails);
      const messages: MessageType[] = parsedDetails.chatHistory || [];
      const message = messages.find((msg) => msg.messageId === props.message.messageId);
      if (!message) return;
      message.rating = rating;
      localStorage.setItem(`${props.chatflowid}_EXTERNAL`, JSON.stringify({ ...parsedDetails, chatHistory: messages }));
    } catch (e) {
      return;
    }
  };

  const isValidURL = (url: string): URL | undefined => {
    try {
      return new URL(url);
    } catch (err) {
      return undefined;
    }
  };

  const removeDuplicateURL = (message: MessageType) => {
    const visitedURLs: string[] = [];
    const newSourceDocuments: any = [];

    message.sourceDocuments.forEach((source: any) => {
      if (isValidURL(source.metadata.source) && !visitedURLs.includes(source.metadata.source)) {
        visitedURLs.push(source.metadata.source);
        newSourceDocuments.push(source);
      } else if (!isValidURL(source.metadata.source)) {
        newSourceDocuments.push(source);
      }
    });
    return newSourceDocuments;
  };

  const onThumbsUpClick = async () => {
    if (rating() === '') {
      const body = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        messageId: props.message?.messageId as string,
        rating: 'THUMBS_UP' as FeedbackRatingType,
        content: '',
      };
      const result = await sendFeedbackQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });

      if (result.data) {
        const data = result.data as any;
        let id = '';
        if (data && data.id) id = data.id;
        setRating('THUMBS_UP');
        setFeedbackId(id);
        setShowFeedbackContentModal(true);
        // update the thumbs up color state
        setThumbsUpColor('#006400');
        saveToLocalStorage('THUMBS_UP');
      }
    }
  };

  const onThumbsDownClick = async () => {
    if (rating() === '') {
      const body = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        messageId: props.message?.messageId as string,
        rating: 'THUMBS_DOWN' as FeedbackRatingType,
        content: '',
      };
      const result = await sendFeedbackQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });

      if (result.data) {
        const data = result.data as any;
        let id = '';
        if (data && data.id) id = data.id;
        setRating('THUMBS_DOWN');
        setFeedbackId(id);
        setShowFeedbackContentModal(true);
        // update the thumbs down color state
        setThumbsDownColor('#8B0000');
        saveToLocalStorage('THUMBS_DOWN');
      }
    }
  };

  const submitFeedbackContent = async (text: string) => {
    if (text != '') {
      const body = {
        content: text,
      };

      await updateFeedbackQuery({
        id: feedbackId(),
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });
    }
    setFeedbackId('');
    setShowFeedbackContentModal(false);

  };

  onMount(() => {
    if (botDetailsEl && props.isLoading) {
      botDetailsEl.open = true;
    }
  });

  createEffect(() => {
    if (botDetailsEl && props.isLoading) {
      botDetailsEl.open = true;
    } else if (botDetailsEl && !props.isLoading) {
      botDetailsEl.open = false;
    }
  });

  const renderArtifacts = (item: Partial<FileUpload>) => {
    // Instead of onMount, we'll use a callback ref to apply styles
    const setArtifactRef = (el: HTMLSpanElement) => {
      if (el) {
        const textColor = props.textColor ?? defaultTextColor;
        // Apply textColor to all elements except code blocks
        el.querySelectorAll('a, h1, h2, h3, h4, h5, h6, strong, em, blockquote, li').forEach((element) => {
          (element as HTMLElement).style.color = textColor;
        });

        // Code blocks (with pre) get white text
        el.querySelectorAll('pre').forEach((element) => {
          (element as HTMLElement).style.color = '#FFFFFF';
          // Also ensure any code elements inside pre have white text
          element.querySelectorAll('code').forEach((codeElement) => {
            (codeElement as HTMLElement).style.color = '#FFFFFF';
          });
        });

        // Inline code (not in pre) gets green text
        el.querySelectorAll('code:not(pre code)').forEach((element) => {
          (element as HTMLElement).style.color = '#4CAF50'; // Green color
        });

        el.querySelectorAll('a').forEach((link) => {
          link.target = '_blank';
        });
      }
    };

    return (
      <>
        <Show when={item.type === 'png' || item.type === 'jpeg'}>
          <div class="flex items-center justify-center p-0 m-0">
            <img
              class="w-full h-full bg-cover"
              src={((): string => {
                const isFileStorage = typeof item.data === 'string' && item.data.startsWith('FILE-STORAGE::');
                return isFileStorage
                  ? `${props.apiHost}/api/v1/get-upload-file?chatflowId=${props.chatflowid}&chatId=${props.chatId}&fileName=${(
                      item.data as string
                    ).replace('FILE-STORAGE::', '')}`
                  : (item.data as string);
              })()}
            />
          </div>
        </Show>
        <Show when={item.type === 'html'}>
          <div class="mt-2">
            <div innerHTML={item.data as string} />
          </div>
        </Show>
        <Show when={item.type !== 'png' && item.type !== 'jpeg' && item.type !== 'html'}>
          <span
            ref={setArtifactRef}
            innerHTML={Marked.parse(item.data as string)}
            class="prose"
            style={{
              'background-color':
                props.message.sourceDocuments && props.message.sourceDocuments.length > 0
                  ? props.backgroundColorEmphasize ?? defaultBackgroundColor
                  : props.backgroundColor ?? defaultBackgroundColor,
              color: props.textColor ?? defaultTextColor,
              'border-radius': '6px',
              'font-size': props.fontSize ? `${props.fontSize}px` : `${defaultFontSize}px`,
            }}
          />
        </Show>
      </>
    );
  };

  const formatDateTime = (dateTimeString: string | undefined, showDate: boolean | undefined, showTime: boolean | undefined) => {
    if (!dateTimeString) return '';

    try {
      const date = new Date(dateTimeString);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid ISO date string:', dateTimeString);
        return '';
      }

      let formatted = '';

      if (showDate) {
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const [{ value: month }, , { value: day }, , { value: year }] = dateFormatter.formatToParts(date);
        formatted = `${month.charAt(0).toUpperCase() + month.slice(1)} ${day}, ${year}`;
      }

      if (showTime) {
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const timeString = timeFormatter.format(date).toLowerCase();
        formatted = formatted ? `${formatted}, ${timeString}` : timeString;
      }

      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  const getAvatarSrc = () => {
    if (props?.isLoading && props.message.type === 'apiMessage') {
      return props.avatarLoadingSrc;
    } else if (props.message.sourceDocuments) {
      if (props.message.sourceDocuments.length === 0) {
        return props.avatarEmptySrc;
      } else {
        return props.avatarInfoSrc;
      }
    } else if (props.message.mastSearches) {
      if (props.message.mastSearches.length === 0) {
        return props.avatarEmptySrc;
      } else {
        return props.avatarInfoSrc;
      }
    } else {
      return props.avatarSrc;
    }    
  };
  return (
    <div>
      <div class="flex flex-row justify-start mb-2 items-start host-container" style={{ 'margin-right': '50px' }}>
        <Show when={props.showAvatar}>
          <Avatar initialAvatarSrc={getAvatarSrc()} />
        </Show>
        <div class="flex flex-col justify-start">
          {props.showAgentMessages &&
            props.message.agentFlowExecutedData &&
            Array.isArray(props.message.agentFlowExecutedData) &&
            props.message.agentFlowExecutedData.length > 0 && (
              <div>
                <WorkflowTreeView workflowData={props.message.agentFlowExecutedData} indentationLevel={24} />
              </div>
            )}
          {props.showAgentMessages && props.message.agentReasoning && (
            <details ref={botDetailsEl} class="mb-2 px-4 py-2 ml-2 chatbot-host-bubble rounded-[6px]">
              <summary class="cursor-pointer">
                <span class="italic">Agent Messages</span>
              </summary>
              <br />
              <For each={props.message.agentReasoning}>
                {(agent) => {
                  const agentMessages = agent.messages ?? [];
                  let msgContent = agent.instructions || (agentMessages.length > 1 ? agentMessages.join('\\n') : agentMessages[0]);
                  if (agentMessages.length === 0 && !agent.instructions) msgContent = `<p>Finished</p>`;
                  return (
                    <AgentReasoningBubble
                      agentName={agent.agentName ?? ''}
                      agentMessage={msgContent}
                      agentArtifacts={agent.artifacts}
                      backgroundColor={props.backgroundColor}
                      textColor={props.textColor}
                      fontSize={props.fontSize}
                      apiHost={props.apiHost}
                      chatflowid={props.chatflowid}
                      chatId={props.chatId}
                      renderHTML={props.renderHTML}
                    />
                  );
                }}
              </For>
            </details>
          )}
          {props.message.artifacts && props.message.artifacts.length > 0 && (
            <div class="flex flex-row items-start flex-wrap w-full gap-2">
              <For each={props.message.artifacts}>
                {(item) => {
                  return item !== null ? <>{renderArtifacts(item)}</> : null;
                }}
              </For>
            </div>
          )}
          {props.message.message && (
            <span
              ref={setBotMessageRef}
              class="px-4 py-2 ml-2 max-w-full chatbot-host-bubble prose"
              data-testid="host-bubble"
              style={{
                'background-color':
                  (
                    (props.message.sourceDocuments && props.message.sourceDocuments.length > 0)
                    || (props.message.mastSearches && props.message.mastSearches.length > 0)
                  )
                    ? props.backgroundColorEmphasize ?? defaultBackgroundColor
                    : props.backgroundColor ?? defaultBackgroundColor,
                color: props.textColor ?? defaultTextColor,
                'border-radius': '6px',
                'font-size': props.fontSize ? `${props.fontSize}px` : `${defaultFontSize}px`,
              }}
            />
          )}
          {props.message.action && props.message.action?.action !== 'search' && (
            <div class={`px-4 py-2 ${(props.message.action?.action === 'choose_one_property' || props.message.action?.action === 'choose_one_option') ? 'flex flex-col space-y-2' : 'flex flex-row justify-start space-x-2'}`}>
              <For each={props.message.action.elements || []}>
                {(action) => {
                  return (
                    <>
                      {(action.type === 'approve-button' && action.label === 'Yes') || action.type === 'agentflowv2-approve-button' ? (
                        <button
                          type="button"
                          class="px-4 py-2 font-medium text-green-600 border border-green-600 rounded-full hover:bg-green-600 hover:text-white transition-colors duration-300 flex items-center space-x-2"
                          onClick={() => props.handleActionClick(action, props.message.action)}
                        >
                          <TickIcon />
                          &nbsp;
                          {action.label}
                        </button>
                      ) : (action.type === 'reject-button' && action.label === 'No') || action.type === 'agentflowv2-reject-button' ? (
                        <button
                          type="button"
                          class="px-4 py-2 font-medium text-red-600 border border-red-600 rounded-full hover:bg-red-600 hover:text-white transition-colors duration-300 flex items-center space-x-2"
                          onClick={() => props.handleActionClick(action, props.message.action)}
                        >
                          <XIcon isCurrentColor={true} />
                          &nbsp;
                          {action.label}
                        </button>
                      ) : (
                        <button
                          type="button"
                          class="px-4 py-2 font-medium text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors duration-300"
                          onClick={() => props.handleActionClick(action, props.message.action)}
                        >
                          {action.label}
                        </button>
                      )}
                    </>
                  );
                }}
              </For>
            </div>
          )}
        </div>
      </div>
      <div>
        {((orderedSources() && orderedSources().length > 0) || (props.message.sourceDocuments && props.message.sourceDocuments.length)) && (
          <>
            <Show when={props.sourceDocsTitle}>
              <span class="px-2 py-[10px] font-semibold">{props.sourceDocsTitle}</span>
            </Show>
            <div style={{ display: 'flex', 'flex-direction': 'row', width: '100%', 'flex-wrap': 'wrap', 'margin-left': '40px' }}>
              <For each={(orderedSources().length > 0 ? orderedSources() : removeDuplicateURL(props.message)).slice(0, 4)}>
                {(src, index) => {
                  const URL = isValidURL(src.metadata.source);
                  return (
                    <SourceBubble
                      index={index()}
                      chunkContent={URL ? URL.pathname : src.metadata.chunkContent}
                      title={src.metadata.section ? src.metadata.section.text : ""}
                      imageSrc={src.metadata.related_image && src.metadata.related_image.length > 0 ? src.metadata.related_image[0] : undefined}
                      onSourceClick={() => {
                        if (URL) {
                          window.open(src.metadata.source, '_blank');
                        } else {
                          if (props.observeSourceClick) {
                            props.observeSourceClick(src);
                          }
                        }
                      }}
                    />
                  );
                }}
              </For>
            </div>
          </>
        )}
      </div>
      <div>
        {props.chatFeedbackStatus && props.message.messageId && (
          <>
            <div class={`flex items-center px-2 pb-2 ${props.showAvatar ? 'ml-10' : ''}`}>
              <CopyToClipboardButton feedbackColor={props.feedbackColor} onClick={() => copyMessageToClipboard()} />
              <Show when={copiedMessage()}>
                <div class="copied-message" style={{ 'margin-right': '6px', 'font-size': '12px', 'color': props.feedbackColor ?? defaultFeedbackColor }}>
                  복사완료!
                </div>
              </Show>
              {rating() === '' || rating() === 'THUMBS_UP' ? (
                <ThumbsUpButton feedbackColor={thumbsUpColor()} isDisabled={rating() === 'THUMBS_UP'} rating={rating()} onClick={onThumbsUpClick} />
              ) : null}
              {rating() === '' || rating() === 'THUMBS_DOWN' ? (
                <ThumbsDownButton
                  feedbackColor={thumbsDownColor()}
                  isDisabled={rating() === 'THUMBS_DOWN'}
                  rating={rating()}
                  onClick={onThumbsDownClick}
                />
              ) : null}
              <Show when={props.message.dateTime}>
                <div class="text-sm text-gray-500 ml-2">
                  {formatDateTime(props.message.dateTime, props?.dateTimeToggle?.date, props?.dateTimeToggle?.time)}
                </div>
              </Show>
            </div>
            <Show when={showFeedbackContentDialog()}>
              <FeedbackContentDialog
                isOpen={showFeedbackContentDialog()}
                onClose={() => setShowFeedbackContentModal(false)}
                onSubmit={submitFeedbackContent}
                backgroundColor={props.backgroundColor}
                textColor={props.textColor}
              />
            </Show>
          </>
        )}
      </div>
    </div>
  );
};
