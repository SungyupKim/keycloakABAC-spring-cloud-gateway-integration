import { useEffect, useMemo, useState } from 'react'
import {
  Background, Connection, Controls, Edge, MarkerType, Node, NodeChange, Position, ReactFlow, ReactFlowInstance, applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api, Permission, Policy, Resource, Role } from '../api'
import { useI18n } from '../i18n'
import { useAction, useLoad } from '../hooks'
import { confirmDelete, Err } from './common'
import ResourceForm from '../forms/ResourceForm'
import PolicyForm, { EDITABLE_KINDS } from '../forms/PolicyForm'
import PermissionForm from '../forms/PermissionForm'
import { summary } from './Policies'

const COL_X = { r: 0, m: 360, p: 720 }
const ROW_H = 96

type Kind = 'r' | 'm' | 'p'
const kindOf = (id: string) => id[0] as Kind
const rawId = (id: string) => id.slice(2)

const idOf = (x: Resource | Permission | Policy) => ('_id' in x ? x._id : x.id)

/** Permission 의 resources/policies 를 id 배열로 바꿔 PUT 한다. */
function toBody(m: Permission, resources: string[], policies: string[]) {
  return { ...m, type: 'resource', resources, policies }
}
const resIds = (m: Permission) => m.resources.map(r => (r as { _id?: string; id?: string })._id ?? r.id)
const polIds = (m: Permission) => m.policies.map(p => p.id)

