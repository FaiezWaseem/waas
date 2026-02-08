"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Save, 
  Camera, 
  Mail, 
  Smartphone, 
  Globe, 
  Clock, 
  Moon, 
  Sun,
  Monitor,
  LogOut,
  Trash2,
  Key,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'security'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Data
  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: "https://github.com/shadcn.png",
    language: "en",
    timezone: "UTC-5",
    theme: "system",
    notifications: {
      email_marketing: false,
      email_security: true,
      push_messages: true,
      push_updates: false
    },
    security: {
      twoFactor: true
    }
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/me');
      if (res.data.user) {
        setUser(prev => ({ 
          ...prev, 
          name: res.data.user.name, 
          email: res.data.user.email,
          phone: res.data.user.phone || "",
          avatar: res.data.user.avatar_url || "https://github.com/shadcn.png",
          // created_at is available but not used in UI yet
        }));
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const res = await api.post('/me/avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        setUser(prev => ({ ...prev, avatar: res.data.url }));
      } catch (error) {
        console.error("Failed to upload avatar", error);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('/me', {
        name: user.name,
        email: user.email,
        phone: user.phone
      });
      // Optionally show success toast
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8 px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Settings</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage your account settings and preferences.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save Changes"}
          {!isSaving && <Save className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 flex-none space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Profile Picture */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Profile Picture</h3>
                    <div className="flex items-center gap-6">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-24 w-24 rounded-full object-cover ring-4 ring-white dark:ring-zinc-900 shadow-sm"
                        />
                        <button className="absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors">
                          <Camera className="h-4 w-4" />
                        </button>
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="h-8 w-8 text-white/80" />
                        </div>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      <div className="space-y-1">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          Upload new image
                        </button>
                        <p className="text-xs text-zinc-500">
                          JPG, GIF or PNG. Max size of 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Personal Information</h3>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <input
                            type="text"
                            value={user.name}
                            onChange={(e) => setUser({ ...user, name: e.target.value })}
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <input
                            type="email"
                            value={user.email}
                            onChange={(e) => setUser({ ...user, email: e.target.value })}
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone Number</label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <input
                            type="tel"
                            value={user.phone}
                            onChange={(e) => setUser({ ...user, phone: e.target.value })}
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6">
                  {/* Preferences */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Preferences</h3>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Language</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <select
                            value={user.language}
                            onChange={(e) => setUser({ ...user, language: e.target.value })}
                            className="w-full appearance-none rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-8 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100"
                          >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Timezone</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <select
                            value={user.timezone}
                            onChange={(e) => setUser({ ...user, timezone: e.target.value })}
                            className="w-full appearance-none rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-8 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100"
                          >
                            <option value="UTC-5">Eastern Time (US & Canada)</option>
                            <option value="UTC-8">Pacific Time (US & Canada)</option>
                            <option value="UTC+0">UTC</option>
                            <option value="UTC+1">Central European Time</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Appearance</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => setUser({ ...user, theme: theme.id })}
                          className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                            user.theme === theme.id
                              ? "border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-500 dark:text-indigo-400"
                              : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <theme.icon className="h-6 w-6" />
                          <span className="text-sm font-medium">{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/10">
                    <h3 className="font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Delete Account</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Permanently delete your account and all of your content.
                        </p>
                      </div>
                      <button className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                        <Trash2 className="h-4 w-4" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Email Notifications</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Security Alerts</p>
                          <p className="text-xs text-zinc-500">Get notified about login attempts and password changes.</p>
                        </div>
                        <button
                          onClick={() => setUser(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, email_security: !prev.notifications.email_security }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            user.notifications.email_security ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            user.notifications.email_security ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Marketing & Updates</p>
                          <p className="text-xs text-zinc-500">Receive news about new features and updates.</p>
                        </div>
                        <button
                          onClick={() => setUser(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, email_marketing: !prev.notifications.email_marketing }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            user.notifications.email_marketing ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            user.notifications.email_marketing ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Push Notifications */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Push Notifications</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">New Messages</p>
                          <p className="text-xs text-zinc-500">Get notified when you receive a new message.</p>
                        </div>
                        <button
                          onClick={() => setUser(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, push_messages: !prev.notifications.push_messages }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            user.notifications.push_messages ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            user.notifications.push_messages ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Two-Factor Auth */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/20">
                          <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Two-Factor Authentication (2FA)</p>
                          <p className="text-xs text-zinc-500">Add an extra layer of security to your account.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setUser(prev => ({
                          ...prev,
                          security: { ...prev.security, twoFactor: !prev.security.twoFactor }
                        }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          user.security.twoFactor ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          user.security.twoFactor ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Change Password */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Change Password</h3>
                    <div className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <input
                            type="password"
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New Password</label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <input
                            type="password"
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                      <div className="pt-2">
                        <button className="rounded-lg bg-white border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
