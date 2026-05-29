/**
 * useNotificationSound
 *
 * Per-user notification sound preference.
 * - Loads from API once per browser session (module-level cache).
 * - All hook instances share the same state via a listener set.
 * - Falls back to localStorage so the last preference is available instantly.
 * - Uses Web Audio API (AudioContext + BufferSource) so playback works on
 *   socket events (no direct user gesture needed after first interaction).
 */
import { useState, useEffect } from 'react'
import { api, resolveApiAsset } from '../utils/api'

const STORAGE_KEY = 'notif_sound_pref_v1'

/* ── Module-level singleton state ───────────────────────────────────── */
let _prefs = {
  soundEnabled: true,
  sound: null,    // { id, name, file_url, duration } | null
  loaded: false,
  loading: false,
}
const _listeners = new Set()

/* ── Audio context (shared, created once) ───────────────────────────── */
let _audioCtx     = null
const _bufferCache = new Map()   // resolvedUrl → AudioBuffer

function _getAudioCtx() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {}
  }
  return _audioCtx
}

/** Called on first user interaction to move AudioContext out of suspended state */
function _unlockCtx() {
  const ctx = _getAudioCtx()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

// Attach unlock listener once at module init
if (typeof window !== 'undefined') {
  const _events = ['click', 'keydown', 'touchstart', 'mousedown']
  const _handler = () => {
    _unlockCtx()
    _events.forEach(e => window.removeEventListener(e, _handler))
  }
  _events.forEach(e => window.addEventListener(e, _handler, { passive: true }))
}

/* ── Preference helpers ──────────────────────────────────────────────── */
function _notifyAll() {
  const snapshot = { soundEnabled: _prefs.soundEnabled, sound: _prefs.sound }
  _listeners.forEach(fn => fn(snapshot))
}

function _persistLocal() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ soundEnabled: _prefs.soundEnabled, sound: _prefs.sound })
    )
  } catch {}
}

function _loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    _prefs.soundEnabled = saved.soundEnabled ?? true
    _prefs.sound        = saved.sound || null
  } catch {}
}

function _loadFromApi() {
  if (_prefs.loading) return
  _prefs.loading = true
  api.get('/api/notification-sounds/preference')
    .then(data => {
      _prefs.soundEnabled = data.soundEnabled ?? true
      _prefs.sound        = data.sound || null
      _prefs.loaded       = true
      _prefs.loading      = false
      _bufferCache.clear()   // invalidate cached buffer on fresh load
      _persistLocal()
      _notifyAll()
    })
    .catch(() => {
      _prefs.loaded  = true
      _prefs.loading = false
    })
}

// Initialize: localStorage (sync) then API (async)
if (!_prefs.loaded && !_prefs.loading) {
  _loadLocal()
  _loadFromApi()
}

/* ── Hook ────────────────────────────────────────────────────────────── */
export function useNotificationSound() {
  const [state, setState] = useState({
    soundEnabled: _prefs.soundEnabled,
    sound:        _prefs.sound,
  })

  useEffect(() => {
    const listener = (next) => setState(next)
    _listeners.add(listener)
    setState({ soundEnabled: _prefs.soundEnabled, sound: _prefs.sound })
    return () => _listeners.delete(listener)
  }, [])

  const toggleEnabled = () => {
    _prefs.soundEnabled = !_prefs.soundEnabled
    _persistLocal()
    _notifyAll()
    api.put('/api/notification-sounds/preference', { sound_enabled: _prefs.soundEnabled }).catch(() => {})
  }

  const selectSound = (sound) => {
    _prefs.sound = sound || null
    _bufferCache.clear()   // force re-fetch of new sound
    _persistLocal()
    _notifyAll()
    api.put('/api/notification-sounds/preference', { sound_id: sound?.id ?? null }).catch(() => {})
  }

  /**
   * Play the current notification sound.
   * Uses AudioContext + BufferSource so it works from socket events.
   * The audio buffer is fetched once and cached.
   */
  const playNotification = async () => {
    if (!_prefs.soundEnabled || !_prefs.sound?.file_url) return
    const ctx = _getAudioCtx()
    if (!ctx) return
    try {
      if (ctx.state === 'suspended') await ctx.resume()
      const url = resolveApiAsset(_prefs.sound.file_url)
      let audioBuffer = _bufferCache.get(url)
      if (!audioBuffer) {
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) return
        const arrayBuf = await res.arrayBuffer()
        audioBuffer = await ctx.decodeAudioData(arrayBuf)
        _bufferCache.set(url, audioBuffer)
      }
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      const gain = ctx.createGain()
      gain.gain.value = 0.75
      source.connect(gain)
      gain.connect(ctx.destination)
      source.start(0)
    } catch (err) {
      console.warn('[NotifSound] playback error:', err?.message || err)
    }
  }

  return {
    soundEnabled: state.soundEnabled,
    currentSound: state.sound,
    toggleEnabled,
    selectSound,
    playNotification,
  }
}
