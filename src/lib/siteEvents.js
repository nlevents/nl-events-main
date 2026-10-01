// Google Analytics 4 integration for the public storefront.
// The Google tag is loaded from index.html with automatic page_view disabled;
// this module sends one page_view for each React Router navigation instead.
const MEASUREMENT_ID = 'G-Z4VP460R9J'

export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  try {
    window.gtag('event', eventName, params)
    return true
  } catch {
    return false
  }
}

export function trackPageView({ pathname, search = '', hash = '', title } = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return

  const pagePath = `${pathname || window.location.pathname}${search || ''}${hash || ''}`
  window.gtag('event', 'page_view', {
    page_title: title || document.title,
    page_location: window.location.href,
    page_path: pagePath,
  })
}

export function isAnalyticsPublicPath(pathname = '') {
  return !pathname.startsWith('/admin')
}

export { MEASUREMENT_ID }


export function trackServiceCategoryClick({ serviceCategory, occasion, functionPath } = {}) {
  return trackEvent('select_content', {
    content_type: 'service_category',
    item_id: serviceCategory,
    item_name: serviceCategory,
    service_category: serviceCategory,
    occasion: occasion || undefined,
    function_path: functionPath || undefined,
  })
}

export function trackServiceView({ serviceName, serviceCategory, occasion, functionPath, itemId } = {}) {
  return trackEvent('view_item', {
    item_id: itemId,
    item_name: serviceName,
    item_category: serviceCategory || undefined,
    occasion: occasion || undefined,
    function_path: functionPath || undefined,
    items: [{
      item_id: itemId,
      item_name: serviceName,
      item_category: serviceCategory || undefined,
    }],
  })
}

export function trackGenerateLead({ source = 'website', eventType } = {}) {
  return trackEvent('generate_lead', {
    lead_source: source,
    event_type: eventType || undefined,
  })
}

export function trackWhatsAppClick({ source, itemName, occasion, serviceCategory } = {}) {
  return trackEvent('whatsapp_click', {
    source: source || undefined,
    item_name: itemName || undefined,
    occasion: occasion || undefined,
    service_category: serviceCategory || undefined,
  })
}

export function trackSiteSearch({ searchTerm } = {}) {
  if (!searchTerm) return false
  return trackEvent('search', { search_term: searchTerm })
}

export function trackCartAction(eventName, { item, quantity = 1 } = {}) {
  if (!item) return false
  return trackEvent(eventName, {
    currency: 'INR',
    value: typeof item.price === 'number' ? item.price * quantity : undefined,
    items: [{
      item_id: item.id || item.slug || item.name,
      item_name: item.name,
      quantity,
      price: typeof item.price === 'number' ? item.price : undefined,
    }],
  })
}
