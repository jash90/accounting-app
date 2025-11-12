/* eslint-disable */
/* tslint:disable */

/**
 * Mock Service Worker (MSW).
 * @see https://mswjs.io
 * - Please do NOT modify this file.
 * - Please do NOT serve this file on production.
 */

const INTEGRITY_CHECKSUM = '223d1566f33b6d33'
const IS_MOCKED_RESPONSE = Symbol('isMockedResponse')
const activeClientIds = new Set()

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', async function (event) {
  const clientId = event.source.id

  if (!clientId) {
    return
  }

  const allClients = await self.clients.matchAll({
    type: 'window',
  })

  switch (event.data) {
    case 'KEEPALIVE_REQUEST': {
      sendToClient(client, {
        type: 'KEEPALIVE_RESPONSE',
      })
      break
    }

    case 'INTEGRITY_CHECK_REQUEST': {
      sendToClient(client, {
        type: 'INTEGRITY_CHECK_RESPONSE',
        payload: INTEGRITY_CHECKSUM,
      })
      break
    }

    case 'MOCK_ACTIVATE': {
      activeClientIds.add(clientId)

      sendToClient(client, {
        type: 'MOCKING_ENABLED',
      })
      break
    }

    case 'MOCK_DEACTIVATE': {
      activeClientIds.delete(clientId)
      break
    }

    case 'CLIENT_CLOSED': {
      activeClientIds.delete(clientId)

      const remainingClients = allClients.filter((client) => {
        return client.id !== clientId
      })

      // Unregister itself when there are no more clients
      if (remainingClients.length === 0) {
        self.registration.unregister()
      }

      break
    }
  }
})

self.addEventListener('fetch', function (event) {
  const { request } = event

  // Bypass service worker for non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Bypass service worker for non-HTTP(S) requests
  if (!request.url.startsWith('http')) {
    return
  }

  // Bypass service worker for requests that don't accept HTML
  const acceptHeader = request.headers.get('accept')
  if (!acceptHeader || !acceptHeader.includes('text/html')) {
    return
  }

  // Bypass service worker for requests from other origins
  const origin = new URL(request.url).origin
  if (origin !== self.location.origin) {
    return
  }

  event.respondWith(
    fetch(request).catch(() => {
      return new Response('Network error', {
        status: 408,
        headers: { 'Content-Type': 'text/plain' },
      })
    })
  )
})

async function sendToClient(client, message) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()

    channel.port1.onmessage = (event) => {
      if (event.data && event.data.error) {
        return reject(event.data.error)
      }

      resolve(event.data)
    }

    client.postMessage(
      message,
      [channel.port2]
    )
  })
}

