import React from "react"
import { useNavigate } from "react-router-dom"

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="text-8xl font-bold text-white mb-2">404</h1>
        <p className="text-xl text-zinc-400 mb-8">Page not found</p>
        <p className="text-sm text-zinc-500 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center justify-center px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}

export default NotFound
