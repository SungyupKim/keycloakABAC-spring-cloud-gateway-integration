import { createContext, ReactNode, useContext, useState } from 'react'

const en = {
  loading: 'Signing in…',
  authFailed: 'Authentication init failed: ',
  logout: 'Log out',
  language: 'Language',
  'tab.resources': 'API ↔ Resources',
  'tab.flow': 'Flow',
  'flow.desc': 'Drag from a resource to a permission, and from a permission to a policy, to link them. Click a node to edit or delete it; select a line and press Delete / Backspace to unlink.',
  'flow.resources': 'Resources (API)',
  'flow.permissions': 'Permissions',
  'flow.policies': 'Policies',
  'flow.unlinked': 'Not linked yet',
  'tab.policies': 'Policies',
  'tab.permissions': 'Permissions',
  'tab.simulator': 'Policy Simulator',
  name: 'Name',
  type: 'Type',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  add: 'Add',
  cancel: 'Cancel',
  editing: 'Edit: {name}',
  noItems: 'No items',
  close: 'Close',
  confirmDelete: "Delete '{name}'?",
  'res.title': 'API ↔ Resource Mapping',
  'res.desc': 'The gateway finds the resource matching the request URI and evaluates access with its linked permissions. Scopes are HTTP methods.',
  'res.uris': 'URI patterns',
  'res.scopes': 'Scopes (Method)',
  'res.typeOpt': 'Type (optional)',
  'res.urisField': 'URI patterns (one per line)',
  'res.new': 'New resource',
  'pol.title': 'Policies',
  'pol.desc': 'A claim regex policy checks a token claim (e.g. department, preferred_username) against a regular expression — an ABAC condition.',
  'pol.kind.role': 'Role',
  'pol.kind.regex': 'Attribute (claim) regex — ABAC',
  'pol.kind.time': 'Time of day',
  'pol.condition': 'Condition',
  'pol.new': 'New policy',
  'pol.logic': 'Logic',
  'pol.positive': 'POSITIVE (allow when matched)',
  'pol.negative': 'NEGATIVE (deny when matched)',
  'pol.realmRoles': 'Realm roles',
  'pol.claim': 'Target claim',
  'pol.pattern': 'Pattern (regex)',
  'pol.hourStart': 'Start hour (0-23)',
  'pol.hourEnd': 'End hour (0-23)',
  'pol.hourRange': '{from}:00 – {to}:00',
  'perm.title': 'Permissions',
  'perm.desc': 'Link the policies that must pass to access a resource. UNANIMOUS requires all policies to pass; AFFIRMATIVE requires only one.',
  'perm.resources': 'Resources',
  'perm.policies': 'Policies',
  'perm.strategy': 'Strategy',
  'perm.strategyField': 'Decision strategy',
  'perm.new': 'New permission',
  'sim.title': 'Policy Simulator',
  'sim.desc': 'Enter a user and a request (URI, method) to preview the Keycloak policy evaluation result.',
  'sim.user': 'User',
  'sim.select': 'Select…',
  'sim.uri': 'Request URI',
  'sim.attrs': 'Extra context attributes (JSON, optional)',
  'sim.evaluate': 'Evaluate',
  'sim.result': 'Result',
  'sim.noMatch': 'No resource matches this URI (no Keycloak policy applies).',
  'sim.jsonError': 'Extra attributes must be valid JSON. e.g. {"ip": ["10.0.0.1"]}',
}

export type Key = keyof typeof en
type Dict = Record<Key, string>

