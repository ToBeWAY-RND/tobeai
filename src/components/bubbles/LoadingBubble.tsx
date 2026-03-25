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
  fetchPropName?:(propId: string) => Promise<string> | string;
  fetchAreaTypeName?: (areaType: string) => Promise<string>;
  renderSummaryText?: (calledTools: any[]) => string[] | undefined;
  loadingLabels?: Record<string, string>;
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

const addChooseQueries = async (items: any[], queries: Set<string>, fetchPropName: (propId: string) => Promise<string> | string) => {
  for (const item of items) {
    if (item.args?.org_property_id) {
      const prop = await fetchPropName(item.args.org_property_id);
      if (prop) {
        queries.add(`'${prop}'`);
      }
    }
  }
};

const addChooseAreaQueries = async (items: any[], queries: Set<string>, fetchAreaTypeName: (areaType: string) => Promise<string>) => {
  for (const item of items) {
    if (item.args?.org_areatype_id) {
      const areatype = await fetchAreaTypeName(item.args.org_areatype_id);
      if (areatype) {
        queries.add(`'${areatype}'`);
      }
    }
  }
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

  const summaryText = createMemo<string[]>(() => {
    if (typeof props.renderSummaryText === 'function') {
      const externalSummary = props.renderSummaryText(props.calledTools || []);
      if (Array.isArray(externalSummary)) return externalSummary;
    }
    const g = grouped();
    if (!g.size) return [];
    const parts: string[] = [];

    const pendingChooseJobs: Array<Promise<void>> = [];

    // i18n helper: use loadingLabels[key] with %s substitution, fallback to English default
    const L = (key: string, fallback: string, queryText?: string): string => {
      const template = props.loadingLabels?.[key] ?? fallback;
      return queryText !== undefined ? template.replace(/%s/g, queryText) : template;
    };

    for (const [name, items] of g) {
      const queries = new Set<string>();
      if (name === 'get_property_list') {
        parts.push(L('get_property_list', 'Loading property list'));
      } else if (name === 'mdm_application_guide_retriever') {
        for (const item of items) {
          if (item.args?.query) {
            queries.add(`'${item.args.query}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('mdm_application_guide_retriever', 'Searching manual for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "mdm_menu_retriever") {
        for (const item of items) {
          if (item.args?.query) {
            queries.add(`'${item.args.query}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('mdm_menu_retriever', 'Searching menu for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "class_retriever") {
        for (const item of items) {
          if (item.args?.query) {
            queries.add(`'${item.args.query}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('class_retriever', 'Searching class for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "search_table") {
        for (const item of items) {
          if (item.args?.search_keyword) {
            queries.add(`'${item.args.search_keyword}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('search_table', 'Searching table info for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "get_table_info") {
        for (const item of items) {
          if (item.args?.applid && item.args?.schemaid && item.args?.tableid) {
            queries.add(`'${item.args.applid}/${item.args.schemaid}.${item.args.tableid}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('get_table_info', 'Loading table info for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "get_master_info") {
        for (const item of items) {
          if (item.args?.mastid) {
            queries.add(`'${item.args.mastid}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('get_master_info', 'Loading detail for master %s', Array.from(queries).join(', ')));
        }
      } else if (name === "search_master_by_property") {
        for (const item of items) {
          if (item.args?.queries && Array.isArray(item.args.queries)) {
            for (const query of item.args.queries) {
              let propId = query.property_id;
              if (!propId || !query.query) continue;
              if (query.col_property_id) propId = propId + "." + query.col_property_id;
              queries.add(`${propId}='${query.query}'`);
            }
          }
        }
        if (queries.size > 0) {
          parts.push(L('search_master_by_property', 'Searching by property %s', Array.from(queries).join(', ')));
        }
      } else if (name === "master_retriever") {
        for (const item of items) {
          if (item.args?.query) {
            queries.add(`'${item.args.query}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('master_retriever', 'Similarity search for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "choose_one_property") {
        for (const item of items) {
          if (item.args?.property_value) {
            queries.add(`'${item.args.property_value}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('choose_one_property', 'Identifying property for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "choose_one_classid") {
        for (const item of items) {
          if (item.args?.class_value) {
            queries.add(`'${item.args.class_value}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('choose_one_classid', 'Identifying class for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "choose_one_category") {
        for (const item of items) {
          if (item.args?.extracted_keyword) {
            queries.add(`'${item.args.extracted_keyword}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('choose_one_category', 'Identifying category for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "choose_one_enum_for_property") {
        if (typeof props.fetchPropName === 'function') {
          pendingChooseJobs.push(addChooseQueries(items, queries, props.fetchPropName).then(() => {
            if (queries.size > 0) {
              parts.push(L('choose_one_enum_for_property', 'Identifying value for %s', Array.from(queries).join(', ')));
            }
          }));
        } else if (queries.size > 0) {
          parts.push(L('choose_one_enum_for_property', 'Identifying value for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "choose_one_unit_for_property") {
        if (typeof props.fetchPropName === 'function') {
          pendingChooseJobs.push(addChooseQueries(items, queries, props.fetchPropName).then(() => {
            if (queries.size > 0) {
              parts.push(L('choose_one_unit_for_property', 'Identifying unit for %s', Array.from(queries).join(', ')));
            }
          }));
        } else if (queries.size > 0) {
          parts.push(L('choose_one_unit_for_property', 'Identifying unit for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "choose_one_areatype") {
        for (const item of items) {
          if (item.args?.areatype_value) {
            queries.add(`'${item.args.areatype_value}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('choose_one_areatype', 'Identifying area type for %s', Array.from(queries).join(', ')));
        }
      } else if (name === "choose_one_areaid_or_filter") {
        if (typeof props.fetchAreaTypeName === 'function') {
          pendingChooseJobs.push(addChooseAreaQueries(items, queries, props.fetchAreaTypeName).then(() => {
            if (queries.size > 0) {
              parts.push(L('choose_one_areaid_or_filter', 'Identifying filter for %s', Array.from(queries).join(', ')));
            }
          }));
        } else if (queries.size > 0) {
          parts.push(L('choose_one_areaid_or_filter', 'Identifying filter for %s', Array.from(queries).join(', ')));
        }
      } else if (name === 'fill_input') {
        for (const item of items) {
          if (item.args?.property_names) {
            item.args?.property_names.forEach((n: string) => queries.add(`'${n}'`));
          }
        }
        if (queries.size > 0) {
          parts.push(L('fill_input', 'Filling values for %s', Array.from(queries).join(', ')));
        } else {
          parts.push(L('fill_input_empty', 'Filling property values'));
        }
      } else if (name === 'get_value_pattern') {
        for (const item of items) {
          if (item.args?.property_name) {
            queries.add(`'${item.args.property_name}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('get_value_pattern', 'Analyzing value pattern for %s', Array.from(queries).join(", ")));
        } else {
          parts.push(L('get_value_pattern_empty', 'Analyzing value pattern'));
        }
      } else if (name === 'clear_fields') {
        for (const item of items) {
          if (item.args?.property_names) {
            item.args?.property_names.forEach((n: string) => queries.add(`'${n}'`));
          }
        }
        if (queries.size > 0) {
          parts.push(L('clear_fields', 'Clearing fields %s', Array.from(queries).join(', ')));
        } else {
          parts.push(L('clear_fields_empty', 'Clearing fields'));
        }
      } else if (name === 'clear_all_fields') {
        parts.push(L('clear_all_fields', 'Clearing all fields'));
      } else if (name === "search") {
        parts.push(L('search', 'Building search conditions'));
      } else if (name === "open_search_window") {
        parts.push(L('open_search_window', 'Opening search window'));
      } else if (name === "submit") {
        parts.push(L('submit', 'Submitting'));
      } else if (name.includes('get_corporation_info')) {
        for (const item of items) {
          if (item.args?.corp_name) {
            queries.add(`'${item.args.corp_name}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('get_corporation_info', 'Loading corporation info for %s', Array.from(queries).join(', ')));
        } else {
          parts.push(L('get_corporation_info_empty', 'Loading corporation info'));
        }
      } else if (name === 'corporation_code_retriever') {
        for (const item of items) {
          if (item.args?.corp_name) {
            queries.add(`'${item.args.corp_name}'`);
          }
        }
        if (queries.size > 0) {
          parts.push(L('corporation_code_retriever', 'Finding corporation code for %s', Array.from(queries).join(', ')));
        } else {
          parts.push(L('corporation_code_retriever_empty', 'Finding corporation code'));
        }
      } else if (name === "choose_one_corporation_to_get_information") {
        parts.push(L('choose_one_corporation_to_get_information', 'Identifying corporation'));
      } else {
        parts.push(L('_unknown', "Calling '%s'", name));
      }
    }

    if (pendingChooseJobs.length > 0) {
      Promise.allSettled(pendingChooseJobs).then(() => { /* ignore */ });
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
