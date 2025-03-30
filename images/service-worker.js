self.addEventListener('install', (event) => {
	// Skip waiting to immediately activate the service worker
	self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
  });
  