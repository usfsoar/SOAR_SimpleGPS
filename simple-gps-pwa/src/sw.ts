import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';


declare let self: ServiceWorkerGlobalScope;

// self.__WB_MANIFEST is the default injection point
precacheAndRoute(self.__WB_MANIFEST);

// Clean old assets
cleanupOutdatedCaches();

let allowlist: undefined | RegExp[];
if (import.meta.env.DEV) allowlist = [/^\/$/];

// To allow working offline
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { allowlist }));

registerRoute(
  ({ url }) => url.origin === 'https://tile.openstreetmap.org' || url.pathname.startsWith('/{z}/{x}/{y}.png'),
  new CacheFirst({
    cacheName: 'map-tiles-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100, // Limit the number of tiles cached
        maxAgeSeconds: 7 * 24 * 60 * 60, // Cache tiles for one week
      }),
    ],
  })
);


self.skipWaiting();
clientsClaim();