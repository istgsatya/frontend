import React from 'react'

export default function NotFound() {
  return (
    <div style={{padding: 32, fontFamily: 'Inter, system-ui, sans-serif'}}>
      <h1 style={{margin: 0}}>Page not found</h1>
      <p style={{color: '#666'}}>The page you're looking for doesn't exist.</p>
      <a href="/" className="underline" style={{marginTop: 12, display: 'inline-block'}}>Go home</a>
    </div>
  )
}
