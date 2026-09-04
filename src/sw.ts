/// <reference lib="webworker" />
import type { JsonValue } from '@interfaces/json';
import type { ManifestEntry } from 'workbox-build';
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: ManifestEntry[];
};

interface PushPayload {
	title?: string;
	body?: string;
	icon?: string;
	badge?: string;
	data?: {
		url?: string;
	};
	tag?: string;
}

/**
 * A push body is only usable as a payload when it decodes to an object node.
 */
const isPushPayload = (value: JsonValue | PushPayload | undefined): value is PushPayload =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Narrow a notification data field to text.
 */
const isText = (value: JsonValue | undefined): value is string => typeof value === 'string';

const resolveUrl = (rawUrl: string): string => {
	try {
		const resolved = new URL(rawUrl, self.location.origin);
		if (resolved.origin !== self.location.origin) {
			return new URL('/dashboard', self.location.origin).href;
		}
		if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
			return new URL('/dashboard', self.location.origin).href;
		}
		return resolved.href;
	} catch {
		return new URL('/dashboard', self.location.origin).href;
	}
};

const parsePushPayload = (event: PushEvent): PushPayload | null => {
	if (!event.data) return null;

	try {
		const payload: JsonValue = event.data.json();

		return isPushPayload(payload) ? payload : {};
	} catch {
		const text = event.data.text();
		if (!text) return null;
		return { title: 'Notification', body: text };
	}
};

const getNotificationUrl = (payload: PushPayload): string => {
	const rawUrl = payload.data?.url || '/dashboard';
	return resolveUrl(rawUrl);
};

const getNotificationOptions = (payload: PushPayload): NotificationOptions => {
	return {
		body: payload.body || '',
		icon: payload.icon || '/pwa-192x192.png',
		badge: payload.badge || '/pwa-64x64.png',
		tag: payload.tag,
		data: {
			url: getNotificationUrl(payload),
		},
	};
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST, { directoryIndex: 'index.html', cleanURLs: true });

void self.skipWaiting();
clientsClaim();

self.addEventListener('push', (event: PushEvent) => {
	const payload = parsePushPayload(event);
	if (!payload) return;

	const title = payload.title || 'Notification';
	const options = getNotificationOptions(payload);

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
	const rawUrl: JsonValue | undefined = event.notification.data?.url;
	const url = isText(rawUrl) ? rawUrl : '/dashboard';
	const targetUrl = resolveUrl(url);

	event.notification.close();

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if (client.url === targetUrl) return client.focus();
			}

			return self.clients.openWindow(targetUrl);
		}),
	);
});
