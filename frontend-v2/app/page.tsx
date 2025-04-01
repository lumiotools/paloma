import { redirect } from 'next/navigation'
import React from 'react'

const WelcomePage = () => {
  return redirect("/chat")
  return (
    <div>WelcomePage</div>
  )
}

export default WelcomePage