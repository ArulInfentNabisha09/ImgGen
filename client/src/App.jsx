import { useState, useRef, useEffect } from 'react';
import './index.css';

const API = 'http://localhost:5000';

// ── Step status icon helper ───────────────────────────────────────────────────
function StepIcon({ status }) {
  if (status === 'done')    return <span className="step-icon done">✓</span>;
  if (status === 'error')   return <span className="step-icon error">✕</span>;
  if (status === 'warning') return <span className="step-icon warning">⚠</span>;
  if (status === 'active')  return <span className="step-icon active"><span className="step-spinner"></span></span>;
  return <span className="step-icon pending">○</span>;
}

// ── Live Progress Tracker component ──────────────────────────────────────────
function ProgressTracker({ steps }) {
  return (
    <div className="progress-tracker">
      {steps.map((step, i) => (
        <div key={step.id || i} className={`progress-step step-${step.status}`}>
          <StepIcon status={step.status} />
          <div className="step-content">
            <div className="step-label">{step.label}</div>
            {step.detail && <div className="step-detail">{step.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [mode, setMode] = useState('creative'); // 'creative' | 'carousel' | 'instagram'
  
  // Shared inputs
  const [prompt, setPrompt] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  
  // Upload modes state
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Instagram URL mode state
  const [instagramUrl, setInstagramUrl] = useState('');
  const [igFiles, setIgFiles] = useState([]); // Downloaded files
  
  // Global app state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [progressLog, setProgressLog] = useState([]); // SSE live log
  const [liveImages, setLiveImages] = useState([]);   // progressive slide previews
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const xhrRef = useRef(null);          // abort handle for SSE XHR
  const abortCtrlRef = useRef(null);    // abort handle for creative fetch
  const fetchAbortCtrlRef = useRef(null); // abort handle for IG image fetch

  // Close lightbox on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setPreviewImage(null); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Drag & drop
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(Array.from(e.dataTransfer.files));
  };
  const handleFileInput = (e) => { if (e.target.files?.length) handleFiles(Array.from(e.target.files)); };
  const handleFiles = (files) => {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (imgs.length !== files.length) setError('Please upload only image files.'); else setError('');
    setSelectedFiles(prev => [...prev, ...imgs]);
  };
  const removeFile = (i) => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
  const removeIgFile = (i) => setIgFiles(prev => prev.filter((_, idx) => idx !== i));

  const switchMode = (m) => { 
    setMode(m); 
    setError(''); 
    setResult(null); 
    setProgressLog([]);
    setLiveImages([]);
    setLoadingStatus('');
    if (xhrRef.current) { xhrRef.current.abort(); xhrRef.current = null; }
  };

  // ── Instagram Mode: Step 1 - Fetch ────────────────────────────────────────
  const handleFetchIgImages = async () => {
    if (!instagramUrl.trim()) return setError('Please enter an Instagram URL.');
    
    // Abort any running fetch
    if (fetchAbortCtrlRef.current) fetchAbortCtrlRef.current.abort();
    const ctrl = new AbortController();
    fetchAbortCtrlRef.current = ctrl;

    setIsLoading(true);
    setLoadingStatus('Downloading images...');
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API}/api/instagram/fetch-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: instagramUrl.trim() }),
        signal: ctrl.signal
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to fetch images from Instagram.');
      }

      const { urls } = await res.json();
      
      const newFiles = [];
      for (const u of urls) {
        const fullUrl = `${API}${u}`;
        try {
          const fetchRes = await fetch(fullUrl);
          const blob = await fetchRes.blob();
          const filename = u.split('/').pop() || 'instagram_slide.jpg';
          // Force image/jpeg type — blob.type can come back empty from the server
          const mimeType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
          const file = new File([blob], filename.replace(/[?&].*$/, '') + '.jpg', { type: mimeType });
          newFiles.push(file);
        } catch (err) {
          console.error('Failed to load blob for:', fullUrl, err);
        }
      }

      if (newFiles.length === 0) {
        throw new Error('Could not process the downloaded images.');
      }

      setIgFiles(newFiles);
    } catch (err) {
      if (err.name === 'AbortError') return; // user stopped — silently exit
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      fetchAbortCtrlRef.current = null;
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  // ── Common Generate Job (SSE stream for redesign/instagram) ─────────────
  const handleSubmit = () => {
    const filesToUpload = mode === 'instagram' ? igFiles : selectedFiles;

    if (filesToUpload.length === 0) return setError('Please provide images.');
    if (mode === 'creative' && !prompt.trim()) return setError('Please enter a prompt.');
    if (mode !== 'creative' && !instagramHandle.trim()) return setError('Please enter your Instagram handle.');

    setIsLoading(true);
    setLoadingStatus('Generating magic...');
    setProgressLog([]);
    setLiveImages([]);
    setError('');
    setResult(null);

    const formData = new FormData();
    if (mode === 'creative') {
      formData.append('prompt', prompt);
    } else {
      formData.append('instagram_handle', instagramHandle);
      formData.append('prompt', prompt);
    }
    filesToUpload.forEach(f => formData.append('images', f));

    const endpoint = mode === 'creative' ? `${API}/api/generate` : `${API}/api/redesign`;

    // Creative mode: plain fetch (fast, no SSE needed)
    if (mode === 'creative') {
      const ctrl = new AbortController();
      abortCtrlRef.current = ctrl;
      fetch(endpoint, { method: 'POST', body: formData, signal: ctrl.signal })
        .then(async res => {
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error || 'Failed to generate images');
          }
          return res.json();
        })
        .then(data => {
          setResult({
            downloadUrl: `${API}${data.downloadUrl}`,
            filename:    data.zipFilename,
            total:       data.total,
            images:      data.images?.map(u => `${API}${u}`) || [],
            sourceUrl:   null
          });
        })
        .catch(err => {
          if (err.name !== 'AbortError') setError(err.message || 'An unexpected error occurred.');
        })
        .finally(() => { setIsLoading(false); setLoadingStatus(''); abortCtrlRef.current = null; });
      return;
    }

    // Carousel / Instagram mode: SSE stream via XHR
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    let buffer = '';

    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Accept', 'text/event-stream');

    xhr.onprogress = () => {
      // Parse new chunk incrementally
      const newChunk = xhr.responseText.slice(buffer.length);
      buffer = xhr.responseText;

      const lines = newChunk.split('\n');
      let currentEvent = 'message';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (currentEvent === 'progress') {
              setProgressLog(prev => [...prev, payload.message]);
              setLoadingStatus(payload.message);
            } else if (currentEvent === 'slide-ready') {
              // Progressive: show slide the moment it's done
              setLiveImages(prev => [...prev, `${API}${payload.url}`]);
            } else if (currentEvent === 'done') {
              setResult({
                downloadUrl: `${API}${payload.downloadUrl}`,
                filename:    payload.zipFilename,
                total:       payload.total,
                images:      payload.images?.map(u => `${API}${u}`) || [],
                mergedPdfUrl: payload.mergedPdfUrl ? `${API}${payload.mergedPdfUrl}` : null,
                sourceUrl:   mode === 'instagram' ? instagramUrl.trim() : null
              });
              setIsLoading(false);
              setLoadingStatus('');
            } else if (currentEvent === 'error') {
              setError(payload.error || 'Redesign failed.');
              setIsLoading(false);
              setLoadingStatus('');
            }
          } catch {}
          currentEvent = 'message'; // reset
        }
      }
    };

    xhr.onerror = () => {
      setError('Network error. Please try again.');
      setIsLoading(false);
      setLoadingStatus('');
    };

    xhr.onabort = () => {
      setIsLoading(false);
      setLoadingStatus('');
    };

    xhr.send(formData);
  };

  // ── Stop / Abort generation ──────────────────────────────────────────────
  const handleStop = () => {
    if (xhrRef.current)          { xhrRef.current.abort();          xhrRef.current = null; }
    if (abortCtrlRef.current)    { abortCtrlRef.current.abort();    abortCtrlRef.current = null; }
    if (fetchAbortCtrlRef.current){ fetchAbortCtrlRef.current.abort(); fetchAbortCtrlRef.current = null; }
    setIsLoading(false);
    setLoadingStatus('');
    setError('Generation stopped.');
  };

  const previews = selectedFiles.map(f => URL.createObjectURL(f));
  const igPreviews = igFiles.map(f => URL.createObjectURL(f));

  return (
    <div className="app-wrapper">
      <header className="header">
        <h1>Transform Your <span className="gradient-text">Imagination</span></h1>
        <p className="subtitle">Upload images or paste an Instagram link — let AI redesign everything.</p>

        <div className="mode-toggle">
          <button className={`mode-btn ${mode === 'creative'  ? 'active' : ''}`} onClick={() => switchMode('creative')}>
            🎨 Creative Remake
          </button>
          <button className={`mode-btn ${mode === 'carousel'  ? 'active' : ''}`} onClick={() => switchMode('carousel')}>
            📱 Carousel Redesign
          </button>
          <button
            className={`mode-btn ig-mode-btn ${mode === 'instagram' ? 'active ig-active' : ''}`}
            onClick={() => switchMode('instagram')}
          >
            🔗 Instagram URL
          </button>
        </div>
      </header>

      <main className="glass-container">

        {/* ── Instagram URL Mode ─────────────────────────────────────── */}
        {mode === 'instagram' ? (
          <div className="instagram-url-section">
            <div className="ig-icon-wrap">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </div>
            <p className="ig-desc">
              Paste any <strong style={{ color: '#e1306c' }}>public</strong> Instagram photo or carousel URL.
              We'll download all images automatically and redesign them with AI.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'stretch' }}>
              <input
                type="url"
                className="prompt-input handle-input"
                placeholder="https://www.instagram.com/p/ABC123/"
                value={instagramUrl}
                onChange={e => setInstagramUrl(e.target.value)}
                disabled={isLoading}
                style={{ flex: 1, margin: 0 }}
              />
              {isLoading && loadingStatus === 'Downloading images...' ? (
                <>
                  <button
                    className="generate-btn ig-generate-btn"
                    disabled
                    style={{ flex: '0 0 auto', width: 'auto', padding: '0 2rem', margin: 0, whiteSpace: 'nowrap', opacity: 0.7 }}
                  >
                    <div className="spinner"></div> Fetching...
                  </button>
                  <button
                    onClick={handleStop}
                    style={{
                      flex: '0 0 auto', padding: '0 1.5rem', margin: 0, whiteSpace: 'nowrap',
                      background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.6)',
                      borderRadius: '12px', color: '#f87171', fontWeight: 700, fontSize: '0.9rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    Stop
                  </button>
                </>
              ) : (
                <button
                  className="generate-btn ig-generate-btn"
                  onClick={handleFetchIgImages}
                  disabled={isLoading || !instagramUrl}
                  style={{ flex: '0 0 auto', width: 'auto', padding: '0 2rem', margin: 0, whiteSpace: 'nowrap' }}
                >
                  🔗 Fetch Images
                </button>
              )}
            </div>

            {/* Instagram Mode Previews */}
            {igPreviews.length > 0 && (
              <div className="preview-grid" style={{ marginBottom: '1.5rem' }}>
                {igPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={src} alt="Preview" className="preview-item" />
                    <button onClick={e => { e.stopPropagation(); removeIgFile(i); }} title="Remove"
                      style={{ position:'absolute',top:'-8px',right:'-8px',background:'#ef4444',color:'#fff',border:'none',borderRadius:'50%',width:'24px',height:'24px',cursor:'pointer',fontSize:'12px',fontWeight:'bold',boxShadow:'0 2px 4px rgba(0,0,0,0.2)',zIndex:10 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <section className="prompt-section">
              <label>Design Options</label>
              <div className="carousel-inputs">
                <input
                  type="text"
                  className="prompt-input handle-input"
                  placeholder="@your.instagram.handle (for branding)"
                  value={instagramHandle}
                  onChange={e => setInstagramHandle(e.target.value)}
                  disabled={isLoading}
                  style={{ marginBottom: '1rem' }}
                />
                <textarea
                  className="prompt-input"
                  placeholder="Design instructions (optional): e.g. Keep content same, apply dark futuristic style with cyan accents..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows="4"
                  disabled={isLoading}
                />
              </div>
            </section>
          </div>

        ) : (
          <>
            {/* ── File Upload Area ───────────────────────────────────── */}
            <div
              className={`upload-area ${isDragging ? 'drag-active' : ''}`}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">✨</div>
              <h3>Drag & Drop your images here</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>or click to browse</p>
              <input type="file" ref={fileInputRef} onChange={handleFileInput} multiple accept="image/*" style={{ display: 'none' }} />
            </div>

            {/* Carousel/Creative Previews */}
            {previews.length > 0 && (
              <div className="preview-grid">
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={src} alt="Preview" className="preview-item" />
                    <button onClick={e => { e.stopPropagation(); removeFile(i); }} title="Remove"
                      style={{ position:'absolute',top:'-8px',right:'-8px',background:'#ef4444',color:'#fff',border:'none',borderRadius:'50%',width:'24px',height:'24px',cursor:'pointer',fontSize:'12px',fontWeight:'bold',boxShadow:'0 2px 4px rgba(0,0,0,0.2)',zIndex:10 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <section className="prompt-section">
              <label>Your Vision</label>
              {mode === 'creative' ? (
                <textarea className="prompt-input" placeholder="Describe how you want to transform these images..."
                  value={prompt} onChange={e => setPrompt(e.target.value)} rows="4" disabled={isLoading} />
              ) : (
                <div className="carousel-inputs">
                  <input type="text" className="prompt-input handle-input" placeholder="@your.instagram.handle"
                    value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} disabled={isLoading}
                    style={{ marginBottom: '1rem' }} />
                  <textarea className="prompt-input"
                    placeholder="Design instructions: e.g. Keep content same, apply dark futuristic style..."
                    value={prompt} onChange={e => setPrompt(e.target.value)} rows="4" disabled={isLoading} />
                </div>
              )}
            </section>
          </>
        )}

        {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}

        {/* ── Generate / Stop Buttons ──────────────────────────────────── */}
        <div className="action-buttons" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            className={`generate-btn ${mode === 'instagram' ? 'ig-generate-btn' : ''}`}
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (mode === 'instagram' && !igFiles.length) ||
              (mode !== 'instagram' && !selectedFiles.length) ||
              (mode === 'creative'  && !prompt)
            }
          >
            {isLoading && loadingStatus !== 'Downloading images...' ? (
              <><div className="spinner"></div>Processing...</>
            ) : (
              mode === 'instagram' ? '✨ Redesign Downloaded Images' : 'Generate Magic'
            )}
          </button>
          {isLoading && loadingStatus !== 'Downloading images...' && (
            <button
              onClick={handleStop}
              style={{
                padding: '0.8rem 1.6rem',
                borderRadius: '12px',
                border: '2px solid rgba(239,68,68,0.6)',
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; e.currentTarget.style.borderColor = '#f87171'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              Stop
            </button>
          )}
        </div>

        {/* ── Live Slide Preview Grid (Progressive) ─────────────────── */}
        {liveImages.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              ⚡ SLIDES READY SO FAR
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}>
              {liveImages.map((url, i) => (
                <div key={i} onClick={() => setPreviewImage(url)} style={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                  aspectRatio: '4/5',
                  background: 'rgba(255,255,255,0.05)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  animation: 'fadeSlideIn 0.4s ease forwards',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}>
                  <img src={url} alt={`Slide ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '0.4rem 0.5rem',
                    fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600,
                  }}>
                    Slide {i + 1}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{
                  borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.15)',
                  aspectRatio: '4/5', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>Processing...</span>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ── Result Section ────────────────────────────────────────────── */}
      {result && (
        <section className="result-section">
          <h2>✨ Transformation Complete!</h2>
          {result.sourceUrl && (
            <p style={{ marginTop:'0.25rem', color:'var(--text-secondary)', fontSize:'0.85rem' }}>
              Source: <a href={result.sourceUrl} target="_blank" rel="noreferrer" style={{ color:'#e1306c' }}>{result.sourceUrl}</a>
            </p>
          )}
          <p style={{ marginTop:'0.5rem', color:'var(--text-secondary)' }}>
            Successfully redesigned {result.total} slide{result.total !== 1 ? 's' : ''}.
          </p>

          {result.images?.length > 0 && (
            <div className="preview-grid" style={{ marginTop:'2rem', marginBottom:'2rem' }}>
              {result.images.map((src, i) => (
                <div key={i} className="result-thumb-wrap" onClick={() => setPreviewImage(src)}>
                  <img src={src} alt={`Result ${i + 1}`} className="preview-item result-thumb" />
                  <div className="result-thumb-overlay">🔍 Preview</div>
                </div>
              ))}
            </div>
          )}

          {previewImage && (
            <div className="lightbox-overlay" onClick={() => setPreviewImage(null)}>
              <button className="lightbox-close" onClick={() => setPreviewImage(null)}>✕</button>
              <img src={previewImage} alt="Full preview" className="lightbox-img" onClick={e => e.stopPropagation()} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={result.downloadUrl} className="download-btn" download>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download ZIP ({result.total || 'Files'})
            </a>
            {result.mergedPdfUrl && (
              <a
                href={result.mergedPdfUrl}
                download="carousel_editable.pdf"
                className="download-btn"
                style={{ background: 'linear-gradient(135deg, #00C4CC, #7D2AE8)', border: 'none', cursor: 'pointer', textDecoration: 'none' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Editable PDF for Canva
              </a>
            )}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem', fontSize: '0.85rem' }}>
            📁 ZIP contains: <strong style={{color:'rgba(255,255,255,0.7)'}}>png/</strong> (ready to post) &amp; <strong style={{color:'#00C4CC'}}>Editable_Canva_Import.pdf</strong>
          </p>
        </section>
      )}
    </div>
  );
}

export default App;
