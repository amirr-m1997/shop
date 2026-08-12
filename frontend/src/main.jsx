import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import { ToastProvider } from './components/ui/use-toast.jsx'
import queryClient from './lib/queryClient.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppErrorBoundary><App /></AppErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
