'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Library as LibraryIcon, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import MobileNav from './MobileNav';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState('User');
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 获取当前用户名
    const username = localStorage.getItem('currentUser') || 'User';
    setCurrentUser(username);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // 清除登录状态
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    
    // 跳转到登录页
    router.push('/login');
  };

  // 获取用户名首字母
  const getUserInitial = () => {
    return currentUser.charAt(0).toUpperCase();
  };
  
  return (
    <header className="fixed top-0 w-full z-50 glass px-8 py-4 flex justify-between items-center">
      <Link href="/" className="flex items-center gap-2 cursor-pointer">
        <span className="text-2xl font-handwriting text-tertiary -rotate-2 select-none">The Atelier</span>
      </Link>
      
      <nav className="hidden md:flex items-center gap-8">
        {[
          { name: t('nav.home') || '首页', path: '/' },
          { name: t('nav.inspiration') || '灵感库', path: '/inspiration' },
          { name: t('nav.analyze') || '风格提取', path: '/analyze' },
          { name: t('nav.compare') || '对比', path: '/compare' },
          { name: t('nav.library') || '素材库', path: '/library' },
          { name: t('nav.settings') || '设置', path: '/settings' }
        ].map((item) => (
          <Link 
            key={item.path}
            href={item.path}
            className={`font-headline tracking-tight text-sm ${
              pathname === item.path 
                ? 'text-tertiary font-bold' 
                : 'text-ink/50 hover:text-ink transition-colors'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm" role="group" aria-label="Language switcher">
          <button
            onClick={() => setLanguage('zh')}
            aria-pressed={language === 'zh'}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              language === 'zh' ? 'bg-ink text-white' : 'text-ink/40 hover:text-ink'
            }`}
          >
            {t('common.chinese')}
          </button>
          <button
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              language === 'en' ? 'bg-ink text-white' : 'text-ink/40 hover:text-ink'
            }`}
          >
            {t('common.english')}
          </button>
        </div>

        <Link
          href="/library"
          className="p-2 rounded-full hover:bg-black/5 transition-colors"
          aria-label={t('nav.library') || 'Library'}
        >
          <LibraryIcon className="w-5 h-5 text-ink/70" />
        </Link>
        <Link
          href="/settings"
          className="p-2 rounded-full hover:bg-black/5 transition-colors"
          aria-label={t('nav.settings') || 'Settings'}
        >
          <SettingsIcon className="w-5 h-5 text-ink/70" />
        </Link>

        {/* User Avatar with Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-sm hover:border-accent transition-all cursor-pointer"
            aria-label={t('auth.logout') || 'User menu'}
            aria-expanded={showUserMenu}
          >
            {getUserInitial()}
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-black/5 overflow-hidden">
              <div className="p-3 border-b border-black/5">
                <p className="text-sm font-bold text-ink">
                  {currentUser}
                </p>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('auth.logout') || '退出登录'}</span>
              </button>
            </div>
          )}
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
