import { useEffect, useMemo, useState } from 'react'
import {
  Background, Connection, Controls, Edge, MarkerType, Node, NodeChange, Position, ReactFlow, ReactFlowInstance, applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api, Permission, Policy, Resource, Role } from '../api'
import { useI18n } from '../i18n'
import { useAction, useLoad } from '../hooks'
import { Err } from './common'
import { summary } from './Policies'

const COL_X = { r: 0, m: 360, p: 720 }
const ROW_H = 96

type Kind = 'r' | 'm' | 'p'
const kindOf = (id: string) => id[0] as Kind
const rawId = (id: string) => id.slice(2)

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
  const [permName, setPermName] = useState('')
  const [resName, setResName] = useState('')
  const [resUri, setResUri] = useState('')

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

  const addPermission = async () => {
    const body = { name: permName, type: 'resource', logic: 'POSITIVE', decisionStrategy: 'UNANIMOUS', resources: [], policies: [] }
    if (await run(() => api.post('/permissions', body))) { setPermName(''); reloadAll() }
  }

  const addResource = async () => {
    const body = { name: resName, uris: resUri ? [resUri] : [], scopes: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(name => ({ name })) }
    if (await run(() => api.post('/resources', body))) { setResName(''); setResUri(''); reloadAll() }
  }

  const loadError = res.error ?? perms.error ?? pols.error

  return (
    <section>
      <h2>{t('tab.flow')}</h2>
      <p className="muted">{t('flow.desc')}</p>
      <Err msg={loadError ?? error} />
      <div className="flow-toolbar">
        <input value={resName} onChange={e => setResName(e.target.value)} placeholder={t('flow.newResource')} />
        <input value={resUri} onChange={e => setResUri(e.target.value)} placeholder={t('flow.newUri')} />
        <button disabled={!resName} onClick={addResource}>{t('flow.addResource')}</button>
        <input value={permName} onChange={e => setPermName(e.target.value)} placeholder={t('flow.newPermission')} />
        <button disabled={!permName} onClick={addPermission}>{t('flow.addPermission')}</button>
      </div>
      <div className="flow-heads">
        <span>{t('flow.resources')}</span><span>{t('flow.permissions')}</span><span>{t('flow.policies')}</span>
      </div>
      <div className="flow-canvas">
        <ReactFlow
          nodes={flowNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
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
    </section>
  )
}
