import { useCallback, useEffect, useState } from 'react'

/** 목록 로딩 + 에러 + 재조회. */
export function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<string>()
  const reload = useCallback(() => {
    fn().then(d => { setData(d); setError(undefined) }).catch(e => setError(String(e.message ?? e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(reload, [reload])
  return { data, error, reload }
}

/** 액션 실행 중 에러를 상태로 보관한다. */
export function useAction() {
  const [error, setError] = useState<string>()
  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); setError(undefined); return true }
    catch (e) { setError(String((e as Error).message ?? e)); return false }
  }
  return { error, run }
}
