import { createEffect, createMemo, createSignal, For, mergeProps, on, onMount, Show } from 'solid-js';
import { v4 as uuidv4 } from 'uuid';
import {
  createAttachmentWithFormData,
  FeedbackRatingType,
  getChatbotConfig,
  IncomingInput,
  isStreamAvailableQuery,
  sendMessageLog,
  sendMessageQuery,
  upsertVectorStoreWithFormData,
} from '@/queries/sendMessageQuery';
import { ComboBox, Slider, TextInput } from './inputs';
import { GuestBubble } from './bubbles/GuestBubble';
import { BotBubble } from './bubbles/BotBubble';
import { LoadingBubble } from './bubbles/LoadingBubble';
import { StarterPromptBubble } from './bubbles/StarterPromptBubble';
import {
  BotMessageTheme,
  ComboBoxTheme,
  DateTimeToggleTheme,
  DisclaimerPopUpTheme,
  FeedbackTheme,
  FooterTheme,
  SliderTheme,
  TextInputTheme,
  UserMessageTheme,
} from '@/features/bubble/types';
import { Badge } from './Badge';
import { DisclaimerPopup, Popup } from '@/features/popup';
import { Avatar } from '@/components/avatars/Avatar';
import { CloseButton, DeleteButton, SendButton } from '@/components/buttons/SendButton';
import { FilePreview } from '@/components/inputs/textInput/components/FilePreview';
import { CircleDotIcon, SparklesIcon, TrashIcon } from './icons';
import { CancelButton } from './buttons/CancelButton';
import { cancelAudioRecording, startAudioRecording, stopAudioRecording } from '@/utils/audioRecording';
import { LeadCaptureBubble } from '@/components/bubbles/LeadCaptureBubble';
import { getCookie, getLocalStorageChatflow, removeLocalStorageChatHistory, setCookie, setLocalStorageChatflow } from '@/utils';
import { cloneDeep, first, last} from 'lodash';
import { FollowUpPromptBubble } from '@/components/bubbles/FollowUpPromptBubble';
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source';

export type FileEvent<T = EventTarget> = {
  target: T;
};

export type FormEvent<T = EventTarget> = {
  preventDefault: () => void;
  currentTarget: T;
};

type IUploadConstraits = {
  fileTypes: string[];
  maxUploadSize: number;
};

export type UploadsConfig = {
  imgUploadSizeAndTypes: IUploadConstraits[];
  fileUploadSizeAndTypes: IUploadConstraits[];
  isImageUploadAllowed: boolean;
  isSpeechToTextEnabled: boolean;
  isRAGFileUploadAllowed: boolean;
};

type FilePreviewData = string | ArrayBuffer;

type FilePreview = {
  data: FilePreviewData;
  mime: string;
  name: string;
  preview: string;
  type: string;
};

type messageType = 'apiMessage' | 'userMessage' | 'usermessagewaiting' | 'leadCaptureMessage';
type ExecutionState = 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'TERMINATED' | 'TIMEOUT' | 'STOPPED';

export type IAgentReasoning = {
  agentName?: string;
  messages?: string[];
  usedTools?: any[];
  artifacts?: FileUpload[];
  sourceDocuments?: any[];
  instructions?: string;
  nextAgent?: string;
};

export type IAction = {
  action?: string;
  id?: string;
  data?: any;
  cacheKey?: string;
  elements?: Array<{
    type: string;
    label: string;
    description?: string;
    prop_field?: string;
    prop_id?: string;
  }>;
  mapping?: {
    approve: string;
    reject: string;
    toolCalls: any[];
  };
  allowInput?: boolean;
};

export type FileUpload = Omit<FilePreview, 'preview' | 'data'> & { data?: FilePreviewData };

export type AgentFlowExecutedData = {
  nodeLabel: string;
  nodeId: string;
  data: any;
  previousNodeIds: string[];
  status?: ExecutionState;
};

export type MessageType = {
  messageId?: string;
  message: string;
  type: messageType;
  sourceDocuments?: any;
  thoughts?: any;
  fileAnnotations?: any;
  fileUploads?: Partial<FileUpload>[];
  artifacts?: Partial<FileUpload>[];
  agentReasoning?: IAgentReasoning[];
  execution?: any;
  agentFlowEventStatus?: string;
  agentFlowExecutedData?: any;
  usedTools?: any[];
  action?: IAction | null;
  pendingAction?: IAction | null;
  rating?: FeedbackRatingType;
  id?: string;
  followUpPrompts?: string;
  dateTime?: string;
  refreshTrigger?: number;
  search?: any;
  inputs?: any;
};

type IUploads = {
  data: FilePreviewData;
  type: string;
  name: string;
  mime: string;
  fileId?: string;
}[];

type observerConfigType = (accessor: any) => void;

/** Link resolution result returned by resolveLink callback */
export type LinkResolveResult = {
  /** 'icon' = underline + menu icon, 'badge' = numbered circle, 'hidden' = remove link text */
  style: 'icon' | 'badge' | 'hidden';
  /** Tooltip text (icon style) */
  title?: string;
  /** Badge label (badge style) */
  label?: string;
  /** Data passed to callJS('link', ...) on click */
  clickData?: any;
  /** Which ordered sidebar collection to add this item to */
  collectAs?: 'sources';
};

export type observersConfigType = {
  observeUserInput?: observerConfigType;
  observeLoading?: observerConfigType;
  observeMessages?: observerConfigType;
  observeCloseClick?: () => Promise<void>;
  disableButton?: () => void;
  enableButton?: () => void;
  alertAgentError?: () => void;
  applyExtraVars?: () => Promise<Record<string, string>> | Record<string, string>;
  renderSummaryText?: (grouped: Map<string, any[]>) => string[] | undefined;
  /** Generic JS action dispatcher — handles link clicks, value list fetches, form submits, search, fill_input, etc. */
  callJS?: (action: string, params: any) => Promise<any>;
  /** Synchronous link resolver. Called for each non-http link in bot messages. */
  resolveLink?: (action: string, key: string, message: any) => LinkResolveResult | null;
  // @deprecated — callJS + resolveLink로 마이그레이션 예정. 하위 호환성을 위해 유지
  applySearch?: (data: any) => Promise<any>;
  applyInputField?: (data: any) => any;
  observeSourceClick?: observerConfigType;
  observeMDTableClick?: observerConfigType;
  getValuePatterns?: (data: any) => any;
  clearFields?: (data: any) => any;
  clearAllFields?: (data: any) => any;
  openSearchWindow?: (data: any) => any;
  submitForm?: (data: any) => any;
};

export type ResourceLabels = {
  SKIP?: string;
  CHOOSE_DEFAULT?: string;
  NULL_VALUE?: string;
  // 일반 UI 라벨 — ChatbotLabelUtil 키와 일치 (SCREAMING_SNAKE_CASE)
  COPY_TO_CLIPBOARD?: string;
  THUMBS_UP?: string;
  THUMBS_DOWN?: string;
  WRITE_FEEDBACK?: string;
  FEEDBACK_PLACEHOLDER?: string;
  SEND_FEEDBACK?: string;
  SELECT_PLACEHOLDER?: string;
  SEND?: string;
  RESET_CHAT?: string;
  COPIED?: string;
  YOUR_FEEDBACK?: string;
  FEEDBACK_FORM_PLACEHOLDER?: string;
  CANCEL?: string;
  SUBMIT?: string;
  MODULE_PLACEHOLDER?: string;
  CLEAR?: string;
  REMOVE_ATTACHMENT?: string;
  FILE_SIZE_EXCEEDED?: string;
  INVALID_FILE_TYPE?: string;
  DROP_HERE_TO_UPLOAD?: string;
};

export type BotResources = {
  labels?: ResourceLabels;
};

export type BotProps = {
  chatflowid: string;
  apiHost?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  chatflowConfig?: Record<string, unknown>;
  gptModels?: ComboBoxTheme;
  mdmModules?: ComboBoxTheme;
  resources?: BotResources;
  backgroundColor?: string;
  welcomeMessage?: string;
  initialMessage?: string;
  errorMessage?: string;
  botMessage?: BotMessageTheme;
  userMessage?: UserMessageTheme;
  textInput?: TextInputTheme;
  feedback?: FeedbackTheme;
  poweredByTextColor?: string;
  badgeBackgroundColor?: string;
  bubbleBackgroundColor?: string;
  closeButtonColor?: string;
  bubbleTextColor?: string;
  showTitle?: boolean;
  showAgentMessages?: boolean;
  title?: string;
  titleAvatarSrc?: string;
  titleTextColor?: string;
  titleBackgroundColor?: string;
  formBackgroundColor?: string;
  formTextColor?: string;
  fontSize?: number;
  isFullPage?: boolean;
  footer?: FooterTheme;
  sourceDocsTitle?: string;
  observersConfig?: observersConfigType;
  starterPrompts?: string[] | Record<string, { prompt: string }>;
  starterPromptFontSize?: number;
  clearChatOnReload?: boolean;
  disclaimer?: DisclaimerPopUpTheme;
  dateTimeToggle?: DateTimeToggleTheme;
  renderHTML?: boolean;
  closeBot?: () => void;
  openBot?: () => void;
  enableBot?: () => void;
  disableBot?: () => void;
  showCloseButton?: boolean;
  useObserverClose?: boolean;
  fastMode?: SliderTheme;
  disableButton?: () => void;
};

export type LeadsConfig = {
  status: boolean;
  title?: string;
  name?: boolean;
  email?: boolean;
  phone?: boolean;
  successMessage?: string;
};

const defaultWelcomeMessage = 'Hi there! How can I help?';

const defaultBackgroundColor = '#ffffff';
const defaultTextColor = '#303235';
const defaultTitleBackgroundColor = '#3B81F6';

