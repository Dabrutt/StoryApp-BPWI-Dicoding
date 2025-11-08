// Minimal IndexedDB wrapper for stories and outbox queue
const DB_NAME = 'storyapp-db';
const DB_VERSION = 2; // Increment version to add new store
const STORE_STORIES = 'stories';
const STORE_OUTBOX = 'outbox';
const STORE_FAVORITES = 'favorites';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_STORIES)) {
        db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_FAVORITES)) {
        db.createObjectStore(STORE_FAVORITES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStories(stories = []) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_STORIES, 'readwrite');
    const store = tx.objectStore(STORE_STORIES);
    stories.forEach((s) => store.put(s));
    return tx.complete;
  } catch (err) {
    console.error('saveStories error', err);
  }
}

export async function getAllStories() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readonly');
      const store = tx.objectStore(STORE_STORIES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('getAllStories error', err);
    return [];
  }
}

export async function saveOutbox(item) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readwrite');
      const store = tx.objectStore(STORE_OUTBOX);
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('saveOutbox error', err);
  }
}

export async function getOutbox() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readonly');
      const store = tx.objectStore(STORE_OUTBOX);
      const items = [];
      store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          items.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        } else {
          resolve(items);
        }
      };
      store.openCursor().onerror = () => reject('Failed to read outbox');
    });
  } catch (err) {
    console.error('getOutbox error', err);
    return [];
  }
}

export async function deleteOutbox(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readwrite');
      const store = tx.objectStore(STORE_OUTBOX);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('deleteOutbox error', err);
  }
}

export async function deleteStory(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readwrite');
      const store = tx.objectStore(STORE_STORIES);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('deleteStory error', err);
  }
}

// Favorites functions
export async function saveFavorite(story) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FAVORITES, 'readwrite');
      const store = tx.objectStore(STORE_FAVORITES);
      const req = store.put(story);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('saveFavorite error', err);
  }
}

export async function getAllFavorites() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FAVORITES, 'readonly');
      const store = tx.objectStore(STORE_FAVORITES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('getAllFavorites error', err);
    return [];
  }
}

export async function deleteFavorite(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FAVORITES, 'readwrite');
      const store = tx.objectStore(STORE_FAVORITES);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('deleteFavorite error', err);
  }
}

export async function clearAllFavorites() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FAVORITES, 'readwrite');
      const store = tx.objectStore(STORE_FAVORITES);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('clearAllFavorites error', err);
  }
}
