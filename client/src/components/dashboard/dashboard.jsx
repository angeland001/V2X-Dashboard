import * as React from "react"
import { Outlet } from "react-router-dom"
import DashboardNav from "../navigation/DashboardNav"

export function Dashboard() {
  return (
    <div className="dark bg-neutral-950 min-h-screen">
      <DashboardNav />
      <div className="container mx-auto p-6">
        <Outlet />
      </div>
    </div>
  )
}

export default Dashboard
