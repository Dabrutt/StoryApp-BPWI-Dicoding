const API_URL = "https://story-api.dicoding.dev/v1";
const VAPID_PUBLIC_KEY = "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

async function sendRequest(url, options = {}) {
  const response = await fetch(url, options);
  const responseJson = await response.json();
  
  if (response.ok) {
    return responseJson;
  }
  
  throw new Error(responseJson.message || 'Terjadi kesalahan pada server');
}

// Register new user
export async function register({ name, email, password }) {
  return sendRequest(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
}

// Login user
export async function login({ email, password }) {
  const response = await sendRequest(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (response.loginResult?.token) {
    localStorage.setItem('token', response.loginResult.token);
    localStorage.setItem('user', JSON.stringify(response.loginResult));
  }

  return response;
}

// Get token from localStorage
export function getStoredToken() {
  return localStorage.getItem('token');
}

// Get all stories
export async function loadStories({ page, size, includeLocation = false } = {}) {
  const token = getStoredToken();
  if (!token) throw new Error('Autentikasi diperlukan');

  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (size) params.append('size', size);
  if (includeLocation) params.append('location', 1);

  return sendRequest(`${API_URL}/stories?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Get story detail
export async function getStoryDetail(id) {
  const token = getStoredToken();
  if (!token) throw new Error('Autentikasi diperlukan');

  return sendRequest(`${API_URL}/stories/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Add new story (authenticated)
export async function uploadStory({ description, photoFile, lat, lon }) {
  const token = getStoredToken();
  if (!token) throw new Error('Autentikasi diperlukan');

  const formData = new FormData();
  formData.append('description', description);
  formData.append('photo', photoFile);
  if (lat !== undefined) formData.append('lat', lat);
  if (lon !== undefined) formData.append('lon', lon);

  return sendRequest(`${API_URL}/stories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
}

// Add new story as guest
export async function uploadGuestStory({ description, photoFile, lat, lon }) {
  const formData = new FormData();
  formData.append('description', description);
  formData.append('photo', photoFile);
  if (lat !== undefined) formData.append('lat', lat);
  if (lon !== undefined) formData.append('lon', lon);

  return sendRequest(`${API_URL}/stories/guest`, {
    method: 'POST',
    body: formData
  });
}

// Web Push Notification Functions
export async function subscribeNotification(subscription) {
  const token = getStoredToken();
  if (!token) throw new Error('Autentikasi diperlukan');

  return sendRequest(`${API_URL}/notifications/subscribe`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscription)
  });
}

export async function unsubscribeNotification(endpoint) {
  const token = getStoredToken();
  if (!token) throw new Error('Autentikasi diperlukan');

  return sendRequest(`${API_URL}/notifications/subscribe`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ endpoint })
  });
}

// Helper function to request notification permission and subscribe
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Izin notifikasi tidak diberikan');
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY
    });

    await subscribeNotification({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode.apply(null,
          new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode.apply(null,
          new Uint8Array(subscription.getKey('auth'))))
      }
    });

    return subscription;
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    throw error;
  }
}

// Offline story management
const OFFLINE_STORIES_KEY = 'offline_stories';

// Save story to IndexedDB for offline sync
export async function saveOfflineStory(storyData) {
  try {
    const offlineStories = await getOfflineStories();
    const storyWithId = {
      ...storyData,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      synced: false
    };

    offlineStories.push(storyWithId);
    localStorage.setItem(OFFLINE_STORIES_KEY, JSON.stringify(offlineStories));

    return storyWithId;
  } catch (error) {
    console.error('Error saving offline story:', error);
    throw error;
  }
}

// Get offline stories from localStorage
export async function getOfflineStories() {
  try {
    const stored = localStorage.getItem(OFFLINE_STORIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting offline stories:', error);
    return [];
  }
}

// Sync offline stories when online
export async function syncOfflineStories() {
  try {
    const offlineStories = await getOfflineStories();
    const unsyncedStories = offlineStories.filter(story => !story.synced);

    if (unsyncedStories.length === 0) {
      return { synced: 0, message: 'No offline stories to sync' };
    }

    let syncedCount = 0;
    for (const story of unsyncedStories) {
      try {
        // Convert offline story to API format
        const formData = new FormData();
        formData.append('description', story.description);
        formData.append('photo', story.photoFile);
        if (story.lat !== undefined) formData.append('lat', story.lat);
        if (story.lon !== undefined) formData.append('lon', story.lon);

        await uploadStory({
          description: story.description,
          photoFile: story.photoFile,
          lat: story.lat,
          lon: story.lon
        });

        // Mark as synced
        story.synced = true;
        syncedCount++;
      } catch (error) {
        console.error('Error syncing story:', story.id, error);
        // Continue with next story
      }
    }

    // Update localStorage with synced status
    localStorage.setItem(OFFLINE_STORIES_KEY, JSON.stringify(offlineStories));

    return {
      synced: syncedCount,
      total: unsyncedStories.length,
      message: `Synced ${syncedCount} of ${unsyncedStories.length} offline stories`
    };
  } catch (error) {
    console.error('Error syncing offline stories:', error);
    throw error;
  }
}

// Check if user is online
export function isOnline() {
  return navigator.onLine;
}

// Listen for online/offline events and sync when coming online
export function initOfflineSync() {
  window.addEventListener('online', async () => {
    console.log('Back online, syncing offline stories...');
    try {
      const result = await syncOfflineStories();
      if (result.synced > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Sync Berhasil!',
          text: result.message,
          timer: 3000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error during auto-sync:', error);
    }
  });

  window.addEventListener('offline', () => {
    console.log('Went offline');
  });
}

// Helper function to unsubscribe from notifications
export async function unsubscribeNotificationPermission() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await unsubscribeNotification(subscription.endpoint);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    throw error;
  }
}

// Check if notifications are currently subscribed
export async function isNotificationSubscribed() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('Error checking notification subscription:', error);
    return false;
  }
}
