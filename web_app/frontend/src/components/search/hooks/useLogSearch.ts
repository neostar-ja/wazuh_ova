/**
 * useLogSearch - Custom hook for managing search state and logic
 * Centralizes all search-related state and methods
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  SearchFormState,
  DEFAULT_SEARCH_FORM,
  hasSearchCriteria,
  buildRequestParams,
  serializeParams,
  readFormFromParams,
  makeActiveChips,
  SearchResponse,
  PortListenersResponse,
  SearchSuggestion,
} from '../searchTypes'
import { searchApi } from '../../../services/api'

export function useLogSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialForm = readFormFromParams(searchParams)

  const [form, setForm] = useState<SearchFormState>(initialForm)
  const [submitted, setSubmitted] = useState<SearchFormState>(initialForm)
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      initialForm.port ||
        initialForm.srcport ||
        initialForm.dstport ||
        initialForm.srcip ||
        initialForm.dstip ||
        initialForm.proto ||
        initialForm.action ||
        initialForm.agent ||
        initialForm.source_family ||
        initialForm.group
    )
  )
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showEvents, setShowEvents] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync URL params when submitted changes
  useEffect(() => {
    setSearchParams(serializeParams(submitted), { replace: true })
  }, [submitted, setSearchParams])

  // Handle query suggestions with debounce
  useEffect(() => {
    if (!form.query.trim() || form.query.trim() === submitted.query.trim()) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      searchApi
        .suggest(form.query.trim())
        .then((resp) => setSuggestions(resp.data.suggestions ?? []))
        .catch(() => setSuggestions([]))
    }, 180)
    return () => clearTimeout(timer)
  }, [form.query, submitted.query])

  // Build request params
  const requestParams = buildRequestParams(submitted)
  const canSearch = hasSearchCriteria(form)

  // Query search results
  const flowQ = useQuery({
    queryKey: ['log-search-workbench', requestParams],
    queryFn: () =>
      searchApi.flow(requestParams).then((resp) => resp.data as SearchResponse),
    enabled: hasSearchCriteria(submitted),
    staleTime: 30_000,
  })

  // Extract matched port
  const matchedPort =
    flowQ.data?.matched_port ??
    flowQ.data?.parsed_query?.port ??
    flowQ.data?.parsed_query?.dstport ??
    flowQ.data?.parsed_query?.srcport

  // Query port listeners
  const listenersQ = useQuery({
    queryKey: ['log-search-listeners', matchedPort, submitted.proto],
    queryFn: () =>
      searchApi
        .portListeners({
          port: matchedPort,
          proto: submitted.proto || undefined,
        })
        .then((resp) => resp.data as PortListenersResponse),
    enabled: hasSearchCriteria(submitted) && matchedPort != null,
    staleTime: 60_000,
  })

  // Extract data from response
  const total = flowQ.data?.total ?? 0
  const events = flowQ.data?.events ?? []
  const sourceFamilies = (flowQ.data?.source_families ?? []).filter(
    (item: any) => item.count > 0
  )
  const topLogSources = flowQ.data?.by_log_source ?? []
  const topActions = flowQ.data?.by_action ?? []
  const topProtocols = flowQ.data?.top_proto ?? []
  const topCountries = flowQ.data?.top_country ?? []
  const topSrcIp = flowQ.data?.top_srcip ?? []
  const topDstIp = flowQ.data?.top_dstip ?? []
  const topAgents = flowQ.data?.top_agent ?? []
  const timeline = flowQ.data?.timeline ?? []
  const activeChips = makeActiveChips(submitted)

  // Methods
  const commitSearch = useCallback(
    (next: SearchFormState) => {
      setSubmitted({
        ...next,
        query: next.query.trim(),
        srcip: next.srcip.trim(),
        dstip: next.dstip.trim(),
        agent: next.agent.trim(),
        group: next.group.trim(),
      })
      setSuggestions([])
    },
    []
  )

  const handleFieldChange = useCallback(
    <K extends keyof SearchFormState>(key: K, value: SearchFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const clearField = useCallback((key: keyof SearchFormState) => {
    const next = {
      ...submitted,
      [key]: DEFAULT_SEARCH_FORM[key],
    } as SearchFormState
    setForm(next)
    commitSearch(next)
  }, [submitted, commitSearch])

  const resetSearch = useCallback(() => {
    setForm(DEFAULT_SEARCH_FORM)
    setSubmitted(DEFAULT_SEARCH_FORM)
    setSuggestions([])
    setShowAdvanced(false)
    inputRef.current?.focus()
  }, [])

  const applyPatch = useCallback(
    (patch: Partial<SearchFormState>, autoCommit = true) => {
      const next = {
        ...DEFAULT_SEARCH_FORM,
        ...form,
        ...patch,
      }
      setForm(next)
      if (autoCommit) commitSearch(next)
    },
    [form, commitSearch]
  )

  const downloadResults = useCallback(() => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            generated_at: new Date().toISOString(),
            filters: submitted,
            flow: flowQ.data ?? null,
            listeners: listenersQ.data ?? null,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `search-results-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [submitted, flowQ.data, listenersQ.data])

  return {
    // Form state
    form,
    submitted,
    showAdvanced,
    suggestions,
    showEvents,
    selectedEvent,
    inputRef,

    // Query state
    flowQ,
    listenersQ,
    canSearch,
    matchedPort,

    // Data
    total,
    events,
    sourceFamilies,
    topLogSources,
    topActions,
    topProtocols,
    topCountries,
    topSrcIp,
    topDstIp,
    topAgents,
    timeline,
    activeChips,

    // Methods
    setForm,
    setSubmitted,
    setShowAdvanced,
    setSuggestions,
    setShowEvents,
    setSelectedEvent,
    commitSearch,
    handleFieldChange,
    clearField,
    resetSearch,
    applyPatch,
    downloadResults,
  }
}
