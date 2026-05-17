const ATTR_KEY = 'wf_marketing_source';

const parseUtmSource = () => {
  try {
    const params = new URLSearchParams(window.location.search || '');
    return (params.get('utm_source') || '').trim().toLowerCase();
  } catch {
    return '';
  }
};

const parseReferrerSource = () => {
  const ref = (document.referrer || '').toLowerCase();
  if (!ref) return 'direct';
  if (ref.includes('google')) return 'organic_seo';
  if (ref.includes('facebook') || ref.includes('instagram')) return 'meta_ads';
  if (ref.includes('tiktok')) return 'tiktok';
  if (ref.includes('youtube')) return 'youtube';
  if (ref.includes('bing')) return 'organic_search';
  return 'referral';
};

export const resolveMarketingSource = () => {
  const utm = parseUtmSource();
  if (utm) return utm;

  try {
    const existing = localStorage.getItem(ATTR_KEY);
    if (existing) return existing;
  } catch {
    // ignore storage failures
  }

  return parseReferrerSource();
};

export const storeMarketingSource = () => {
  const source = resolveMarketingSource();
  try {
    localStorage.setItem(ATTR_KEY, source);
  } catch {
    // ignore storage failures
  }
  return source;
};

export const getStoredMarketingSource = () => {
  try {
    const value = localStorage.getItem(ATTR_KEY);
    return value || 'direct';
  } catch {
    return 'direct';
  }
};
