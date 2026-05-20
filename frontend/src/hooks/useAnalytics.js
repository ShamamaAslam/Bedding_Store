import { useCallback } from 'react';
import { logAnalyticsEvent } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Generate a random session ID if one doesn't exist
const getSessionId = () => {
  let sessionId = localStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export const useAnalytics = () => {
  const { user } = useAuth();

  const trackEvent = useCallback(async (eventType, data = {}) => {
    try {
      const payload = {
        eventType,
        sessionId: getSessionId(),
        user: user?._id || null,
        ...data
      };
      
      // Fire and forget - don't await so we don't block UI
      logAnalyticsEvent(payload).catch(err => {
        // Silently fail in production, log in dev
        if (process.env.NODE_ENV === 'development') {
          console.warn('Analytics tracking failed:', err);
        }
      });
    } catch (err) {
      console.warn('Analytics tracking error:', err);
    }
  }, [user]);

  return { trackEvent };
};
