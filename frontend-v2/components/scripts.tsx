"use client"

import { useEffect } from "react"

export default function HeadScripts() {
  useEffect(() => {
    // Any browser-specific initialization can go here
    // This will only run on the client after hydration
  }, [])

  return null
}