const ko: Dict = {
  loading: '로그인 중…',
  authFailed: '인증 초기화 실패: ',
  logout: '로그아웃',
  language: '언어',
  'tab.resources': 'API ↔ 리소스',
  'tab.flow': 'Flow',
  'flow.desc': '리소스에서 Permission으로, Permission에서 정책으로 드래그해 연결합니다. 노드를 클릭하면 수정/삭제하고, 선을 선택해 Delete / Backspace 를 누르면 연결이 해제됩니다.',
  'flow.resources': '리소스 (API)',
  'flow.permissions': 'Permission',
  'flow.policies': '정책',
  'flow.unlinked': '아직 연결되지 않음',
  'tab.policies': '정책',
  'tab.permissions': 'Permission',
  'tab.simulator': '권한 시뮬레이터',
  name: '이름',
  type: '유형',
  edit: '수정',
  delete: '삭제',
  save: '저장',
  add: '추가',
  cancel: '취소',
  editing: '수정: {name}',
  noItems: '항목 없음',
  close: '닫기',
  confirmDelete: "'{name}' 을(를) 삭제할까요?",
  'res.title': 'API ↔ 리소스 매핑',
  'res.desc': '게이트웨이는 요청 URI 에 매칭되는 리소스를 찾아 연결된 permission 으로 권한을 평가합니다. scope 는 HTTP method 입니다.',
  'res.uris': 'URI 패턴',
  'res.scopes': 'Scope(Method)',
  'res.typeOpt': '타입 (선택)',
  'res.urisField': 'URI 패턴 (한 줄에 하나)',
  'res.new': '새 리소스',
  'pol.title': '정책',
  'pol.desc': '속성 정규식 정책은 토큰 클레임(예: department, preferred_username)을 정규식으로 검사하는 ABAC 조건입니다.',
  'pol.kind.role': 'Role',
  'pol.kind.regex': '속성(클레임) 정규식 — ABAC',
  'pol.kind.time': '시간대',
  'pol.condition': '조건',
  'pol.new': '새 정책',
  'pol.logic': 'Logic',
  'pol.positive': 'POSITIVE (조건 충족 시 허용)',
  'pol.negative': 'NEGATIVE (조건 충족 시 거부)',
  'pol.realmRoles': 'Realm Role',
  'pol.claim': '대상 클레임',
  'pol.pattern': '패턴 (정규식)',
  'pol.hourStart': '시작 시각 (0-23)',
  'pol.hourEnd': '종료 시각 (0-23)',
  'pol.hourRange': '{from}시 ~ {to}시',
  'perm.title': 'Permission',
  'perm.desc': '리소스에 접근하기 위해 충족해야 하는 정책을 연결합니다. UNANIMOUS 는 모든 정책 통과, AFFIRMATIVE 는 하나만 통과하면 허용입니다.',
  'perm.resources': '리소스',
  'perm.policies': '정책',
  'perm.strategy': '전략',
  'perm.strategyField': 'Decision strategy',
  'perm.new': '새 Permission',
  'sim.title': '권한 시뮬레이터',
  'sim.desc': '사용자와 요청(URI, Method)을 입력하면 Keycloak 정책 평가 결과를 미리 확인할 수 있습니다.',
  'sim.user': '사용자',
  'sim.select': '선택…',
  'sim.uri': '요청 URI',
  'sim.attrs': '추가 컨텍스트 속성 (JSON, 선택)',
  'sim.evaluate': '평가',
  'sim.result': '결과',
  'sim.noMatch': '이 URI 에 매칭되는 리소스가 없습니다 (적용되는 Keycloak 정책 없음).',
  'sim.jsonError': '추가 속성은 JSON 이어야 합니다. 예: {"ip": ["10.0.0.1"]}',
}

export const LANGS = { en: 'English', ko: '한국어' } as const
export type Lang = keyof typeof LANGS
const dicts: Record<Lang, Dict> = { en, ko }
const STORAGE_KEY = 'admin-console.lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'ko') return saved
  } catch { /* storage unavailable */ }
  return 'en' // default
}

let currentLang: Lang = initialLang()

/** 훅을 쓸 수 없는 곳(예: confirm 대화상자)용. */
export function translate(key: Key, params?: Record<string, string | number>): string {
  let s = dicts[currentLang][key]
  for (const [k, v] of Object.entries(params ?? {})) s = s.replace(`{${k}}`, String(v))
  return s
}

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: typeof translate }
const I18nContext = createContext<Ctx>(null!)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang)
  const setLang = (l: Lang) => {
    currentLang = l
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* ignore */ }
    document.documentElement.lang = l
    setLangState(l)
  }
  document.documentElement.lang = lang
  return <I18nContext.Provider value={{ lang, setLang, t: translate }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
