import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div style={{
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      padding: '16px',
      border: '1px solid #333',
      borderRadius: '8px',
      zIndex: 10000,
      backgroundColor: '#1e1e1e',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: 'sans-serif',
      fontSize: '14px',
      maxWidth: '300px'
    }}>
      <div style={{ marginBottom: '8px' }}>
        {offlineReady ? (
          <span>App is ready to work offline.</span>
        ) : (
          <span>New content available, click on reload button to update.</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {needRefresh && (
          <button 
            onClick={() => updateServiceWorker(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Reload
          </button>
        )}
        <button 
          onClick={close}
          style={{
            padding: '6px 12px',
            backgroundColor: '#374151',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default ReloadPrompt
