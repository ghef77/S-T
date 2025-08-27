/**
 * Service Worker for Staff Table Application
 * Provides caching strategies for better performance and offline capabilities
 */

const CACHE_NAME = 'staff-table-v1.2';
const DATA_CACHE_NAME = 'staff-table-data-v1.2';

// Assets to cache immediately - only files that definitely exist
const STATIC_ASSETS = [
    './',
    './index.html'
];

// Optional assets to try to cache (won't fail if missing)
const OPTIONAL_ASSETS = [
    './performance-optimizer.js',
    './sync-optimizer.js',
    './lazy-loader.js',
    './dom-cache.js',
    './database-batcher.js',
    './performance-booster.js',
    './realtime-sync-diagnostics.js',
    './realtime-sync-fix.js',
    './image-optimizer.js',
    './virtual-scroller.js',
    './network-optimizer.js',
    './gallery-optimizer.js',
    './smooth-image-viewer.js'
];

// CDN resources to cache
const CDN_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Runtime cacheable patterns
const RUNTIME_CACHE_PATTERNS = [
    /^https:\/\/cdn\./,
    /^https:\/\/cdnjs\.cloudflare\.com/,
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    /\.(?:js|css)$/
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then(async cache => {
                console.log('📦 Caching critical assets');
                
                try {
                    // Cache critical assets first (these must succeed)
                    await cache.addAll(STATIC_ASSETS);
                    console.log('✅ Critical assets cached successfully');
                } catch (error) {
                    console.error('❌ Failed to cache critical assets:', error);
                    throw error; // This will cause the service worker installation to fail
                }
                
                // Cache optional assets (failures are okay)
                console.log('📦 Caching optional assets');
                const optionalPromises = OPTIONAL_ASSETS.map(async (asset) => {
                    try {
                        const response = await fetch(asset);
                        if (response.ok) {
                            await cache.put(asset, response);
                            console.log('✅ Cached optional asset:', asset);
                        }
                    } catch (error) {
                        console.log('ℹ️ Optional asset not available:', asset);
                    }
                });
                await Promise.allSettled(optionalPromises);
            }),
            caches.open(DATA_CACHE_NAME).then(async cache => {
                console.log('📦 Caching CDN assets');
                // Cache CDN assets with no-cors mode to avoid CORS issues
                const cachePromises = CDN_ASSETS.map(async (url) => {
                    try {
                        const response = await fetch(url, { mode: 'no-cors' });
                        if (response.ok || response.type === 'opaque') {
                            await cache.put(url, response);
                            console.log('✅ Cached CDN asset:', url);
                        }
                    } catch (error) {
                        console.warn('⚠️ Failed to cache CDN asset:', url, error);
                    }
                });
                await Promise.allSettled(cachePromises);
            })
        ]).then(() => {
            console.log('✅ Service Worker installed successfully');
            return self.skipWaiting();
        })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - handle requests with different strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-HTTP requests
    if (!request.url.startsWith('http')) {
        return;
    }

    try {
        // Supabase API calls - Network First with cache fallback
        if (url.hostname.includes('supabase.co')) {
            event.respondWith(networkFirstStrategy(request, DATA_CACHE_NAME));
            return;
        }

        // CDN resources - Cache First
        if (RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
            event.respondWith(cacheFirstStrategy(request, DATA_CACHE_NAME));
            return;
        }

        // App shell resources - Cache First
        if (STATIC_ASSETS.some(asset => request.url.endsWith(asset)) ||
            OPTIONAL_ASSETS.some(asset => request.url.endsWith(asset))) {
            event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
            return;
        }

        // Default - Network First for HTML, Cache First for everything else
        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
            event.respondWith(networkFirstStrategy(request, CACHE_NAME));
        } else {
            event.respondWith(cacheFirstStrategy(request, DATA_CACHE_NAME));
        }
    } catch (error) {
        console.error('❌ Service worker fetch handler error:', error, 'for URL:', request.url);
        // Let the request go to network as fallback
    }
});

/**
 * Network First Strategy
 * Try network first, fallback to cache
 */
async function networkFirstStrategy(request, cacheName) {
    try {
        // Use no-cors mode for CDN requests to avoid CORS errors
        const fetchOptions = {};
        if (request.url.includes('cdn.') || request.url.includes('cdnjs.')) {
            fetchOptions.mode = 'no-cors';
        }
        
        const response = await fetch(request, fetchOptions);
        
        // Only cache successful responses or opaque responses (no-cors)
        if (response.status === 200 || response.type === 'opaque') {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.log('🌐 Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return new Response(
                '<h1>Offline</h1><p>Cette page n\'est pas disponible hors ligne.</p>',
                { headers: { 'Content-Type': 'text/html' } }
            );
        }
        
        throw error;
    }
}

/**
 * Cache First Strategy
 * Try cache first, fallback to network
 */
async function cacheFirstStrategy(request, cacheName) {
    try {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            // Update cache in background for CDN resources
            if (RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
                // Update cache asynchronously without blocking
                updateCacheInBackground(request, cacheName).catch(error => {
                    console.warn('Background cache update failed:', error);
                });
            }
            return cachedResponse;
        }
        
        const fetchOptions = {};
        if (request.url.includes('cdn.') || request.url.includes('cdnjs.')) {
            fetchOptions.mode = 'no-cors';
        }
        
        const response = await fetch(request, fetchOptions);
        
        if (response.status === 200 || response.type === 'opaque') {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.log('❌ Cache first strategy failed for:', request.url, error);
        throw error;
    }
}

/**
 * Update cache in background
 */
async function updateCacheInBackground(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.status === 200) {
            const cache = await caches.open(cacheName);
            await cache.put(request, response);
        }
    } catch (error) {
        console.log('🔄 Background cache update failed:', request.url);
    }
}

// Handle periodic background sync for data freshness
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(backgroundSync());
    }
});

async function backgroundSync() {
    console.log('🔄 Background sync triggered');
    
    try {
        // Clear old data cache entries
        const cache = await caches.open(DATA_CACHE_NAME);
        const keys = await cache.keys();
        
        const outdatedKeys = keys.filter(request => {
            const url = new URL(request.url);
            return url.hostname.includes('supabase.co') && 
                   Date.now() - new Date(request.headers.get('date')).getTime() > 24 * 60 * 60 * 1000; // 24 hours
        });
        
        await Promise.all(outdatedKeys.map(key => cache.delete(key)));
        console.log(`🗑️ Cleaned ${outdatedKeys.length} outdated data cache entries`);
        
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}

// Handle push notifications for real-time updates
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'Données mises à jour',
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: 'staff-table-update',
            renotify: true,
            actions: [
                {
                    action: 'view',
                    title: 'Voir les modifications'
                },
                {
                    action: 'dismiss',
                    title: 'Ignorer'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification('Staff Table', options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('🎯 Service Worker script loaded');