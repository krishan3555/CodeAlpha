import { useEffect, useRef, useState } from 'react'
import './App.css'

type LanguageOption = {
  code: string
  label: string
}

const languages: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
]

const defaultSource = 'en'
const defaultTarget = 'es'

function App() {
  const [text, setText] = useState('Design a translation workflow for a multilingual app.')
  const [sourceLanguage, setSourceLanguage] = useState(defaultSource)
  const [targetLanguage, setTargetLanguage] = useState(defaultTarget)
  const [translatedText, setTranslatedText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused'>('idle')
  const copyTimerRef = useRef<number | null>(null)

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    setSpeechState('idle')
  }

  useEffect(() => {
    if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.paused)) {
      window.speechSynthesis.cancel()
      setSpeechState('idle')
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [text])

  const renderLanguageOptions = () =>
    languages.map((language) => (
      <option key={language.code} value={language.code}>
        {language.label}
      </option>
    ))

  const sourceLabel = languages.find((language) => language.code === sourceLanguage)?.label ?? sourceLanguage
  const targetLabel = languages.find((language) => language.code === targetLanguage)?.label ?? targetLanguage

  const translateText = async () => {
    if (!text.trim()) {
      setError('Enter some text to translate.')
      setStatus('error')
      return
    }

    if (sourceLanguage === targetLanguage) {
      setError('Choose two different languages.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|${targetLanguage}`,
      )

      if (!response.ok) {
        throw new Error('Translation service returned an unexpected response.')
      }

      const data = (await response.json()) as {
        responseData?: { translatedText?: string }
      }

      const result = data.responseData?.translatedText?.trim()

      if (!result) {
        throw new Error('No translation was returned.')
      }

      setTranslatedText(result)
      setStatus('done')
    } catch (requestError) {
      setTranslatedText('')
      setStatus('error')
      setError(requestError instanceof Error ? requestError.message : 'Translation failed.')
    }
  }

  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage)
    setTargetLanguage(sourceLanguage)
    setTranslatedText('')
    setStatus('idle')
    setError('')
    stopSpeaking()
  }

  const handleCopy = async () => {
    if (!translatedText) {
      return
    }

    await navigator.clipboard.writeText(translatedText)
    setCopied(true)

    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current)
    }

    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false)
      copyTimerRef.current = null
    }, 1800)
  }

  const handleSpeakToggle = () => {
    if (!translatedText || !('speechSynthesis' in window)) {
      return
    }

    if (speechState === 'speaking') {
      window.speechSynthesis.pause()
      setSpeechState('paused')
      return
    }

    if (speechState === 'paused') {
      window.speechSynthesis.resume()
      setSpeechState('speaking')
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(translatedText)
    utterance.lang = targetLanguage
    utterance.rate = 0.95
    utterance.onstart = () => setSpeechState('speaking')
    utterance.onend = () => setSpeechState('idle')
    utterance.onerror = () => setSpeechState('idle')
    window.speechSynthesis.speak(utterance)
  }

  const speechButtonLabel = speechState === 'speaking' ? 'Pause' : 'Play'

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Language Translation Tool</p>
          <h1>TRANSLATE TEXT INSTANTLY</h1>
          <p className="lede">
            Enter source text, choose languages, send it to a translation API, and use the result with copy or speech playback.
          </p>
        </div>

        <div className="hero-stats" aria-label="Translation summary">
          <div>
            <span className="stat-label">Source</span>
            <strong>{sourceLabel}</strong>
          </div>
          <div>
            <span className="stat-label">Target</span>
            <strong>{targetLabel}</strong>
          </div>
          <div>
            <span className="stat-label">Mode</span>
            <strong>API-driven</strong>
          </div>
        </div>
      </section>

      <div className="content-grid">
        <section className="translator-card">
          <div className="controls-grid">
            <label>
              <span>Source language</span>
              <select value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)}>
                {renderLanguageOptions()}
              </select>
            </label>

            <button className="swap-button" type="button" onClick={handleSwapLanguages} aria-label="Swap languages">
              Swap
            </button>

            <label>
              <span>Target language</span>
              <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
                {renderLanguageOptions()}
              </select>
            </label>
          </div>

          <label className="text-block">
            <span>Text to translate</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type or paste text here"
              rows={7}
            />
          </label>

          <div className="action-row">
            <button className="primary-button" type="button" onClick={translateText} disabled={status === 'loading'}>
              {status === 'loading' ? 'Translating...' : 'Translate text'}
            </button>
            <button className="secondary-button" type="button" onClick={() => setText('')}>
              Clear input
            </button>
          </div>

          <div className={`status-banner status-${status}`} aria-live="polite">
            {status === 'idle' && 'Ready to translate.'}
            {status === 'loading' && 'Sending text to the translation API.'}
            {status === 'done' && 'Translation complete.'}
            {status === 'error' && error}
          </div>
        </section>

        <section className="result-panel" aria-labelledby="translated-result-title">
          <div className="result-header">
            <div>
              <p className="eyebrow">Translated output</p>
              <h2 id="translated-result-title">Displayed clearly on screen</h2>
            </div>

            <div className="result-actions">
              <button type="button" className="ghost-button" onClick={handleCopy} disabled={!translatedText}>
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button type="button" className="ghost-button" onClick={handleSpeakToggle} disabled={!translatedText}>
                {speechButtonLabel}
              </button>
            </div>
          </div>

          <div className="result-box">
            {translatedText ? (
              <p>{translatedText}</p>
            ) : (
              <p className="placeholder">
                Your translated text will appear here after the API responds.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