/* FeedbackDialog component - for collecting user feedback */
const FeedbackDialog = (props: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  feedbackValue: string;
  setFeedbackValue: (value: string) => void;
  // i18n 라벨
  titleLabel?: string;
  placeholderLabel?: string;
  cancelLabel?: string;
  submitLabel?: string;
}) => {
  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 rounded-lg flex items-center justify-center backdrop-blur-sm z-50" style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
        <div class="p-6 rounded-lg shadow-lg max-w-md w-full text-center mx-4 font-sans" style={{ background: 'white', color: 'black' }}>
          <h2 class="text-xl font-semibold mb-4 flex justify-center items-center">{props.titleLabel ?? "Your Feedback"}</h2>

          <textarea
            class="w-full p-2 border border-gray-300 rounded-md mb-4"
            rows={4}
            placeholder={props.placeholderLabel ?? "Please provide your feedback..."}
            value={props.feedbackValue}
            onInput={(e) => props.setFeedbackValue(e.target.value)}
          />

          <div class="flex justify-center space-x-4">
            <button
              class="font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
              style={{ background: '#ef4444', color: 'white' }}
              onClick={props.onClose}
            >
              {props.cancelLabel ?? "Cancel"}
            </button>
            <button
              class="font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
              style={{ background: '#3b82f6', color: 'white' }}
              onClick={props.onSubmit}
            >
              {props.submitLabel ?? "Submit"}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

/* FormInputView component - for displaying the form input */
const FormInputView = (props: {
  title: string;
  description: string;
  inputParams: any[];
  onSubmit: (formData: object) => void;
  parentBackgroundColor?: string;
  backgroundColor?: string;
  textColor?: string;
  sendButtonColor?: string;
  fontSize?: number;
}) => {
  const [formData, setFormData] = createSignal<Record<string, any>>({});

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    props.onSubmit(formData());
  };

  return (
    <div
      class="w-full h-full flex flex-col items-center justify-center px-4 py-8 rounded-lg"
      style={{
        'font-family': 'TbwBase, arial, sans-serif',
        'font-size': props.fontSize ? `${props.fontSize}px` : '16px',
        background: props.parentBackgroundColor || defaultBackgroundColor,
        color: props.textColor || defaultTextColor,
      }}
    >
      <div
        class="w-full max-w-md bg-white shadow-lg rounded-lg overflow-hidden"
        style={{
          'font-family': 'TbwBase, arial, sans-serif',
          'font-size': props.fontSize ? `${props.fontSize}px` : '16px',
          background: props.backgroundColor || defaultBackgroundColor,
          color: props.textColor || defaultTextColor,
        }}
      >
        <div class="p-6">
          <h2 class="text-xl font-bold mb-2">{props.title}</h2>
          {props.description && (
            <p class="text-gray-600 mb-6" style={{ color: props.textColor || defaultTextColor }}>
              {props.description}
            </p>
          )}

          <form onSubmit={handleSubmit} class="space-y-4">
            <For each={props.inputParams}>
              {(param) => (
                <div class="space-y-2">
                  <label class="block text-sm font-medium">{param.label}</label>

                  {param.type === 'string' && (
                    <input
                      type="text"
                      class="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        border: '1px solid #9ca3af',
                        'border-radius': '0.375rem',
                      }}
                      onFocus={(e) => (e.target.style.border = '1px solid #3b82f6')}
                      onBlur={(e) => (e.target.style.border = '1px solid #9ca3af')}
                      name={param.name}
                      onInput={(e) => handleInputChange(param.name, e.target.value)}
                      required
                    />
                  )}

                  {param.type === 'number' && (
                    <input
                      type="number"
                      class="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        border: '1px solid #9ca3af',
                        'border-radius': '0.375rem',
                      }}
                      onFocus={(e) => (e.target.style.border = '1px solid #3b82f6')}
                      onBlur={(e) => (e.target.style.border = '1px solid #9ca3af')}
                      name={param.name}
                      onInput={(e) => handleInputChange(param.name, parseFloat(e.target.value))}
                      required
                    />
                  )}

                  {param.type === 'boolean' && (
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                        style={{
                          border: '1px solid #9ca3af',
                        }}
                        name={param.name}
                        onChange={(e) => handleInputChange(param.name, e.target.checked)}
                      />
                      <span class="ml-2">Yes</span>
                    </div>
                  )}

                  {param.type === 'options' && (
                    <select
                      class="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        border: '1px solid #9ca3af',
                        'border-radius': '0.375rem',
                      }}
                      onFocus={(e) => (e.target.style.border = '1px solid #3b82f6')}
                      onBlur={(e) => (e.target.style.border = '1px solid #9ca3af')}
                      name={param.name}
                      onChange={(e) => handleInputChange(param.name, e.target.value)}
                      required
                    >
                      <option value="">Select an option</option>
                      <For each={param.options}>{(option) => <option value={option.name}>{option.label}</option>}</For>
                    </select>
                  )}
                </div>
              )}
            </For>

            <div class="pt-4">
              <button
                type="submit"
                class="w-full py-2 px-4 text-white font-semibold rounded-md focus:outline-none transition duration-300 ease-in-out"
                style={{
                  'background-color': props.sendButtonColor || '#3B81F6',
                }}
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const Bot = (botProps: BotProps & { class?: string }) => {
  // set a default value for showTitle if not set and merge with other props
  const props = mergeProps({ showTitle: true }, botProps);
  let chatContainer: HTMLDivElement | undefined;
  let bottomSpacer: HTMLDivElement | undefined;
  let botContainer: HTMLDivElement | undefined;

  const [userInput, setUserInput] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [sourcePopupOpen, setSourcePopupOpen] = createSignal(false);
  const [sourcePopupSrc, setSourcePopupSrc] = createSignal({});
  const [messages, setMessages] = createSignal<MessageType[]>(
    [
      {
        message: props.welcomeMessage ?? defaultWelcomeMessage,
        type: 'apiMessage',
      },
    ],
    { equals: false },
  );

  const [isChatFlowAvailableToStream, setIsChatFlowAvailableToStream] = createSignal(false);
  const [chatId, setChatId] = createSignal('');
  const [isMessageStopping, setIsMessageStopping] = createSignal(false);
  const [starterPrompts, setStarterPrompts] = createSignal<string[]>([], { equals: false });
  const [chatFeedbackStatus, setChatFeedbackStatus] = createSignal<boolean>(false);
  const [fullFileUpload, setFullFileUpload] = createSignal<boolean>(false);
  const [uploadsConfig, setUploadsConfig] = createSignal<UploadsConfig>();
  const [leadsConfig, setLeadsConfig] = createSignal<LeadsConfig>();
  const [isLeadSaved, setIsLeadSaved] = createSignal(false);
  const [leadEmail, setLeadEmail] = createSignal('');
  const [disclaimerPopupOpen, setDisclaimerPopupOpen] = createSignal(false);
  const [calledTools, setCalledTools] = createSignal<any[]>([]);
  const [showLoadingBubble, setShowLoadingBubble] = createSignal(false);

  const [openFeedbackDialog, setOpenFeedbackDialog] = createSignal(false);
  const [feedback, setFeedback] = createSignal('');
  const [pendingActionData, setPendingActionData] = createSignal(null);
  const [feedbackType, setFeedbackType] = createSignal('');

  // start input type
  const [startInputType, setStartInputType] = createSignal('');
  const [formTitle, setFormTitle] = createSignal('');
  const [formDescription, setFormDescription] = createSignal('');
  const [formInputsData, setFormInputsData] = createSignal({});
  const [formInputParams, setFormInputParams] = createSignal([]);

  // drag & drop file input
  // TODO: fix this type
  const [previews, setPreviews] = createSignal<FilePreview[]>([]);

  // audio recording
  const [elapsedTime, setElapsedTime] = createSignal('00:00');
  const [isRecording, setIsRecording] = createSignal(false);
  const [recordingNotSupported, setRecordingNotSupported] = createSignal(false);
  const [isLoadingRecording, setIsLoadingRecording] = createSignal(false);

  // follow-up prompts
  const [followUpPromptsStatus, setFollowUpPromptsStatus] = createSignal<boolean>(false);
  const [followUpPrompts, setFollowUpPrompts] = createSignal<string[]>([]);

  // Cache for choose_one_option answers within the current session
  const [chooseOneOptionCache, setChooseOneOptionCache] = createSignal<Record<string, string>>({});

  // drag & drop
  const [isDragActive, setIsDragActive] = createSignal(false);
  const [uploadedFiles, setUploadedFiles] = createSignal<{ file: File; type: string }[]>([]);
  const [fullFileUploadAllowedTypes, setFullFileUploadAllowedTypes] = createSignal('*');
  const [fullFileUploadMaxSize, setFullFileUploadMaxSize] = createSignal<number>(0); // MB, 0 = no limit

  createMemo(() => {
    const customerId = (props.chatflowConfig?.vars as any)?.customerId;
    setChatId(customerId ? `${customerId.toString()}+${uuidv4()}` : uuidv4());
  });

  onMount(() => {
    if (botProps?.observersConfig) {
      const { observeUserInput, observeLoading, observeMessages } = botProps.observersConfig;
      typeof observeUserInput === 'function' &&
        // eslint-disable-next-line solid/reactivity
        createMemo(() => {
          observeUserInput(userInput());
        });
      typeof observeLoading === 'function' &&
        // eslint-disable-next-line solid/reactivity
        createMemo(() => {
          observeLoading(loading());
        });
      typeof observeMessages === 'function' &&
        // eslint-disable-next-line solid/reactivity
        createMemo(() => {
          observeMessages(messages());
        });
    }

    if (!bottomSpacer) return;
    setTimeout(() => {
      chatContainer?.scrollTo(0, chatContainer.scrollHeight);
    }, 50);
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      chatContainer?.scrollTo(0, chatContainer.scrollHeight);
    }, 50);
  };

  const getLastApiMessage = () => {
    const all = messages();
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].type === 'apiMessage') return all[i];
    }
    return undefined;
  };

  const logMessageCompletion = async (status: 'success' | 'abort' | 'error', question?: string, msgOverride?: Partial<MessageType>) => {
    try {
      // Skip logging if the target AI message is the very first message (starter/welcome message)
      const allMsgs = messages();
      const candidate: any = msgOverride || getLastApiMessage();
      if (allMsgs.length > 0 && allMsgs[0]?.type === 'apiMessage' && candidate) {
        const first = allMsgs[0] as any;
        const sameRef = first === candidate;
        const sameId = first?.id && candidate?.id && first.id === candidate.id;
        const sameMessageId = first?.messageId && candidate?.messageId && first.messageId === candidate.messageId;
        if (sameRef || sameId || sameMessageId) {
          return;
        }
      }

      const vars: any = (props.chatflowConfig as any)?.vars || {};
      const aimlHost: string | undefined = vars.aimlUrl;
      const msg: any = candidate;
      const payload: any = {
        apiHost: props.apiHost || '',
        question: question,
        chatId: chatId(),
        dateTime: msg?.dateTime || new Date().toISOString(),
        message: msg?.message || '',
        messageId: msg?.id || msg?.messageId,
        domainId: vars?.domainId,
        gptModel: vars?.gptModel,
        langCode: vars?.langCode,
        userId: vars?.userId,
        chatType: vars?.chatType,
        mdmModule: vars?.mdmModule,
        thoughts: msg?.thoughts,
        menuId: vars?.menuId,
        search: msg?.search,
        status,
      };
      await sendMessageLog({
        chatflowid: props.chatflowid,
        aimlHost: aimlHost,
        body: payload as any,
        onRequest: props.onRequest,
      });
    } catch (e) {
      console.error('Failed to send message log', e);
    }
  };

  /**
   * Add each chat message into localStorage
   */
  const addChatMessage = (allMessage: MessageType[]) => {
    const messages = allMessage.map((item) => {
      if (item.fileUploads) {
        const fileUploads = item?.fileUploads.map((file) => ({
          type: file.type,
          name: file.name,
          mime: file.mime,
        }));
        return { ...item, fileUploads };
      }
      return item;
    });
    setLocalStorageChatflow(props.chatflowid, chatId(), { chatHistory: messages });
  };

  // Define the audioRef
  let audioRef: HTMLAudioElement | undefined;
  // CDN link for default receive sound
  const defaultReceiveSound = 'https://cdn.jsdelivr.net/gh/FlowiseAI/FlowiseChatEmbed@latest/src/assets/receive_message.mp3';
  const playReceiveSound = () => {
    if (props.textInput?.receiveMessageSound) {
      let audioSrc = defaultReceiveSound;
      if (props.textInput?.receiveSoundLocation) {
        audioSrc = props.textInput?.receiveSoundLocation;
      }
      audioRef = new Audio(audioSrc);
      audioRef.play();
    }
  };

  let hasSoundPlayed = false;

  const updateLastMessage = (text: string) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      if (!text) return allMessages;

      const last = allMessages[allMessages.length - 1] as any;
      last.message = (last.message || '') + text;

      if (last.type === 'apiMessage') {
        const re = /<(think|thinking)>([\s\S]*?)<\/\1>/g;
        let changed = false;
        let match: RegExpExecArray | null;
        const matches: { full: string; inner: string }[] = [];
        while ((match = re.exec(last.message)) !== null) {
          matches.push({ full: match[0], inner: match[2] });
        }
        if (matches.length) {
          if (!Array.isArray(last.thoughts)) last.thoughts = [];
          matches.forEach((m) => {
            const content = m.inner;
            if (content && content.length) last.thoughts.push(content);
            last.message = last.message.replace(m.full, '').trim();
            changed = true;
          });
        }
        if (changed && (!last.message || last.message.trim().length === 0)) {
          setLoading(true);
          setShowLoadingBubble(true);
        }

        if (last.message && last.message.trim().length > 0) {
          setShowLoadingBubble(false);
          setCalledTools([]);
        }
      }

      last.rating = undefined;
      last.dateTime = new Date().toISOString();
      if (!hasSoundPlayed) {
        playReceiveSound();
        hasSoundPlayed = true;
      }
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateErrorMessage = (errorMessage: string) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      const content = props.errorMessage || errorMessage;
      if (allMessages.length > 0 && allMessages[allMessages.length - 1].type === 'apiMessage') {
        const last = allMessages[allMessages.length - 1];
        const prefix = last.message && last.message.length > 0 ? '\n\n' : '';
        last.message = `${last.message ?? ''}${prefix}${content}`;
      } else {
        allMessages.push({ message: content, type: 'apiMessage' });
      }
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateLastMessageSourceDocuments = (sourceDocuments: any) => {
    setMessages((data) => {
      const updated = data.map((item, i) => {
        if (i === data.length - 1) {
          const newItem: any = { ...item };
          if (sourceDocuments === null || typeof sourceDocuments === 'undefined') {
            // Ensure the property is not present when null/undefined
            if ('sourceDocuments' in newItem) delete newItem.sourceDocuments;
          } else {
            newItem.sourceDocuments = sourceDocuments;
          }
          return newItem;
        }
        return item;
      });
      addChatMessage(updated);
      return [...updated];
    });
  };

  const updateLastMessageUsedTools = (usedTools: any[]) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      const lastMessage = allMessages[allMessages.length - 1];
      if (lastMessage.usedTools && Array.isArray(lastMessage.usedTools)) {
        lastMessage.usedTools = lastMessage.usedTools.concat(usedTools);
      } else {
        lastMessage.usedTools = usedTools;
      }
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateLoadingCalledTools = (tools: any[]) => {
    setCalledTools(Array.isArray(tools) ? tools : []);
    setShowLoadingBubble(true);
  };

  const updateLastMessageFileAnnotations = (fileAnnotations: any) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      allMessages[allMessages.length - 1].fileAnnotations = fileAnnotations;
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateLastMessageAgentReasoning = (agentReasoning: string | IAgentReasoning[]) => {
    setMessages((data) => {
      const updated = data.map((item, i) => {
        if (i === data.length - 1) {
          return { ...item, agentReasoning: typeof agentReasoning === 'string' ? JSON.parse(agentReasoning) : agentReasoning };
        }
        return item;
      });
      addChatMessage(updated);
      return [...updated];
    });
  };

  const updateAgentFlowEvent = (event: string) => {
    if (event === 'INPROGRESS') {
      setCalledTools([]);
      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        if (allMessages.length > 0 && allMessages[allMessages.length - 1].type === 'apiMessage') {
          allMessages[allMessages.length - 1].agentFlowEventStatus = event;
        } else {
          allMessages.push({ message: '', type: 'apiMessage', agentFlowEventStatus: event });
        }
        return allMessages;
      });
    } else {
      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
        allMessages[allMessages.length - 1].agentFlowEventStatus = event;
        return allMessages;
      });
    }
  };

  const updateAgentFlowExecutedData = (agentFlowExecutedData: any) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      allMessages[allMessages.length - 1].agentFlowExecutedData = agentFlowExecutedData;
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const updateLastMessageArtifacts = (artifacts: FileUpload[]) => {
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      allMessages[allMessages.length - 1].artifacts = artifacts;
      addChatMessage(allMessages);
      return allMessages;
    });
  };

  const deepMergeInputs = (lastInputs: any | null | undefined, newInputs: any) => {
    const result: any = lastInputs ? { ...lastInputs } : {};

    for (const key in newInputs) {
      if (newInputs[key] && typeof newInputs[key] === 'object' && !Array.isArray(newInputs[key])) {
        result[key] = deepMergeInputs(result[key], newInputs[key]);
      } else {
        result[key] = newInputs[key];
      }
    }

    return result;
  }

  // 복수 인터럽트를 순차 처리하고 결과를 {interruptIds, values} 매핑으로 resume
  const handleBatchActions = async (actions: any[], interruptIds?: string[]) => {
    if (!actions || actions.length === 0) return;
    if (!props.observersConfig?.callJS) {
      // callJS 없으면 첫 번째만 단건 처리
      updateLastMessageAction(actions[0], interruptIds?.[0]);
      return;
    }

    setLoading(true);
    const results: any[] = [];
    for (const action of actions) {
      const actionName = action?.action;
      const data = action?.data || {};
      let result: any = { ok: true, data: {} };
      try {
        result = await props.observersConfig.callJS(actionName, data);
      } catch (e) {
        console.error('callJS batch error:', actionName, e);
        result = { ok: false, error: String(e) };
      }
      results.push(result);
    }
    // interrupt ID 매핑으로 resume → Command(resume={id: value, ...})
    const humanInput = interruptIds
      ? { interruptIds, values: results }
      : results;
    await handleSubmit('', null, humanInput, true);
  };

  const updateLastMessageAction = (action: IAction | string, interruptId?: string) => {
    const parsedAction: IAction = typeof action === 'string' ? JSON.parse(action as any) : action;
    if (interruptId) (parsedAction as any)._interruptId = interruptId;
    if (parsedAction?.action === 'choose_one_option') {
		setShowLoadingBubble(false);
      const data: any = parsedAction.data || {};

      const prompt: string = data.question || 'Please select an option';
      const options: any[] = Array.isArray(data?.options) ? [...data.options] : [];

      const concat_options = options
        .map((option) => option.type)
        .sort()
        .join(',');

      // Cache key uses the question + option set; stable within a conversation.
      const cacheKey = prompt + ':' + concat_options;

      (async () => {
        try {
          const cached = chooseOneOptionCache()[cacheKey];
          if (cached) {
            const humanInput = { ok: true, data: { choice: cached } };
            await handleSubmit('', parsedAction, humanInput, true);
            return;
          }
        } catch (e) {
          /* ignored */
        }

        setMessages((prev) => {
          const all = [...cloneDeep(prev)];
          if (all.length > 0 && all[all.length - 1].type === 'apiMessage') {
            const lastIdx = all.length - 1;
            const prefix = all[lastIdx].message && all[lastIdx].message.length > 0 ? '\n\n' : '';
            all[lastIdx].message = `${all[lastIdx].message ?? ''}${prefix}${prompt}`;
          } else {
            all.push({ message: prompt, type: 'apiMessage' });
          }
          addChatMessage(all);
          return all;
        });

        // Add skip button
        options.push({ type: 'skip', label: props.resources?.labels?.SKIP || 'Skip' });

        setMessages((prev) => {
          const all = [...cloneDeep(prev)];
          if (all.length > 0) {
            const lastIdx = all.length - 1;
            if (all[lastIdx].type === 'apiMessage') {
              (all[lastIdx] as any).action = { ...parsedAction, elements: options, cacheKey: cacheKey, allowInput: true } as IAction;
            }
          }
          addChatMessage(all);
          return all;
        });
      })();
      return;
    }

    // ── 제네릭 callJS 액션 처리 (search, fill_input 포함) ──
    const actionName = parsedAction?.action;
    if (actionName && actionName !== 'choose_one_option') {
      if (props.observersConfig?.callJS) {
        const data: any = parsedAction.data || {};
        setChooseOneOptionCache({});
        setLoading(true);

        (async () => {
          let result: any = { ok: true, data: {} };
          try {
            result = await props.observersConfig!.callJS!(actionName, data);
          } catch (e) {
            console.error('callJS error:', actionName, e);
            result = { ok: false, error: String(e) };
          }

          // 'hold' → 액션을 보류 상태로 전환 (예: classid 변경 시 페이지 이동 대기).
          // pendingAction은 페이지 재로드 후 자동 재시도용. 해제는 아래 non-hold 분기에서 처리.
          if (result && result.hold === true) {
            setMessages((prevMessages) => {
              const allMessages = [...cloneDeep(prevMessages)];
              if (allMessages.length > 0 && allMessages[allMessages.length - 1].type === 'apiMessage') {
                if (allMessages[allMessages.length - 1].pendingAction) return prevMessages;
                allMessages[allMessages.length - 1].pendingAction = parsedAction;
                allMessages[allMessages.length - 1].action = null;
              }
              addChatMessage(allMessages);
              return allMessages;
            });
            return;
          }

          // Non-hold → 액션 처리 완료. 이전 턴에서 hold 로 저장해둔 pendingAction 이 있다면
          // 여기서 해제해야 함. 그렇지 않으면 페이지 재로드마다 같은 액션이 무한 재시도되어
          // 이미 resolve 된 interruptId 로 humanInput 을 계속 보내게 된다.
          setMessages((prevMessages) => {
            if (prevMessages.length === 0) return prevMessages;
            const lastIdx = prevMessages.length - 1;
            const last = prevMessages[lastIdx];
            if (last.type !== 'apiMessage' || !last.pendingAction) return prevMessages;
            const cleared = [...prevMessages];
            cleared[lastIdx] = { ...last, pendingAction: null };
            addChatMessage(cleared);
            return cleared;
          });

          await handleSubmit('', parsedAction, result, true);
        })();
        return;
      }
    }

    setMessages((data) => {
      const updated = data.map((item, i) => {
        if (i === data.length - 1) {
          return { ...item, action: parsedAction };
        }
        return item;
      });
      addChatMessage(updated);
      return [...updated];
    });
  };

  const clearPreviews = () => {
    // Revoke the data uris to avoid memory leaks
    previews().forEach((file) => URL.revokeObjectURL(file.preview));
    setPreviews([]);
  };

  // Handle errors
  const handleError = (message = 'Oops! There seems to be an error. Please try again.', preventOverride?: boolean) => {
    let errMessage = message;
    if (!preventOverride && props.errorMessage) {
      errMessage = props.errorMessage;
    }
    setMessages((prevMessages) => {
      const allMessages: MessageType[] = [...cloneDeep(prevMessages)];
      if (allMessages.length > 0 && allMessages[allMessages.length - 1].type === 'apiMessage') {
        const last = allMessages[allMessages.length - 1];
        const prefix = last.message && last.message.length > 0 ? '\n\n' : '';
        last.message = `${last.message ?? ''}${prefix}${errMessage}`;
      } else {
        allMessages.push({ message: errMessage, type: 'apiMessage' });
      }
      addChatMessage(allMessages);
      return allMessages;
    });

    setLoading(false);
    setUserInput('');
    setUploadedFiles([]);
    scrollToBottom();
  };

  const handleDisclaimerAccept = () => {
    setDisclaimerPopupOpen(false); // Close the disclaimer popup
    setCookie('chatbotDisclaimer', 'true', 365); // Disclaimer accepted
  };

  const promptClick = async (prompt: string) => {
    (async () => {
      await handleSubmit(prompt);
    })();
  };

  const followUpPromptClick = (prompt: string) => {
    setFollowUpPrompts([]);
    (async () => {
      await handleSubmit(prompt);
    })();
  };

  const updateMetadata = (data: any, input: string) => {
    if (data.chatId) {
      setChatId(data.chatId);
    }

    // set message id that is needed for feedback
    if (data.chatMessageId) {
      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        if (allMessages[allMessages.length - 1].type === 'apiMessage') {
          allMessages[allMessages.length - 1].messageId = data.chatMessageId;
        }
        addChatMessage(allMessages);
        return allMessages;
      });
    }

    if (input === '' && data.question) {
      // the response contains the question even if it was in an audio format
      // so if input is empty but the response contains the question, update the user message to show the question
      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        if (allMessages[allMessages.length - 2].type === 'apiMessage') return allMessages;
        allMessages[allMessages.length - 2].message = data.question;
        addChatMessage(allMessages);
        return allMessages;
      });
    }

    if (data.followUpPrompts) {
      setMessages((prevMessages) => {
        const allMessages = [...cloneDeep(prevMessages)];
        if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
        allMessages[allMessages.length - 1].followUpPrompts = data.followUpPrompts;
        addChatMessage(allMessages);
        return allMessages;
      });
      setFollowUpPrompts(JSON.parse(data.followUpPrompts));
    }
  };

  const fetchResponseFromEventStream = async (chatflowid: string, params: any, noUserMessage?: boolean) => {
    const chatId = params.chatId;
    const input = params.question;
    params.streaming = true;

    fetchEventSource(`${props.apiHost}/api/v1/prediction/${chatflowid}`, {
      openWhenHidden: true,
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json',
      },
      async onopen(response) {
        if (response.ok && response.headers.get('content-type')?.startsWith(EventStreamContentType)) {
          return; // everything's good
        } else if (response.status === 429) {
          const errMessage = (await response.text()) ?? 'Too many requests. Please try again later.';
          handleError(errMessage, true);
          throw new Error(errMessage);
        } else if (response.status === 403) {
          const errMessage = (await response.text()) ?? 'Unauthorized';
          handleError(errMessage);
          throw new Error(errMessage);
        } else if (response.status === 401) {
          const errMessage = (await response.text()) ?? 'Unauthenticated';
          handleError(errMessage);
          throw new Error(errMessage);
        } else {
          throw new Error();
        }
      },
      async onmessage(ev) {
        const payload = JSON.parse(ev.data);
        switch (payload.event) {
          case 'start':
            if (!(noUserMessage ?? false)) {
              setMessages((prevMessages) => {
                const allMessages = [...cloneDeep(prevMessages)];
                if (allMessages.length > 0 && allMessages[allMessages.length - 1].type === 'apiMessage') {
                  // Ensure we start appending tokens to the existing last AI message
                } else {
                  allMessages.push({ message: '', type: 'apiMessage' });
                }
                return allMessages;
              });
              setCalledTools([]);
              setLoading(true);
            }
            break;
          case 'token':
            updateLastMessage(payload.data);
            break;
          case 'sourceDocuments':
            updateLastMessageSourceDocuments(payload.data);
            break;
          case 'usedTools':
            updateLastMessageUsedTools(payload.data);
            break;
          case 'calledTools':
            updateLoadingCalledTools(payload.data);
            break;
          case 'fileAnnotations':
            updateLastMessageFileAnnotations(payload.data);
            break;
          case 'agentReasoning':
            updateLastMessageAgentReasoning(payload.data);
            break;
          case 'agentFlowEvent':
            updateAgentFlowEvent(payload.data);
            break;
          case 'agentFlowExecutedData':
            updateAgentFlowExecutedData(payload.data);
            break;
          case 'action':
            updateLastMessageAction(payload.data, payload.interruptId);
            break;
          case 'actions':
            // 복수 인터럽트: 순차 처리 후 {interruptIds, values} 매핑으로 resume
            await handleBatchActions(payload.data, payload.interruptIds);
            break;
          case 'artifacts':
            updateLastMessageArtifacts(payload.data);
            break;
          case 'metadata':
            updateMetadata(payload.data, input);
            break;
          case 'error':
            updateErrorMessage(payload.data);
            await logMessageCompletion('error', input);
            setCalledTools([]);
			setShowLoadingBubble(false);
            break;
          case 'abort':
            abortMessage();
            await logMessageCompletion('abort', input);
            setCalledTools([]);
            closeResponse();
			setShowLoadingBubble(false);
            break;
          case 'end':
            setLocalStorageChatflow(chatflowid, chatId);
            // ensure dateTime is populated on the last AI message
            setMessages((prevMessages) => {
              const allMessages = [...cloneDeep(prevMessages)];
              if (allMessages.length > 0 && allMessages[allMessages.length - 1].type === 'apiMessage') {
                if (!allMessages[allMessages.length - 1].dateTime) {
                  allMessages[allMessages.length - 1].dateTime = new Date().toISOString();
                }
              }
              addChatMessage(allMessages);
              return allMessages;
            });
            await logMessageCompletion('success', input);
            setLoading(false);
            closeResponse();
            break;
        }
      },
      async onclose() {
        setLoading(false);
        closeResponse();
      },
      onerror(err) {
        console.error('EventSource Error: ', err);
        logMessageCompletion('error', input).catch((e) => console.error('logMessageCompletion failed', e));
        setLoading(false);
		setShowLoadingBubble(false);
        closeResponse();
        throw err;
      },
    });
  };

  const closeResponse = () => {
    setUserInput('');
    setUploadedFiles([]);
    hasSoundPlayed = false;

    // Force BotBubble refresh by updating the last message
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages.length > 0 && allMessages[allMessages.length - 1].type === 'apiMessage') {
        // Add a small update to trigger re-render
        allMessages[allMessages.length - 1] = {
          ...allMessages[allMessages.length - 1],
          // Force refresh by adding a timestamp to trigger reactivity
          refreshTrigger: Date.now(),
        };
      }
      return allMessages;
    });

    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  const abortMessage = () => {
    setIsMessageStopping(false);
    setMessages((prevMessages) => {
      const allMessages = [...cloneDeep(prevMessages)];
      if (allMessages[allMessages.length - 1].type === 'userMessage') return allMessages;
      const lastAgentReasoning = allMessages[allMessages.length - 1].agentReasoning;
      if (lastAgentReasoning && lastAgentReasoning.length > 0) {
        allMessages[allMessages.length - 1].agentReasoning = lastAgentReasoning.filter((reasoning) => !reasoning.nextAgent);
      }
      return allMessages;
    });
  };

  const handleFileUploads = async (uploads: IUploads) => {
    if (!uploadedFiles().length) return uploads;

    if (fullFileUpload()) {
      const filesWithFullUploadType = uploadedFiles().filter((file) => file.type === 'file:full');

      if (filesWithFullUploadType.length > 0) {
        const formData = new FormData();
        for (const file of filesWithFullUploadType) {
          formData.append('files', file.file);
        }
        formData.append('chatId', chatId());

        const response = await createAttachmentWithFormData({
          chatflowid: props.chatflowid,
          apiHost: props.apiHost,
          formData: formData,
        });

        if (!response.data) {
          throw new Error('Unable to upload documents');
        } else {
          const data = response.data as any;
          for (const fileResult of data) {
            const fileName = fileResult.name;
            const fileId = fileResult.fileId;
            const thumbnailData = fileResult.data;  // 이미지인 경우에만 base64 data URL

            const uploadIndex = uploads.findIndex((upload) => upload.name === fileName);
            if (uploadIndex !== -1) {
              uploads[uploadIndex] = {
                ...uploads[uploadIndex],
                data: thumbnailData || uploads[uploadIndex].data,  // 썸네일이 있으면 사용, 없으면 기존 유지
                name: fileName,
                type: 'file:full',
                fileId: fileId,
              };
            }
          }
        }
      }
    } else if (uploadsConfig()?.isRAGFileUploadAllowed) {
      const filesWithRAGUploadType = uploadedFiles().filter((file) => file.type === 'file:rag');

      if (filesWithRAGUploadType.length > 0) {
        const formData = new FormData();
        for (const file of filesWithRAGUploadType) {
          formData.append('files', file.file);
        }
        formData.append('chatId', chatId());

        const response = await upsertVectorStoreWithFormData({
          chatflowid: props.chatflowid,
          apiHost: props.apiHost,
          formData: formData,
        });

        if (!response.data) {
          throw new Error('Unable to upload documents');
        } else {
          // delay for vector store to be updated
          const delay = (delayInms: number) => {
            return new Promise((resolve) => setTimeout(resolve, delayInms));
          };
          await delay(2500); //TODO: check if embeddings can be retrieved using file name as metadata filter

          uploads = uploads.map((upload) => {
            return {
              ...upload,
              type: 'file:rag',
            };
          });
        }
      }
    }
    return uploads;
  };

  // Handle form submission
  const handleSubmit = async (value: string | object, action?: IAction | undefined | null, humanInput?: any, noUserMessage?: boolean) => {
    if (!action && typeof value === 'string' && value.trim() === '' && !previews().length) {
      return;
    }

    let formData = {};
    if (typeof value === 'object') {
      formData = value;
      value = Object.entries(value)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }

    setLoading(true);
    setShowLoadingBubble(true);
    // reset called tools indicators for new streaming response
    setCalledTools([]);
    scrollToBottom();

    let uploads: IUploads = previews().map((item) => {
      return {
        data: item.data,
        type: item.type,
        name: item.name,
        mime: item.mime,
      };
    });

    try {
      uploads = await handleFileUploads(uploads);
    } catch (error) {
      handleError('Unable to upload documents', true);
      return;
    }

    clearPreviews();
    setUploadedFiles([]);

    if (!noUserMessage) {
      setMessages((prevMessages) => {
        // localStorage에는 이미지 썸네일만 data 유지, 나머지는 data 제거
        const fileUploadsForStorage = uploads.map((u) => u.mime?.startsWith('image/') ? u : { ...u, data: undefined });
        const messages: MessageType[] = [...prevMessages, { message: value as string, type: 'userMessage', fileUploads: fileUploadsForStorage }];
        addChatMessage(messages);
        return messages;
      });
    }

    const body: IncomingInput = {
      question: value,
      chatId: chatId(),
    };

    if (startInputType() === 'formInput') {
      body.form = formData;
      delete body.question;
    }

    if (uploads && uploads.length > 0) {
      // prediction 요청에는 data(base64) 제외 — 서버가 fileId로 디스크에서 읽음
      body.uploads = uploads.map(({ data, ...rest }) => rest);
    }

    if (props.chatflowConfig) body.overrideConfig = props.chatflowConfig;

    if (props.observersConfig?.applyExtraVars && !noUserMessage) {
      if (!body.overrideConfig) body.overrideConfig = {};
      if (!body.overrideConfig.vars) body.overrideConfig.vars = {};

      const extraVars = await props.observersConfig.applyExtraVars();

      body.overrideConfig.vars = { ...((body.overrideConfig as any).vars ), ...extraVars };
    }

    if (leadEmail()) body.leadEmail = leadEmail();

    if (humanInput) {
      // interrupt ID가 action에 존재하고 humanInput에 아직 없으면 자동 래핑
      const iid = (action as any)?._interruptId;
      if (iid && !humanInput.interruptId && !humanInput.interruptIds) {
        body.humanInput = { interruptId: iid, value: humanInput };
      } else {
        body.humanInput = humanInput;
      }
    }

    if (action) {
      body.action = action;
    } else if (messages().length > 1) {
      const lastMessage = messages()[messages().length - 2];
      if (lastMessage.action) {
        body.action = lastMessage.action;
        setMessages((data) => {
          const updated = data.map((item, i) => {
            if (i === data.length - 2) {
              return { ...item, action: null };
            }
            return item;
          });
          addChatMessage(updated);
          return [...updated];
        });

        const rawHI: any = {
          status: "human_input_detected",
          data: { humanInput: value },
        };
        const pendingIid = (lastMessage.action as any)?._interruptId;
        body.humanInput = pendingIid ? { interruptId: pendingIid, value: rawHI } : rawHI;
      }
    }

    if (isChatFlowAvailableToStream()) {
      fetchResponseFromEventStream(props.chatflowid, body, noUserMessage);
    } else {
      const result = await sendMessageQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });

      if (result.data) {
        const data = result.data;

        let text = '';
        if (data.text) text = data.text;
        else if (data.json) text = JSON.stringify(data.json, null, 2);
        else text = JSON.stringify(data, null, 2);

        if (data?.chatId) setChatId(data.chatId);

        playReceiveSound();

        if (noUserMessage) {
          // Append to the last AI message instead of creating a new one
          setMessages((prev) => {
            const all = [...cloneDeep(prev)];
            if (all.length > 0) {
              const lastIdx = all.length - 1;
              if (all[lastIdx].type === 'apiMessage') {
                const prefix = all[lastIdx].message && all[lastIdx].message.length > 0 ? '\n\n' : '';
                all[lastIdx].message = `${all[lastIdx].message ?? ''}${prefix}${text}`;
                if (Array.isArray((data as any).usedTools)) {
                  (all[lastIdx] as any).usedTools = (data as any).usedTools;
                }
                if ((data as any).fileAnnotations) (all[lastIdx] as any).fileAnnotations = (data as any).fileAnnotations;
                if ((data as any).agentReasoning) (all[lastIdx] as any).agentReasoning = (data as any).agentReasoning;
                if ((data as any).agentFlowExecutedData) (all[lastIdx] as any).agentFlowExecutedData = (data as any).agentFlowExecutedData;
                if ((data as any).action) (all[lastIdx] as any).action = (data as any).action;
                if ((data as any).artifacts) (all[lastIdx] as any).artifacts = (data as any).artifacts;
                if ((data as any).sourceDocuments !== null && typeof (data as any).sourceDocuments !== 'undefined') {
                  (all[lastIdx] as any).sourceDocuments = (data as any).sourceDocuments;
                }
              }
            }
            addChatMessage(all);
            return all;
          });

          updateMetadata(data, '');
        } else {
          const newMessage = {
            message: text,
            id: data?.chatMessageId,
            usedTools: data?.usedTools,
            fileAnnotations: data?.fileAnnotations,
            agentReasoning: data?.agentReasoning,
            agentFlowExecutedData: data?.agentFlowExecutedData,
            action: data?.action,
            artifacts: data?.artifacts,
            type: 'apiMessage' as messageType,
            feedback: null,
            dateTime: new Date().toISOString(),
          } as MessageType;
          if (data?.sourceDocuments !== null && typeof data?.sourceDocuments !== 'undefined') {
            (newMessage as any).sourceDocuments = data.sourceDocuments;
          }
          setMessages((prevMessages) => {
            const allMessages = [...cloneDeep(prevMessages)];
            if (allMessages.length > 0 && allMessages[allMessages.length - 1].type === 'apiMessage') {
              const lastIdx = allMessages.length - 1;
              const prefix = allMessages[lastIdx].message && allMessages[lastIdx].message.length > 0 ? '\n\n' : '';
              allMessages[lastIdx].message = `${allMessages[lastIdx].message ?? ''}${prefix}${newMessage.message}`;
              // Merge metadata into the last AI message
              const target: any = allMessages[lastIdx];
              if (newMessage.id) target.id = newMessage.id;
              if ((newMessage as any).messageId) (target as any).messageId = (newMessage as any).messageId;
              if (Array.isArray(newMessage.usedTools)) target.usedTools = newMessage.usedTools;
              if ((newMessage as any).fileAnnotations) target.fileAnnotations = (newMessage as any).fileAnnotations;
              if ((newMessage as any).agentReasoning) target.agentReasoning = (newMessage as any).agentReasoning;
              if ((newMessage as any).agentFlowExecutedData) target.agentFlowExecutedData = (newMessage as any).agentFlowExecutedData;
              if ((newMessage as any).action) target.action = (newMessage as any).action;
              if ((newMessage as any).artifacts) target.artifacts = (newMessage as any).artifacts;
              if ((newMessage as any).sourceDocuments !== null && typeof (newMessage as any).sourceDocuments !== 'undefined') {
                target.sourceDocuments = (newMessage as any).sourceDocuments;
              }
            } else {
              allMessages.push(newMessage);
            }
            addChatMessage(allMessages);
            return allMessages;
          });
          // Log success for sync response
          await logMessageCompletion('success', value, newMessage);

          updateMetadata(data, value);
        }

        setLoading(false);
        setUserInput('');
        setUploadedFiles([]);
        scrollToBottom();
      }
      if (result.error) {
        const error = result.error;
        console.error(error);
        await logMessageCompletion('error', value);
        if (typeof error === 'object') {
          handleError(`Error: ${error?.message.replaceAll('Error:', ' ')}`);
          return;
        }
        if (typeof error === 'string') {
          handleError(error);
          return;
        }
        handleError();
        return;
      }
    }

    // Update last question to avoid saving base64 data to localStorage
    if (uploads && uploads.length > 0) {
      setMessages((data) => {
        const messages = data.map((item, i) => {
          if (i === data.length - 2 && item.type === 'userMessage') {
            if (item.fileUploads) {
              const fileUploads = item?.fileUploads.map((file) => ({
                type: file.type,
                name: file.name,
                mime: file.mime,
              }));
              return { ...item, fileUploads };
            }
          }
          return item;
        });
        addChatMessage(messages);
        return [...messages];
      });
    }
  };

  const onSubmitResponse = (actionData: any, feedback = '', type = '') => {
    let fbType = feedbackType();
    if (type) {
      fbType = type;
    }
    const question = feedback ? feedback : fbType.charAt(0).toUpperCase() + fbType.slice(1);
    handleSubmit(question, undefined, {
      type: fbType,
      startNodeId: actionData?.nodeId,
      feedback,
    });
  };

  const handleSubmitFeedback = () => {
    if (pendingActionData()) {
      onSubmitResponse(pendingActionData(), feedback());
      setOpenFeedbackDialog(false);
      setFeedback('');
      setPendingActionData(null);
      setFeedbackType('');
    }
  };

  const handleActionClick = async (elem: any, action: IAction | undefined | null) => {
    setUserInput(elem.label);
    setMessages((data) => {
      const updated = data.map((item, i) => {
        if (i === data.length - 1) {
          return { ...item, action: null };
        }
        return item;
      });
      addChatMessage(updated);
      return [...updated];
    });

    if (elem?.type && elem.type.includes('agentflowv2')) {
      const type = elem.type.includes('approve') ? 'proceed' : 'reject';
      setFeedbackType(type);

      if (action && action.data && action.data.input && action.data.input.humanInputEnableFeedback) {
        setPendingActionData(action.data);
        setOpenFeedbackDialog(true);
      } else if (action) {
        onSubmitResponse(action.data, '', type);
      }
      return;
    }

    if (action && (action as any).action === 'choose_one_option') {
		setShowLoadingBubble(true);
      if (action.cacheKey !== undefined && elem?.type !== undefined) {
        const key: string = action.cacheKey;
        const choice: string = elem?.type;
        try {
          setChooseOneOptionCache((prev) => ({ ...prev, [key]: choice }));
        } catch (e) {
          /* ignore */
        }
      }

      setMessages((prev) => {
        const all = [...cloneDeep(prev)];
        if (all.length > 0) {
          const lastIdx = all.length - 1;
          if (all[lastIdx].type === 'apiMessage') {
            const prefix = all[lastIdx].message && all[lastIdx].message.length > 0 ? '\n\n' : '';
            all[lastIdx].message = `${all[lastIdx].message ?? ''}${prefix}${elem?.label ?? (props.resources?.labels?.SKIP || 'Skip')} ✔️\n\n`;
          }
        }
        addChatMessage(all);
        return all;
      });

      const humanInput = { ok: true, data: { choice: elem?.type ?? null } };
      await handleSubmit('', action, humanInput, true);
      return;
    }

    await handleSubmit(elem.label, action);
  };

  const clearChat = () => {
    try {
      setShowLoadingBubble(false);
      setChooseOneOptionCache({});
      setCalledTools([]);
      removeLocalStorageChatHistory(props.chatflowid);
      setChatId(
        (props.chatflowConfig?.vars as any)?.customerId ? `${(props.chatflowConfig?.vars as any).customerId.toString()}+${uuidv4()}` : uuidv4(),
      );
      setUploadedFiles([]);
      const messages: MessageType[] = [
        {
          message: props.welcomeMessage ?? defaultWelcomeMessage,
          type: 'apiMessage',
        },
      ];
      if (leadsConfig()?.status && !getLocalStorageChatflow(props.chatflowid)?.lead) {
        messages.push({ message: '', type: 'leadCaptureMessage' });
      }
      setMessages(messages);
    } catch (error: any) {
      const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`;
      console.error(`error: ${errorData}`);
    }
  };

  onMount(() => {
    if (props.clearChatOnReload) {
      clearChat();
      window.addEventListener('beforeunload', clearChat);
      return () => {
        window.removeEventListener('beforeunload', clearChat);
      };
    }
	window.addEventListener('flowise:clear', clearChat);
	return () => {
		window.removeEventListener('flowise:clear', clearChat);
	};
  });

  createEffect(() => {
    if (props.starterPrompts) {
      let prompts: string[];

      if (Array.isArray(props.starterPrompts)) {
        // If starterPrompts is an array
        prompts = props.starterPrompts;
      } else {
        // If starterPrompts is a JSON object
        prompts = Object.values(props.starterPrompts).map((promptObj: { prompt: string }) => promptObj.prompt);
      }

      // Filter out any empty prompts
      return setStarterPrompts(prompts.filter((prompt) => prompt !== ''));
    }
  });

  // Auto scroll chat to bottom
  createEffect(() => {
    if (messages()) {
      if (messages().length > 1) {
        setTimeout(() => {
          chatContainer?.scrollTo(0, chatContainer.scrollHeight);
        }, 400);
      }
    }
  });

  createEffect(() => {
    if (props.fontSize && botContainer) botContainer.style.fontSize = `${props.fontSize}px`;
  });

  // eslint-disable-next-line solid/reactivity
  createEffect(async () => {
    if (props.disclaimer) {
      if (getCookie('chatbotDisclaimer') == 'true') {
        setDisclaimerPopupOpen(false);
      } else {
        setDisclaimerPopupOpen(true);
      }
    } else {
      setDisclaimerPopupOpen(false);
    }

    const chatMessage = getLocalStorageChatflow(props.chatflowid);
    if (chatMessage && Object.keys(chatMessage).length) {
      if (chatMessage.chatId) setChatId(chatMessage.chatId);
      const savedLead = chatMessage.lead;
      if (savedLead) {
        setIsLeadSaved(!!savedLead);
        setLeadEmail(savedLead.email);
      }
      const loadedMessages: MessageType[] =
        chatMessage?.chatHistory?.length > 0
          ? chatMessage.chatHistory?.map((message: MessageType) => {
              const chatHistory: MessageType = {
                messageId: message?.messageId,
                message: message.message,
                type: message.type,
                rating: message.rating,
                dateTime: message.dateTime,
              };
              if (message.thoughts) chatHistory.thoughts = message.thoughts;
              if (message.sourceDocuments) chatHistory.sourceDocuments = message.sourceDocuments;
              if (message.fileAnnotations) chatHistory.fileAnnotations = message.fileAnnotations;
              if (message.fileUploads) chatHistory.fileUploads = message.fileUploads;
              if (message.agentReasoning) chatHistory.agentReasoning = message.agentReasoning;
              if (message.action) chatHistory.action = message.action;
              if (message.pendingAction) chatHistory.pendingAction = message.pendingAction;
              if (message.artifacts) chatHistory.artifacts = message.artifacts;
              if (message.followUpPrompts) chatHistory.followUpPrompts = message.followUpPrompts;
              if (message.execution && message.execution.executionData)
                chatHistory.agentFlowExecutedData =
                  typeof message.execution.executionData === 'string' ? JSON.parse(message.execution.executionData) : message.execution.executionData;
              if (message.agentFlowExecutedData)
                chatHistory.agentFlowExecutedData =
                  typeof message.agentFlowExecutedData === 'string' ? JSON.parse(message.agentFlowExecutedData) : message.agentFlowExecutedData;
              return chatHistory;
            })
          : [{ message: props.welcomeMessage ?? defaultWelcomeMessage, type: 'apiMessage' }];

      const filteredMessages = loadedMessages.filter((message) => message.type !== 'leadCaptureMessage');
      setMessages([...filteredMessages]);
    }

    // Determine if particular chatflow is available for streaming
    const { data } = await isStreamAvailableQuery({
      chatflowid: props.chatflowid,
      apiHost: props.apiHost,
      onRequest: props.onRequest,
    });

    if (data) {
      setIsChatFlowAvailableToStream(data?.isStreaming ?? false);
    }

    // Get the chatbotConfig
    const result = await getChatbotConfig({
      chatflowid: props.chatflowid,
      apiHost: props.apiHost,
      onRequest: props.onRequest,
    });

    if (result.data) {
      const chatbotConfig = result.data;

      if (chatbotConfig.flowData) {
        const nodes = JSON.parse(chatbotConfig.flowData).nodes ?? [];
        const startNode = nodes.find((node: any) => node.data.name === 'startAgentflow');
        if (startNode) {
          const startInputType = startNode.data.inputs?.startInputType;
          setStartInputType(startInputType);

          const formInputTypes = startNode.data.inputs?.formInputTypes;
          /* example:
		  "formInputTypes": [
			  {
				"type": "string",
				"label": "From",
				"name": "from",
				"addOptions": ""
			  },
			  {
				"type": "number",
				"label": "Subject",
				"name": "subject",
				"addOptions": ""
			  },
			  {
				"type": "boolean",
				"label": "Body",
				"name": "body",
				"addOptions": ""
			  },
			  },
			  {
				"type": "options",
				"label": "Choices",
				"name": "choices",
				"addOptions": [
				  {
					"option": "choice 1"
				  },
				  {
					"option": "choice 2"
				  }
				]
			  }
			]
		  */
          if (startInputType === 'formInput' && formInputTypes && formInputTypes.length > 0) {
            for (const formInputType of formInputTypes) {
              if (formInputType.type === 'options') {
                formInputType.options = formInputType.addOptions.map((option: any) => ({
                  label: option.option,
                  name: option.option,
                }));
              }
            }
            setFormInputParams(formInputTypes);
            setFormTitle(startNode.data.inputs?.formTitle);
            setFormDescription(startNode.data.inputs?.formDescription);
          }
        }
      }

      if ((!props.starterPrompts || props.starterPrompts?.length === 0) && chatbotConfig.starterPrompts) {
        const prompts: string[] = [];
        Object.getOwnPropertyNames(chatbotConfig.starterPrompts).forEach((key) => {
          prompts.push(chatbotConfig.starterPrompts[key].prompt);
        });
        setStarterPrompts(prompts.filter((prompt) => prompt !== ''));
      }
      if (chatbotConfig.chatFeedback) {
        const chatFeedbackStatus = chatbotConfig.chatFeedback.status;
        setChatFeedbackStatus(chatFeedbackStatus);
      }
      if (chatbotConfig.uploads) {
        chatbotConfig.uploads.isSpeechToTextEnabled = chatbotConfig.uploads.isSpeechToTextEnabled ?? false;
        if (chatbotConfig.uploads.isSpeechToTextEnabled) {
          chatbotConfig.uploads.isSpeechToTextEnabled = props.textInput?.isSpeechToTextEnabled ?? false;
        }
        setUploadsConfig(chatbotConfig.uploads);
      }
      if (chatbotConfig.leads) {
        setLeadsConfig(chatbotConfig.leads);
        if (chatbotConfig.leads?.status && !getLocalStorageChatflow(props.chatflowid)?.lead) {
          setMessages((prevMessages) => [...prevMessages, { message: '', type: 'leadCaptureMessage' }]);
        }
      }
      if (chatbotConfig.followUpPrompts) {
        setFollowUpPromptsStatus(chatbotConfig.followUpPrompts.status);
      }
      if (chatbotConfig.fullFileUpload) {
        setFullFileUpload(chatbotConfig.fullFileUpload.status);
        if (chatbotConfig.fullFileUpload?.allowedUploadFileTypes) {
          setFullFileUploadAllowedTypes(chatbotConfig.fullFileUpload?.allowedUploadFileTypes);
        }
        if (chatbotConfig.fullFileUpload?.maxUploadSize) {
          setFullFileUploadMaxSize(chatbotConfig.fullFileUpload.maxUploadSize);
        }
      }
    }

    const lastMessage = messages()[messages().length - 1];
    if (lastMessage && lastMessage.type === 'apiMessage' && lastMessage.pendingAction) {
      if (props.openBot) props.openBot();
      if (props.observersConfig?.disableButton) props.observersConfig.disableButton();
      updateLastMessageAction(lastMessage.pendingAction);
    } else {
      if (props.observersConfig?.enableButton) props.observersConfig.enableButton();
    }

    if (props.initialMessage && props.initialMessage.length > 0) {
      await handleSubmit(props.initialMessage);
    }

	const firstMessage = messages()[0];
	if (firstMessage && firstMessage.type === 'apiMessage') {
		const welcomeMessage = props.welcomeMessage ?? defaultWelcomeMessage;
		if (!firstMessage.message.startsWith(welcomeMessage)) {
			setMessages((prevMessages) => {
				const allMessages = [...cloneDeep(prevMessages)];
				if (allMessages.length > 0 && allMessages[allMessages.length - 1].type === 'apiMessage') {
					allMessages[allMessages.length - 1].message = `${allMessages[allMessages.length - 1].message}\n\n${welcomeMessage}`
				} else {
					allMessages.push({ message: welcomeMessage, type: 'apiMessage' });
				}
				addChatMessage(allMessages);

				return allMessages;
			});
		}
	}

    // eslint-disable-next-line solid/reactivity
    return () => {
      setUploadedFiles([]);
      setLoading(false);
      setMessages([
        {
          message: props.welcomeMessage ?? defaultWelcomeMessage,
          type: 'apiMessage',
        },
      ]);
    };
  });

  createEffect(() => {
    if (followUpPromptsStatus() && messages().length > 0) {
      const lastMessage = messages()[messages().length - 1];
      if (lastMessage.type === 'apiMessage' && lastMessage.followUpPrompts) {
        setFollowUpPrompts(JSON.parse(lastMessage.followUpPrompts));
      } else if (lastMessage.type === 'userMessage') {
        setFollowUpPrompts([]);
      }
    }
  });

  const addRecordingToPreviews = (blob: Blob) => {
    let mimeType = '';
    const pos = blob.type.indexOf(';');
    if (pos === -1) {
      mimeType = blob.type;
    } else {
      mimeType = blob.type.substring(0, pos);
    }

    // read blob and add to previews
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as FilePreviewData;
      const upload: FilePreview = {
        data: base64data,
        preview: '../assets/wave-sound.jpg',
        type: 'audio',
        name: `audio_${Date.now()}.wav`,
        mime: mimeType,
      };
      setPreviews((prevPreviews) => [...prevPreviews, upload]);
    };
  };

  const isFileAllowedForUpload = (file: File) => {
    let acceptFile = false;
    if (uploadsConfig() && uploadsConfig()?.isImageUploadAllowed && uploadsConfig()?.imgUploadSizeAndTypes) {
      const fileType = file.type;
      const sizeInMB = file.size / 1024 / 1024;
      uploadsConfig()?.imgUploadSizeAndTypes.map((allowed) => {
        if (allowed.fileTypes.includes(fileType) && sizeInMB <= allowed.maxUploadSize) {
          acceptFile = true;
        }
      });
    }
    if (fullFileUpload()) {
      const sizeInMB = file.size / 1024 / 1024;
      // 이미지는 imgUploadSizeAndTypes의 제한 적용, 그 외는 fullFileUpload 제한 적용
      const isImage = file.type.startsWith('image/');
      let maxSize = fullFileUploadMaxSize();
      if (isImage && uploadsConfig()?.imgUploadSizeAndTypes?.length) {
        const imgLimit = uploadsConfig()!.imgUploadSizeAndTypes.find(
          (allowed) => allowed.fileTypes.includes(file.type)
        );
        if (imgLimit) maxSize = imgLimit.maxUploadSize;
      }
      if (maxSize > 0 && sizeInMB > maxSize) {
        const msg = props.resources?.labels?.FILE_SIZE_EXCEEDED
          ?? `File size ({size}MB) exceeds the maximum allowed size ({max}MB).`;
        alert(msg.replace('{size}', sizeInMB.toFixed(1)).replace('{max}', String(maxSize)));
        return false;
      }
      return true;
    }
    if (uploadsConfig() && uploadsConfig()?.isRAGFileUploadAllowed && uploadsConfig()?.fileUploadSizeAndTypes) {
      const fileExt = file.name.split('.').pop();
      if (fileExt) {
        uploadsConfig()?.fileUploadSizeAndTypes.map((allowed) => {
          if (allowed.fileTypes.length === 1 && allowed.fileTypes[0] === '*') {
            acceptFile = true;
          } else if (allowed.fileTypes.includes(`.${fileExt}`)) {
            acceptFile = true;
          }
        });
      }
    }
    if (!acceptFile) {
      alert(props.resources?.labels?.INVALID_FILE_TYPE ?? `Cannot upload file. Kindly check the allowed file types and maximum allowed size.`);
    }
    return acceptFile;
  };

  const handleFileChange = async (event: FileEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const filesList = [];
    const uploadedFiles = [];
    for (const file of files) {
      if (isFileAllowedForUpload(file) === false) {
        return;
      }
      // fullFileUpload이면 모든 파일(이미지 포함)을 attachments 엔드포인트로 전송
      if (fullFileUpload()) {
        uploadedFiles.push({ file, type: 'file:full' });
      } else if (
        !file.type ||
        !uploadsConfig()
          ?.imgUploadSizeAndTypes.map((allowed) => allowed.fileTypes)
          .join(',')
          .includes(file.type)
      ) {
        uploadedFiles.push({ file, type: 'file:rag' });
      }
      const reader = new FileReader();
      const { name } = file;
      filesList.push(
        new Promise((resolve) => {
          reader.onload = (evt) => {
            if (!evt?.target?.result) {
              return;
            }
            const { result } = evt.target;
            resolve({
              data: result,
              preview: URL.createObjectURL(file),
              type: 'file',
              name: name,
              mime: file.type,
            });
          };
          reader.readAsDataURL(file);
        }),
      );
    }

    const newFiles = await Promise.all(filesList);
    setUploadedFiles(uploadedFiles);
    setPreviews((prevPreviews) => [...prevPreviews, ...(newFiles as FilePreview[])]);
  };

  // 클립보드 붙여넣기로 이미지 첨부
  const handlePaste = async (files: File[]) => {
    if (!files.length) return;
    const filesList: Promise<any>[] = [];
    const newUploadedFiles: { file: File; type: string }[] = [];
    for (const file of files) {
      if (isFileAllowedForUpload(file) === false) continue;
      newUploadedFiles.push({ file, type: fullFileUpload() ? 'file:full' : 'file:rag' });
      const name = file.name || `pasted_image_${Date.now()}.png`;
      filesList.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (!evt?.target?.result) return;
            resolve({
              data: evt.target.result,
              preview: URL.createObjectURL(file),
              type: 'file',
              name: name,
              mime: file.type,
            });
          };
          reader.readAsDataURL(file);
        }),
      );
    }
    const newFiles = await Promise.all(filesList);
    setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);
    setPreviews((prev) => [...prev, ...(newFiles as FilePreview[])]);
  };

  const isFileUploadAllowed = () => {
    if (fullFileUpload()) {
      return true;
    } else if (uploadsConfig()?.isRAGFileUploadAllowed) {
      return true;
    }
    return false;
  };

  const handleDrag = (e: DragEvent) => {
    if (uploadsConfig()?.isImageUploadAllowed || isFileUploadAllowed()) {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setIsDragActive(true);
      } else if (e.type === 'dragleave') {
        setIsDragActive(false);
      }
    }
  };

  const handleDrop = async (e: InputEvent | DragEvent) => {
    if (!uploadsConfig()?.isImageUploadAllowed && !isFileUploadAllowed) {
      return;
    }
    e.preventDefault();
    setIsDragActive(false);
    const files = [];
    const uploadedFiles = [];
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      for (const file of e.dataTransfer.files) {
        if (isFileAllowedForUpload(file) === false) {
          return;
        }
        // fullFileUpload이면 모든 파일(이미지 포함)을 attachments 엔드포인트로 전송
        if (fullFileUpload()) {
          uploadedFiles.push({ file, type: 'file:full' });
        } else if (
          !file.type ||
          !uploadsConfig()
            ?.imgUploadSizeAndTypes.map((allowed) => allowed.fileTypes)
            .join(',')
            .includes(file.type)
        ) {
          uploadedFiles.push({ file, type: 'file:rag' });
        }
        const reader = new FileReader();
        const { name } = file;
        files.push(
          new Promise((resolve) => {
            reader.onload = (evt) => {
              if (!evt?.target?.result) {
                return;
              }
              const { result } = evt.target;
              let previewUrl;
              if (file.type.startsWith('audio/')) {
                previewUrl = '../assets/wave-sound.jpg';
              } else if (file.type.startsWith('image/')) {
                previewUrl = URL.createObjectURL(file);
              }
              resolve({
                data: result,
                preview: previewUrl,
                type: 'file',
                name: name,
                mime: file.type,
              });
            };
            reader.readAsDataURL(file);
          }),
        );
      }

      const newFiles = await Promise.all(files);
      setUploadedFiles(uploadedFiles);
      setPreviews((prevPreviews) => [...prevPreviews, ...(newFiles as FilePreview[])]);
    }

    if (e.dataTransfer && e.dataTransfer.items) {
      for (const item of e.dataTransfer.items) {
        if (item.kind === 'string' && item.type.match('^text/uri-list')) {
          item.getAsString((s: string) => {
            const upload: FilePreview = {
              data: s,
              preview: s,
              type: 'url',
              name: s.substring(s.lastIndexOf('/') + 1),
              mime: '',
            };
            setPreviews((prevPreviews) => [...prevPreviews, upload]);
          });
        } else if (item.kind === 'string' && item.type.match('^text/html')) {
          item.getAsString((s: string) => {
            if (s.indexOf('href') === -1) return;
            //extract href
            const start = s.substring(s.indexOf('href') + 6);
            const hrefStr = start.substring(0, start.indexOf('"'));

            const upload: FilePreview = {
              data: hrefStr,
              preview: hrefStr,
              type: 'url',
              name: hrefStr.substring(hrefStr.lastIndexOf('/') + 1),
              mime: '',
            };
            setPreviews((prevPreviews) => [...prevPreviews, upload]);
          });
        }
      }
    }
  };

  const handleDeletePreview = (itemToDelete: FilePreview) => {
    if (itemToDelete.type === 'file') {
      URL.revokeObjectURL(itemToDelete.preview); // Clean up for file
    }
    setPreviews(previews().filter((item) => item !== itemToDelete));
  };

  const onMicrophoneClicked = () => {
    startAudioRecording(setIsRecording, setRecordingNotSupported, setElapsedTime);
    setIsRecording(true);
  };

  const onRecordingCancelled = () => {
    if (!recordingNotSupported) cancelAudioRecording();
    setIsRecording(false);
    setRecordingNotSupported(false);
  };

  const onRecordingStopped = async () => {
    setIsLoadingRecording(true);
    stopAudioRecording(addRecordingToPreviews);
  };

  const getInputDisabled = (): boolean => {
    const messagesArray = messages();
    const action = messagesArray[messagesArray.length - 1]?.action;
    const hasAction = !!(action && Object.keys(action).length > 0 && !action.allowInput);

    return loading() || isRecording() || !props.chatflowid || (leadsConfig()?.status && !isLeadSaved()) || hasAction || showLoadingBubble();
  };

  createEffect(
    // listen for changes in previews
    on(previews, (uploads) => {
      // wait for audio recording to load and then send
      const containsAudio = uploads.filter((item) => item.type === 'audio').length > 0;
      if (uploads.length >= 1 && containsAudio) {
        setIsRecording(false);
        setRecordingNotSupported(false);
        promptClick('');
      }

      return () => {
        setPreviews([]);
      };
    }),
  );

  const ModelComboBox = () => {
    return (
      <div class={`flex items-center ${props.isFullPage ? 'px-3' : 'px-1.5'} space-x-3`}>
        <ComboBox
          options={props.gptModels?.values || []}
          label={props.gptModels?.label}
          defaultValue={props.gptModels?.defaultValue}
          onChange={(value: string) => {
            // 선택된 모델 값을 chatflowConfig에 저장
            if (botProps.chatflowConfig?.vars) {
              (botProps.chatflowConfig.vars as any).gptModel = value;
            }
          }}
          style={{ width: 'auto' }}
        />
        {!botProps.isFullPage && props.fastMode && (
          <Slider
            label={props.fastMode.label}
            defaultValue={
              ((props.chatflowConfig?.vars as any)?.isFastMode && (props.chatflowConfig?.vars as any).isFastMode === 'Y') ??
              props.fastMode.defaultValue ??
              false
            }
            onColor={props.fastMode.onColor ?? props.titleBackgroundColor}
            offColor={props.fastMode.offColor}
            onChange={(value: boolean) => {
              if (props.chatflowConfig?.vars as any) (props.chatflowConfig?.vars as any).isFastMode = value ? 'Y' : 'N';
            }}
          />
        )}
      </div>
    );
  };

  const previewDisplay = (item: FilePreview) => {
    if (item.mime.startsWith('image/')) {
      return (
        <button
          class="group w-12 h-12 flex items-center justify-center relative rounded-[10px] overflow-hidden transition-colors duration-200"
          onClick={() => handleDeletePreview(item)}
        >
          <img class="w-full h-full bg-cover" src={item.data as string} />
          <span class="absolute hidden group-hover:flex items-center justify-center z-10 w-full h-full top-0 left-0 bg-black/10 rounded-[10px] transition-colors duration-200">
            <TrashIcon />
          </span>
        </button>
      );
    } else if (item.mime.startsWith('audio/')) {
      return (
        <div
          class={`inline-flex basis-auto flex-grow-0 flex-shrink-0 justify-between items-center rounded-xl h-12 p-1 mr-1 bg-gray-500`}
          style={{
            width: `${chatContainer ? (botProps.isFullPage ? chatContainer?.offsetWidth / 4 : chatContainer?.offsetWidth / 2) : '200'}px`,
          }}
        >
          <audio class="block bg-cover bg-center w-full h-full rounded-none text-transparent" controls src={item.data as string} />
          <button class="w-7 h-7 flex items-center justify-center bg-transparent p-1" onClick={() => handleDeletePreview(item)}>
            <TrashIcon color="white" />
          </button>
        </div>
      );
    } else {
      return <FilePreview disabled={getInputDisabled()} item={item} onDelete={() => handleDeletePreview(item)} />;
    }
  };

  return (
    <>
      {startInputType() === 'formInput' && messages().length === 1 ? (
        <FormInputView
          title={formTitle()}
          description={formDescription()}
          inputParams={formInputParams()}
          onSubmit={(formData) => handleSubmit(formData)}
          parentBackgroundColor={props?.backgroundColor}
          backgroundColor={props?.formBackgroundColor}
          textColor={props?.formTextColor || props.botMessage?.textColor}
          sendButtonColor={props.textInput?.sendButtonColor}
          fontSize={props.fontSize}
        />
      ) : (
        <div
          ref={botContainer}
          class={'relative flex w-full h-full text-base overflow-hidden bg-cover bg-center flex-col items-center chatbot-container ' + props.class}
          onDragEnter={handleDrag}
        >
          {isDragActive() && (
            <div
              class="absolute top-0 left-0 bottom-0 right-0 w-full h-full z-50"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragEnd={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            />
          )}
          {isDragActive() && (uploadsConfig()?.isImageUploadAllowed || isFileUploadAllowed()) && (
            <div
              class="absolute top-0 left-0 bottom-0 right-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white z-40 gap-2 border-2 border-dashed"
              style={{ 'border-color': props.bubbleBackgroundColor }}
            >
              <h2 class="text-xl font-semibold">{props.resources?.labels?.DROP_HERE_TO_UPLOAD ?? 'Drop here to upload'}</h2>
            </div>
          )}

          {props.showTitle ? (
            <div
              class={'flex flex-row items-center w-full ' + (props.isFullPage ? 'h-[50px]' : 'h-[35px]') + ' absolute top-0 left-0 z-10'}
              style={{
                background: props.titleBackgroundColor || props.bubbleBackgroundColor || defaultTitleBackgroundColor,
                color: props.titleTextColor || props.bubbleTextColor || defaultBackgroundColor,
                'border-bottom': ((props.chatflowConfig as any)?.vars?.chatType === 'MANUAL') ? '1px solid #CED4DA' : undefined,
              }}
            >
              <Show when={props.titleAvatarSrc}>
                <>
                  <div style={{ width: '15px' }} />
                  <Avatar initialAvatarSrc={props.titleAvatarSrc} />
                </>
              </Show>
              <Show when={props.title}>
                <span
                  class={'px-3 ' + (props.isFullPage ? 'whitespace-pre-wrap' : 'whitespace-nowrap overflow-hidden') + ' font-semibold max-w-full'}
                >
                  {props.title}
                </span>
              </Show>

              <div style={{ flex: 1 }} />
              <Show when={props.isFullPage}>
                <ModelComboBox />
              </Show>
              {props.mdmModules != undefined && props.mdmModules.values != undefined && props.mdmModules.values.length > 0 && (
                <div class="flex items-center px-3">
                  <ComboBox
                    options={props.mdmModules?.values || []}
                    label={props.mdmModules?.label}
                    defaultValue={props.mdmModules?.defaultValue}
                    placeholder={props.resources?.labels?.MODULE_PLACEHOLDER ?? "Module"}
                    onChange={(value: string) => {
                      // 선택된 MDM 모듈 값을 chatflowConfig에 저장
                      if (botProps.chatflowConfig?.vars) {
                        (botProps.chatflowConfig.vars as any).mdmModule = value;
                      }
                    }}
                    style={{ width: '120px', 'margin-left': '2px' }}
                  />
                </div>
              )}
              <DeleteButton
                sendButtonColor={props.closeButtonColor}
                type="button"
                isDisabled={messages().length === 1 && messages()[0].message === (props.welcomeMessage ?? defaultWelcomeMessage)}
                class="my-2"
                showCloseButton={!props.isFullPage && props.showCloseButton}
                on:click={clearChat}
              >
                <span style={{ 'font-family': 'TbwBase, arial, sans-serif' }}>{props.resources?.labels?.CLEAR ?? "Clear"}</span>
              </DeleteButton>
              <Show when={props.showCloseButton && (botProps.observersConfig?.observeCloseClick || props.closeBot)}>
                <CloseButton
                  class="my-2"
                  sendButtonColor={props.closeButtonColor}
                  showCloseButton={!props.isFullPage && props.showCloseButton}
                  on:click={() => {
                    (async () => {
                      if (props.useObserverClose && botProps.observersConfig?.observeCloseClick) {
                        await botProps.observersConfig.observeCloseClick();
                      } else if (props.closeBot) {
                        props.closeBot();
                      }
                    })();
                  }}
                />
              </Show>
            </div>
          ) : null}
          {props.showTitle && !props.isFullPage ? (
            <div
              class="absolute top-[35px] left-0 right-0 z-10 flex items-center justify-end h-[40px] px-1"
              style={{ 'background-color': props.backgroundColor || defaultBackgroundColor }}
            >
              <ModelComboBox />
            </div>
          ) : null}
          <div class="flex flex-col w-full h-full justify-start z-0">
            <div
              ref={chatContainer}
              class={
                'overflow-y-scroll flex flex-col flex-grow min-w-full w-full px-3 ' +
                (props.isFullPage ? 'pt-[70px]' : 'pt-[91px]') +
                ' relative scrollable-container chatbot-chat-view scroll-smooth'
              }
            >
              <For each={[...messages()]}>
                {(message, index) => {
                  return (
                    <>
                      {message.type === 'userMessage' && (
                        <GuestBubble
                          message={message}
                          apiHost={props.apiHost}
                          chatflowid={props.chatflowid}
                          chatId={chatId()}
                          backgroundColor={props.userMessage?.backgroundColor}
                          textColor={props.userMessage?.textColor}
                          showAvatar={props.userMessage?.showAvatar}
                          avatarSrc={props.userMessage?.avatarSrc}
                          fontSize={props.fontSize}
                          renderHTML={props.renderHTML}
                        />
                      )}
                      {message.type === 'apiMessage' && message.message.trim() !== '' && (
                        <BotBubble
                          message={message}
                          fileAnnotations={message.fileAnnotations}
                          chatflowid={props.chatflowid}
                          chatId={chatId()}
                          apiHost={props.apiHost}
                          backgroundColor={props.botMessage?.backgroundColor}
                          backgroundColorEmphasize={props.botMessage?.backgroundColorEmphasize}
                          textColor={props.botMessage?.textColor}
                          feedbackColor={props.feedback?.color}
                          showAvatar={props.botMessage?.showAvatar}
                          avatarSrc={props.botMessage?.avatarSrc}
                          avatarLoadingSrc={props.botMessage?.avatarLoadingSrc}
                          avatarInfoSrc={props.botMessage?.avatarInfoSrc}
                          avatarEmptySrc={props.botMessage?.avatarEmptySrc}
                          chatFeedbackStatus={chatFeedbackStatus()}
                          fontSize={props.fontSize}
                          isLoading={loading() && index() === messages().length - 1}
                          showAgentMessages={props.showAgentMessages}
                          handleActionClick={(elem, action) => handleActionClick(elem, action)}
                          sourceDocsTitle={props.sourceDocsTitle}
                          handleSourceDocumentsClick={(sourceDocuments) => {
                            setSourcePopupSrc(sourceDocuments);
                            setSourcePopupOpen(true);
                          }}
                          dateTimeToggle={props.dateTimeToggle}
                          renderHTML={props.renderHTML}
                          callJS={botProps.observersConfig?.callJS}
                          resolveLink={botProps.observersConfig?.resolveLink}
                          observeSourceClick={botProps.observersConfig?.observeSourceClick}
                          observeMDTableClick={botProps.observersConfig?.observeMDTableClick}
                          langCode={(botProps.chatflowConfig?.vars as any).langCode}
                          showUserAvartar={props.userMessage?.showAvatar}
                          resourceLabels={props.resources?.labels}
                        />
                      )}
                      {message.type === 'leadCaptureMessage' && leadsConfig()?.status && !getLocalStorageChatflow(props.chatflowid)?.lead && (
                        <LeadCaptureBubble
                          message={message}
                          chatflowid={props.chatflowid}
                          chatId={chatId()}
                          apiHost={props.apiHost}
                          backgroundColor={props.botMessage?.backgroundColor}
                          textColor={props.botMessage?.textColor}
                          fontSize={props.fontSize}
                          showAvatar={props.botMessage?.showAvatar}
                          avatarSrc={props.botMessage?.avatarSrc}
                          leadsConfig={leadsConfig()}
                          sendButtonColor={props.textInput?.sendButtonColor}
                          isLeadSaved={isLeadSaved()}
                          setIsLeadSaved={setIsLeadSaved}
                          setLeadEmail={setLeadEmail}
                        />
                      )}
                      {message.type === 'userMessage' && loading() && index() === messages().length - 1 && (
                        <LoadingBubble
                          calledTools={calledTools()}
                          showAvatar={props.botMessage?.showAvatar}
                          avatarLoadingSrc={props.botMessage?.avatarLoadingSrc}
                          avatarSrc={props.botMessage?.avatarSrc}
                          isAppending={false}
                          renderSummaryText={props.observersConfig?.renderSummaryText}
                        />
                      )}
                      {message.type === 'apiMessage' && index() === messages().length - 1 && showLoadingBubble() && (
                        <LoadingBubble
                          calledTools={calledTools()}
                          showAvatar={props.botMessage?.showAvatar}
                          avatarLoadingSrc={props.botMessage?.avatarLoadingSrc}
                          avatarSrc={props.botMessage?.avatarSrc}
                          isAppending={message.message.trim() !== ''}
                          renderSummaryText={props.observersConfig?.renderSummaryText}
                        />
                      )}
                    </>
                  );
                }}
              </For>
            </div>
            <Show when={messages().length === 1}>
              <Show when={starterPrompts().length > 0}>
                <div class="w-full flex flex-row flex-wrap px-5 py-[10px] gap-2">
                  <For each={[...starterPrompts()]}>
                    {(key) => (
                      <StarterPromptBubble
                        prompt={key}
                        onPromptClick={() => promptClick(key)}
                        backgroundColor={props.botMessage?.backgroundColor ?? defaultBackgroundColor}
                        starterPromptFontSize={botProps.starterPromptFontSize ?? props.fontSize}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </Show>
            <Show when={messages().length > 2 && followUpPromptsStatus()}>
              <Show when={followUpPrompts().length > 0}>
                <>
                  <div class="flex items-center gap-1 px-5">
                    <SparklesIcon class="w-4 h-4" />
                    <span class="text-sm text-gray-700">Try these prompts</span>
                  </div>
                  <div class="w-full flex flex-row flex-wrap px-5 py-[10px] gap-2">
                    <For each={[...followUpPrompts()]}>
                      {(prompt, index) => (
                        <FollowUpPromptBubble
                          prompt={prompt}
                          onPromptClick={() => followUpPromptClick(prompt)}
                          starterPromptFontSize={botProps.starterPromptFontSize ?? props.fontSize}
                        />
                      )}
                    </For>
                  </div>
                </>
              </Show>
            </Show>
            <Show when={previews().length > 0}>
              <div class="w-full flex items-center justify-start gap-2 px-5 pt-2 border-t border-[#eeeeee]">
                <For each={[...previews()]}>{(item) => <>{previewDisplay(item)}</>}</For>
              </div>
            </Show>
            <div class="w-full px-5 pt-2 pb-1">
              {isRecording() ? (
                <>
                  {recordingNotSupported() ? (
                    <div class="w-full flex items-center justify-between p-4 border border-[#eeeeee]">
                      <div class="w-full flex items-center justify-between gap-3">
                        <span class="text-base">To record audio, use modern browsers like Chrome or Firefox that support audio recording.</span>
                        <button
                          class="py-2 px-4 justify-center flex items-center bg-red-500 text-white rounded-md"
                          type="button"
                          onClick={() => onRecordingCancelled()}
                        >
                          Okay
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      class={`h-auto max-h-[192px] ${
                        props.textInput?.inputHeight ? '' : (props.isFullPage ? 'min-h-[56px]' : 'min-h-[50px]')
                      } flex items-center justify-between chatbot-input border border-[#eeeeee]`}
                      data-testid="input"
                      style={{
                        margin: 'auto',
                        'background-color': props.textInput?.backgroundColor ?? defaultBackgroundColor,
                        color: props.textInput?.textColor ?? defaultTextColor,
                        ...(props.textInput?.inputHeight ? { 'min-height': `${props.textInput.inputHeight}px` } : {}),
                      }}
                    >
                      <div class="flex items-center gap-3 px-4 py-2">
                        <span>
                          <CircleDotIcon color="red" />
                        </span>
                        <span>{elapsedTime() || '00:00'}</span>
                        {isLoadingRecording() && <span class="ml-1.5">Sending...</span>}
                      </div>
                      <div class="flex items-center">
                        <CancelButton
                          buttonColor={props.textInput?.sendButtonColor}
                          type="button"
                          class={`m-0 ${props.textInput?.inputHeight ? '' : (props.isFullPage ? 'h-14' : 'h-[50px]')} flex items-center justify-center`}
                          style={props.textInput?.inputHeight ? { height: `${props.textInput.inputHeight}px` } : {}}
                          isFullPage={props.isFullPage}
                          on:click={onRecordingCancelled}
                        >
                          <span style={{ 'font-family': 'TbwBase, arial, sans-serif' }}>Send</span>
                        </CancelButton>
                        <SendButton
                          sendButtonColor={props.textInput?.sendButtonColor}
                          sendButtonSrc={props.textInput?.sendButtonSrc}
                          type="button"
                          isDisabled={loading()}
                          class={`m-0 ${props.textInput?.inputHeight ? '' : (props.isFullPage ? 'h-14' : 'h-[50px]')} flex items-center justify-center ${
                            uploadsConfig()?.isSpeechToTextEnabled ? (props.isFullPage ? 'pl-3 pr-4' : 'pl-1.5 pr-4') : 'px-4'
                          }`}
                          style={props.textInput?.inputHeight ? { height: `${props.textInput.inputHeight}px` } : {}}
                          width={props.isFullPage ? '24px' : '26px'}
                          on:click={onRecordingStopped}
                        >
                          <span style={{ 'font-family': 'TbwBase, arial, sans-serif' }}>Send</span>
                        </SendButton>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <TextInput
                  backgroundColor={props.textInput?.backgroundColor}
                  textColor={props.textInput?.textColor}
                  placeholder={props.textInput?.placeholder}
                  sendButtonColor={props.textInput?.sendButtonColor}
                  secondaryButtonColor={props.textInput?.secondaryButtonColor}
                  sendButtonSrc={props.textInput?.sendButtonSrc}
                  inputHeight={props.textInput?.inputHeight}
                  maxChars={props.textInput?.maxChars}
                  maxCharsWarningMessage={props.textInput?.maxCharsWarningMessage}
                  autoFocus={props.textInput?.autoFocus}
                  fontSize={props.fontSize}
                  disabled={getInputDisabled()}
                  inputValue={userInput()}
                  onInputChange={(value) => setUserInput(value)}
                  onSubmit={handleSubmit}
                  uploadsConfig={uploadsConfig()}
                  isFullFileUpload={fullFileUpload()}
                  fullFileUploadAllowedTypes={fullFileUploadAllowedTypes()}
                  setPreviews={setPreviews}
                  onMicrophoneClicked={onMicrophoneClicked}
                  handleFileChange={handleFileChange}
                  onPaste={handlePaste}
                  sendMessageSound={props.textInput?.sendMessageSound}
                  sendSoundLocation={props.textInput?.sendSoundLocation}
                  enableInputHistory={true}
                  maxHistorySize={10}
                  isFullPage={props.isFullPage}
                />
              )}
            </div>
            <Badge
              footer={props.footer}
              badgeBackgroundColor={props.badgeBackgroundColor}
              poweredByTextColor={props.poweredByTextColor}
              botContainer={botContainer}
            />
          </div>
        </div>
      )}
      {sourcePopupOpen() && <Popup isOpen={sourcePopupOpen()} value={sourcePopupSrc()} onClose={() => setSourcePopupOpen(false)} />}

      {disclaimerPopupOpen() && (
        <DisclaimerPopup
          isOpen={disclaimerPopupOpen()}
          onAccept={handleDisclaimerAccept}
          title={props.disclaimer?.title}
          message={props.disclaimer?.message}
          textColor={props.disclaimer?.textColor}
          buttonColor={props.disclaimer?.buttonColor}
          buttonText={props.disclaimer?.buttonText}
          buttonTextColor={props.disclaimer?.buttonTextColor}
          blurredBackgroundColor={props.disclaimer?.blurredBackgroundColor}
          backgroundColor={props.disclaimer?.backgroundColor}
          denyButtonBgColor={props.disclaimer?.denyButtonBgColor}
          denyButtonText={props.disclaimer?.denyButtonText}
          onDeny={props.closeBot}
          isFullPage={props.isFullPage}
        />
      )}

      {openFeedbackDialog() && (
        <FeedbackDialog
          isOpen={openFeedbackDialog()}
          onClose={() => {
            setOpenFeedbackDialog(false);
            handleSubmitFeedback();
          }}
          onSubmit={handleSubmitFeedback}
          feedbackValue={feedback()}
          setFeedbackValue={(value) => setFeedback(value)}
          titleLabel={props.resources?.labels?.YOUR_FEEDBACK}
          placeholderLabel={props.resources?.labels?.FEEDBACK_FORM_PLACEHOLDER}
          cancelLabel={props.resources?.labels?.CANCEL}
          submitLabel={props.resources?.labels?.SUBMIT}
        />
      )}
    </>
  );
};
