import React, { useState, useEffect } from "react"
import { TrafficOverview } from "@/components/ui/shadcn/trafficoverview"

export function HomeView() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('name');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const getUserDisplayName = () => {
    if (!user) return 'User';
    // Prefer first name if available, otherwise use username
    return user.first_name || user.username || 'User';
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome Back, {getUserDisplayName()}.</h1>
        <p className="text-muted-foreground mt-2">
          Monitor pedestrian and vehicle traffic patterns across key locations
        </p>
      </div>

      <TrafficOverview />
    </div>
  )
}

export default HomeView