export default function Flow() {
  const { t } = useI18n()
  const res = useLoad(() => api.get<Resource[]>('/resources'))
  const perms = useLoad(() => api.get<Permission[]>('/permissions'))
  const pols = useLoad(() => api.get<Policy[]>('/policies'))
  const roles = useLoad(() => api.get<Role[]>('/roles'))
  const { error, run } = useAction()
  const [flowNodes, setFlowNodes] = useState<Node[]>([])
  const [rf, setRf] = useState<ReactFlowInstance>()
  // 오른쪽 편집 패널: 새로 만들기(item 없음) 또는 노드 편집
  const [panel, setPanel] = useState<{ kind: Kind; item?: Resource | Permission | Policy }>()

  const reloadAll = () => { res.reload(); perms.reload(); pols.reload() }

  const { nodes: built, edges } = useMemo(() => {
    const ns: Node[] = []
    const es: Edge[] = []
    const pos = (id: string, kind: Kind, i: number) => ({ x: COL_X[kind], y: i * ROW_H })

    res.data?.forEach((r, i) => {
      const id = `r:${r._id}`
      ns.push({
        id, type: 'input', position: pos(id, 'r', i), sourcePosition: Position.Right, deletable: false, className: 'flow-node flow-r',
        data: { label: (<div><strong>{r.name}</strong><div className="sub">{(r.uris ?? []).join(', ')}</div><div className="sub">{(r.scopes ?? []).map(s => s.name).join(' · ')}</div></div>) },
      })
    })
    perms.data?.forEach((m, i) => {
      const id = `m:${m.id}`
      ns.push({
        id, position: pos(id, 'm', i), sourcePosition: Position.Right, targetPosition: Position.Left, deletable: false, className: 'flow-node flow-m',
        data: { label: (<div><strong>{m.name}</strong><div className="sub">{m.decisionStrategy}</div>{!m.resources.length && !m.policies.length && <div className="sub warn">{t('flow.unlinked')}</div>}</div>) },
      })
      m.resources.forEach(r => {
        const rid = (r as { _id?: string; id?: string })._id ?? r.id
        es.push({ id: `e:r:${rid}>m:${m.id}`, source: `r:${rid}`, target: id, markerEnd: { type: MarkerType.ArrowClosed } })
      })
      m.policies.forEach(p => {
        es.push({ id: `e:m:${m.id}>p:${p.id}`, source: id, target: `p:${p.id}`, markerEnd: { type: MarkerType.ArrowClosed } })
      })
    })
    pols.data?.forEach((p, i) => {
      const id = `p:${p.id}`
      ns.push({
        id, type: 'output', position: pos(id, 'p', i), targetPosition: Position.Left, deletable: false, className: `flow-node flow-p flow-p-${p.type}`,
        data: { label: (<div><strong>{p.name}</strong><div className="sub">{p.type} · {p.logic}</div><div className="sub">{summary(p, roles.data ?? [], t)}</div></div>) },
      })
    })
    return { nodes: ns, edges: es }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.data, perms.data, pols.data, roles.data, t])

  // 데이터가 갱신돼도 사용자가 옮긴 위치와 측정된 크기는 유지한다.
  useEffect(() => {
    setFlowNodes(prev => built.map(n => {
      const old = prev.find(o => o.id === n.id)
      return old ? { ...n, position: old.position, measured: old.measured, width: old.width, height: old.height } : n
    }))
  }, [built])

  // 첫 데이터가 들어온 뒤 한 번 전체가 보이도록 맞춘다.
  const hasNodes = flowNodes.length > 0
  useEffect(() => {
    if (!rf || !hasNodes) return
    const id = setTimeout(() => rf.fitView({ padding: 0.1 }), 100)
    return () => clearTimeout(id)
  }, [rf, hasNodes])

  // 패널이 열리고 닫히면 캔버스 폭이 바뀌므로 다시 맞춘다.
  const panelOpen = !!panel
  useEffect(() => {
    if (!rf) return
    const id = setTimeout(() => rf.fitView({ padding: 0.1, duration: 200 }), 50)
    return () => clearTimeout(id)
  }, [rf, panelOpen])

  const onNodesChange = (changes: NodeChange[]) => setFlowNodes(cur => applyNodeChanges(changes, cur))

  const valid = (c: Connection | Edge) => {
    if (!c.source || !c.target) return false
    const pair = kindOf(c.source) + kindOf(c.target)
    return pair === 'rm' || pair === 'mp'
  }

  const onConnect = async (c: Connection) => {
    if (!valid(c)) return
    const [mId, resourceId, policyId] = kindOf(c.source) === 'r'
      ? [rawId(c.target), rawId(c.source), undefined] : [rawId(c.source), undefined, rawId(c.target)]
    const m = perms.data?.find(x => x.id === mId)
    if (!m) return
    const rs = resIds(m), ps = polIds(m)
    if (resourceId && !rs.includes(resourceId)) rs.push(resourceId)
    if (policyId && !ps.includes(policyId)) ps.push(policyId)
    if (await run(() => api.put(`/permissions/${m.id}`, toBody(m, rs, ps)))) perms.reload()
  }

  const onEdgesDelete = async (deleted: Edge[]) => {
    // 같은 permission 에 속한 여러 선을 한 번에 지울 수 있으므로 permission 별로 모아서 갱신한다.
    const next = new Map<string, { m: Permission; rs: string[]; ps: string[] }>()
    for (const e of deleted) {
      const mId = kindOf(e.source) === 'm' ? rawId(e.source) : rawId(e.target)
      const m = perms.data?.find(x => x.id === mId)
      if (!m) continue
      const cur = next.get(mId) ?? { m, rs: resIds(m), ps: polIds(m) }
      if (kindOf(e.source) === 'r') cur.rs = cur.rs.filter(x => x !== rawId(e.source))
      else cur.ps = cur.ps.filter(x => x !== rawId(e.target))
      next.set(mId, cur)
    }
    for (const { m, rs, ps } of next.values()) await run(() => api.put(`/permissions/${m.id}`, toBody(m, rs, ps)))
    perms.reload()
  }

  const closePanel = () => setPanel(undefined)
  const saved = () => { closePanel(); reloadAll() }

  const onNodeClick = (_: unknown, node: Node) => {
    const id = rawId(node.id)
    const kind = kindOf(node.id)
    const item = kind === 'r' ? res.data?.find(x => x._id === id)
      : kind === 'm' ? perms.data?.find(x => x.id === id)
      : pols.data?.find(x => x.id === id)
    if (item) setPanel({ kind, item })
  }

  const removeItem = async () => {
    if (!panel?.item) return
    const { kind, item } = panel
    if (!confirmDelete(item.name)) return
    const path = kind === 'r' ? `/resources/${(item as Resource)._id}` : kind === 'm' ? `/permissions/${idOf(item)}` : `/policies/${idOf(item)}`
    if (await run(() => api.del(path))) saved()
  }

  const loadError = res.error ?? perms.error ?? pols.error

  return (
    <section>
      <h2>{t('tab.flow')}</h2>
      <p className="muted">{t('flow.desc')}</p>
      <Err msg={loadError ?? error} />
      <div className="flow-toolbar">
        <button onClick={() => setPanel({ kind: 'r' })}>+ {t('res.new')}</button>
        <button onClick={() => setPanel({ kind: 'm' })}>+ {t('perm.new')}</button>
        <button onClick={() => setPanel({ kind: 'p' })}>+ {t('pol.new')}</button>
      </div>
      <div className="flow-legend">
        <span className="r">{t('flow.resources')}</span>
        <span className="m">{t('flow.permissions')}</span>
        <span className="p">{t('flow.policies')}</span>
      </div>
      <div className="flow-layout">
      <div className="flow-canvas">
        <ReactFlow
          nodes={flowNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={closePanel}
          onEdgesDelete={onEdgesDelete}
          isValidConnection={valid}
          deleteKeyCode={['Delete', 'Backspace']}
          onInit={setRf}
          minZoom={0.3}
          maxZoom={1.2}
          colorMode="system"
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {panel && (
        <aside className="flow-panel">
          <button className="close" onClick={closePanel} aria-label={t('close')}>×</button>
          {panel.kind === 'r' && (
            <ResourceForm key={(panel.item as Resource | undefined)?._id ?? 'new'} editing={panel.item as Resource | undefined} onSaved={saved} onCancel={closePanel} />
          )}
          {panel.kind === 'm' && (
            <PermissionForm key={panel.item ? idOf(panel.item) : 'new'} editing={panel.item as Permission | undefined}
              resources={res.data ?? []} policies={pols.data ?? []} onSaved={saved} onCancel={closePanel} />
          )}
          {panel.kind === 'p' && (!panel.item || EDITABLE_KINDS.includes((panel.item as Policy).type)) && (
            <PolicyForm key={panel.item ? idOf(panel.item) : 'new'} editing={panel.item as Policy | undefined} roles={roles.data ?? []} onSaved={saved} onCancel={closePanel} />
          )}
          {panel.kind === 'p' && panel.item && !EDITABLE_KINDS.includes((panel.item as Policy).type) && (
            <><h3>{panel.item.name}</h3><p className="muted">{(panel.item as Policy).type}</p></>
          )}
          {panel.item && <button className="danger delete" onClick={removeItem}>{t('delete')}</button>}
        </aside>
      )}
      </div>
    </section>
  )
}
