// ============================================================
// EduAllocPro — useBriefing Hook
// Fetches Gemini district briefing + PDF download.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { fetchBriefing, postBriefingOrderPDF } from '../lib/api'
import { DEFAULT_DISTRICT_ID } from '../config'

export function useBriefing(districtId = DEFAULT_DISTRICT_ID) {
  const [briefing,  setBriefing]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBriefing(districtId)
      setBriefing(data)
    } catch (err) {
      setError(err.message || 'Failed to load briefing')
    } finally {
      setLoading(false)
    }
  }, [districtId])

  useEffect(() => { load() }, [load])

  return { briefing, loading, error, refetch: load }
}

export function usePDFDownload() {
  const [downloading, setDownloading] = useState(false)
  const [error,       setError]       = useState(null)

  const downloadPDF = useCallback(async (districtId = DEFAULT_DISTRICT_ID) => {
    setDownloading(true)
    setError(null)
    try {
      const blob = await postBriefingOrderPDF(districtId)
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = `EduAllocPro_Order_${districtId}_${new Date().toISOString().slice(0, 10)}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setError(err.message || 'PDF download failed')
    } finally {
      setDownloading(false)
    }
  }, [])

  return { downloadPDF, downloading, error }
}
