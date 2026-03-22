'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { login } from '@/lib/api';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import BackgroundLights from '@/components/BackgroundLights';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        localStorage.setItem('user', JSON.stringify(result.user));
        router.push('/');
      } else {
        setError(result.error || t('auth.loginFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('auth.loginFailedRetry'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 bg-canvas dot-grid relative overflow-hidden">
      <BackgroundLights />
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-tertiary/10 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-tertiary" />
            </div>
            <h1 className="text-2xl font-bold text-ink mb-2">{t('auth.login')}</h1>
            <p className="text-ink/60 text-sm font-handwriting text-lg">{t('auth.loginSubtitle')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {t('auth.username')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tertiary/20 focus:border-tertiary transition-all"
                  placeholder={t('auth.usernamePlaceholder')}
                  required
                  minLength={3}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tertiary/20 focus:border-tertiary transition-all"
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tertiary text-white py-3 rounded-lg font-medium hover:bg-tertiary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-ink/60">
              {t('auth.noAccount')}{' '}
              <Link href="/register" className="text-tertiary font-medium hover:underline">
                {t('auth.registerNow')}
              </Link>
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 font-medium mb-1">{t('auth.defaultAccount')}</p>
            <p className="text-xs text-blue-600">
              {t('auth.username')}: admin<br />
              {t('auth.password')}: admin123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
