"use client"

import React from 'react'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  // Minimal client-side error boundary required by Next.js app router during dev.
  return (
    <html>
      <body>
        <div style={{padding: 32, fontFamily: 'Inter, system-ui, sans-serif'}}>
          <h1 style={{margin: 0}}>Something went wrong</h1>
          <p style={{color: '#666'}}>{error?.message ?? 'An unexpected error occurred.'}</p>
          <div style={{marginTop: 16}}>
            <button onClick={() => reset()} style={{padding: '8px 12px', borderRadius: 6}}>Try again</button>
          </div>
        </div>
      </body>
    </html>
  )
}
