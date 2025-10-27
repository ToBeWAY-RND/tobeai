import { TypingBubble } from '@/components';
import { For, Show, createSignal, onCleanup, onMount, createMemo } from 'solid-js';
import { Avatar } from '../avatars/Avatar';
import { isMobile } from '@/utils/isMobileSignal';

type LoadingBubbleProps = {
  calledTools?: any[];
  showAvatar?: boolean;
  avatarLoadingSrc?: string;
  avatarSrc?: string;
  isAppending?: boolean;
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

  const summaryText = createMemo(() => {
    const g = grouped();
    if (!g.size) return [];
    const parts: string[] = [];

    for (const [name, items] of g) {
      const queries = new Set<string>();
      if (name === 'get_property_list') {
        parts.push("속성 리스트 불러오는 중");
      } else if (name === 'apply_search') {
        parts.push("검색 속성에 값 매핑 중");
      } else if (name === 'mdm_application_guide_retriever') {
        for (const item of items) {
          if (item.args?.query) {
            queries.add(`'${item.args.query}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(Array.from(queries).join(', ') + '에 대한 메뉴얼 검색 중');
        }
      } else if (name === "mdm_menu_retriever") {
        for (const item of items) {
          if (item.args?.query) {
            queries.add(`'${item.args.query}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(Array.from(queries).join(', ') + '에 대한 메뉴 검색 중');
        }
      } else if (name === "search_table") {
        for (const item of items) {
          if (item.args?.search_keyword) {
            queries.add(`'${item.args.search_keyword}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(Array.from(queries).join(', ') + '에 대한 테이블 정보 검색 중');
        }
      } else if (name === "get_table_info") {
        for (const item of items) {
          if (item.args?.applid && item.args?.schemaid && item.args?.tableid) {
            queries.add(`'${item.args.applid}/${item.args.schemaid}.${item.args.tableid}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(Array.from(queries).join(', ') + ' 테이블의 정보 불러오는 중');
        }
      } else if (name === "get_master_info") {
        for (const item of items) {
          if (item.args?.mastid) {
            queries.add(`'${item.args.mastid}'`);
          }
        }
        if (queries.size > 0) {
          parts.push('기준정보 ' + Array.from(queries).join(', ') + '의 상세정보 불러오는 중');
        }
      } else if (name === "search_master_by_property") {
        for (const item of items) {
          if (item.args?.queries && Array.isArray(item.args.queries)) {
            for (const query of item.args.queries) {
              let propId = query.property_id;
              if (!propId || !query.query) continue;
              if (query.col_property_id) propId = propId + "." + query.col_property_id;
              queries.add(`'${propId}'에 '${query.query}'`);
            }
          }
        }
        if (queries.size > 0) {
          parts.push(Array.from(queries).join(', ') + '을(를) 대입한 속성 검색 중');
        }
      } else if (name === "master_retriever") {
        for (const item of items) {
          if (item.args?.query) {
            queries.add(`'${item.args.query}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(Array.from(queries).join(', ') + '에 대한 유사도 검색 중');
        }
      } else if (name === "choose_one_property") {
        for (const item of items) {
          if (item.args?.property_value) {
            queries.add(`'${item.args.property_value}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(Array.from(queries).join(', ') + '에 대한 속성 식별 중');
        }
      } else if (name === "choose_one_enum") {
        for (const item of items) {
          if (item.args?.property_id) {
            queries.add(`'${item.args.property_id}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(Array.from(queries).join(', ') + '에 대한 속성값 식별 중');
        }
      } else if (name === "choose_one_unit") {
        for (const item of items) {
          if (item.args?.property_id) {
            queries.add(`'${item.args.property_id}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(Array.from(queries).join(', ') + '에 대한 단위 식별 중');
        }
      } else {
        parts.push(`'${name}' 호출 중`);
      }
    }
    return parts;
  });

  return (
  <div class="flex justify-start mb-2 items-start animate-fade-in host-container" style={{ 'background-color': 'transparent' }}>
    <Show when={props.showAvatar}>
      <Show when={!props.isAppending} fallback={<div class={(isMobile() ? 'w-6 h-6' : 'w-10 h-10') + ' rounded-full flex-shrink-0'} aria-hidden="true" />}>
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
