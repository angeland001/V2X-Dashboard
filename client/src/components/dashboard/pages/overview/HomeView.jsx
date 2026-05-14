import React, { useState, useEffect } from "react"

export function HomeView() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
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
    return user.first_name || user.username || 'User';
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome Back, {getUserDisplayName()}.</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage V2X infrastructure across key locations
        </p>
      </div>
    </div>
  )
}

export default HomeView
