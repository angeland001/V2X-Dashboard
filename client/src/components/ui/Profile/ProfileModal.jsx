import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Shield, MapPin, Calendar, Camera } from 'lucide-react';
import './ProfileModal.css';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export function ProfileModal({ isOpen, onClose }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ intersections: 0, alerts: 0 });
  const [isClosing, setIsClosing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Get user from localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          fetchUserStats(parsedUser.id);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  }, [isOpen]);

  const fetchUserStats = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/intersections`);
      if (response.ok) {
        const data = await response.json();
        const userIntersections = data.filter(i => i.created_by === userId) || [];
        setStats({
          intersections: userIntersections.length,
          alerts: 0 // Placeholder for future implementation
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  if (!isOpen || !user) return null;

  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username ? user.username.substring(0, 2).toUpperCase() : 'U';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('profile_picture', file);
    formData.append('user_id', user.id);

    try {
      const response = await fetch(`${API_URL}/api/users/${user.id}/profile-picture`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Update user in state and localStorage
        const updatedUser = { ...user, profile_picture: data.profile_picture };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 ${
          isClosing ? 'profile-backdrop-exit' : 'profile-backdrop-enter'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          key={isOpen ? 'open' : 'closed'}
          className={`relative w-full max-w-sm bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto ${
            isClosing ? 'profile-modal-exit' : 'profile-modal-enter'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-neutral-800/50 hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-300" />
          </button>

          {/* Header Banner */}
          <div className="h-24 bg-gradient-to-r  from-red-500 via-orange-500 to-yellow-500 profile-banner" />

          {/* Avatar */}
          <div className="flex justify-center -mt-12 mb-4 profile-avatar">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 border-4 border-neutral-900 shadow-xl flex items-center justify-center overflow-hidden">
                {user.profile_picture ? (
                  <img
                    src={`${API_URL}${user.profile_picture}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {getInitials()}
                  </span>
                )}
              </div>
              {/* Camera Overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-0 left-0 w-24 h-24 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* User Info */}
          <div className="text-center px-6 profile-info">
            <h2 className="text-2xl font-bold text-white mb-1">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.username}
            </h2>
            <p className="text-sm text-neutral-400 mb-4">@{user.username}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-neutral-800/50 profile-stats">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-200">{stats.intersections}</p>
              <p className="text-xs text-neutral-400 uppercase tracking-wide">Intersections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-200">{stats.alerts}</p>
              <p className="text-xs text-neutral-400 uppercase tracking-wide">Alerts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-200">
                {user.created_at ? Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)) : 0}
              </p>
              <p className="text-xs text-neutral-400 uppercase tracking-wide">Days</p>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 py-4 space-y-3 profile-details">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-gray-200 flex-shrink-0" />
              <span className="text-neutral-300 truncate">{user.email || 'No email set'}</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-gray-200 flex-shrink-0" />
              <span className="text-neutral-300 capitalize">{user.role || 'user'}</span>
            </div>

            {user.date_of_birth && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-200 flex-shrink-0" />
                <span className="text-neutral-300">{formatDate(user.date_of_birth)}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-gray-200 flex-shrink-0" />
              <span className="text-neutral-400 text-xs">Member since {formatDate(user.created_at)}</span>
            </div>
          </div>

          {/* Activity Progress */}
          <div className="px-6 py-4 profile-activity">
            <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wide mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Activity Level
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">Intersection Creation</span>
                  <span className="text-white font-medium">{Math.min(100, stats.intersections * 10)}%</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-full profile-progress-bar profile-progress-bar-1"
                    style={{ width: `${Math.min(100, stats.intersections * 10)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">Alert Management</span>
                  <span className="text-white font-medium">{Math.min(100, stats.alerts * 20)}%</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-full profile-progress-bar profile-progress-bar-2"
                    style={{ width: `${Math.min(100, stats.alerts * 20)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">System Usage</span>
                  <span className="text-white font-medium">85%</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-full profile-progress-bar profile-progress-bar-3"
                    style={{ width: '85%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-neutral-800/30">
            
          </div>
        </div>
      </div>
    </>
  );
}

export default ProfileModal;
