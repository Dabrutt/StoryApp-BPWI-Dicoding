import L from "leaflet";
import {
  loadStories,
  requestNotificationPermission,
  unsubscribeNotificationPermission,
  isNotificationSubscribed,
  isOnline,
  getOfflineStories,
} from "../../data/api.js";
import { saveFavorite } from "../../../utils/idb.js";

export default class HomePage {
  async render() {
    return `
      <section class="container home-page">
        <header>
          <h1>Home Page</h1>
          <p>Selamat datang di StoryApp – bagikan kisahmu dan temukan cerita inspiratif dari seluruh dunia!</p>

          <div class="notification-controls">
            <label for="notification-toggle" class="notification-label">
              <input type="checkbox" id="notification-toggle" class="notification-toggle">
              <span class="toggle-slider"></span>
              Push Notification
            </label>
            <small class="notification-status">Memeriksa status...</small>
          </div>

          <div class="story-controls">
            <div class="search-container">
              <label for="story-search" class="search-label">Cari Cerita</label>
              <input type="text" id="story-search" class="search-input" placeholder="Cari berdasarkan nama atau deskripsi...">
            </div>

            <div class="sort-container">
              <label class="sort-label">Urutkan</label>
              <div class="sort-buttons">
                <button id="sort-newest" class="sort-btn" data-sort="newest" title="Urutkan Terbaru">
                  <span class="sort-icon">↑</span> Terbaru
                </button>
                <button id="sort-oldest" class="sort-btn" data-sort="oldest" title="Urutkan Terlama">
                  <span class="sort-icon">↓</span> Terlama
                </button>
              </div>
            </div>
          </div>
        </header>

        <div class="story-wrapper">
          <div id="story-list" class="story-list"></div>
          <div id="offline-indicator" class="offline-indicator" style="display: none;">
            <span class="offline-text">🔴 Offline Mode - Stories akan disinkronkan saat online</span>
          </div>
          <div id="map-view" class="map" aria-label="Peta lokasi story"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.hash = "#/login";
        return;
      }

      // Initialize notification controls
      await this.initNotificationControls();

      // Initialize search and sort controls
      this.initSearchAndSort();

      // Check online status and show indicator
      this.updateOnlineStatus();

      let stories = [];
      if (isOnline()) {
        const response = await loadStories({ includeLocation: true });
        stories = response.listStory || [];
      } else {
        // Load offline stories if available
        const offlineStories = await getOfflineStories();
        stories = offlineStories
          .filter((story) => story.synced)
          .map((story) => ({
            ...story,
            name: story.name || "Offline Story",
            description: story.description,
            photoUrl: story.photoUrl || "",
            createdAt: story.createdAt,
            lat: story.lat,
            lon: story.lon,
            id: story.id,
          }));
      }

      this.allStories = stories; // Store all stories for filtering/sorting
      this.filteredStories = [...stories]; // Initialize filtered stories

      const listContainer = document.getElementById("story-list");
      const mapElement = document.getElementById("map-view");

      if (!mapElement || !listContainer) {
        console.error("Required elements not found");
        return;
      }

      // Reset map if it was previously initialized
      if (mapElement._leaflet_id) {
        mapElement._leaflet_id = null;
        mapElement.innerHTML = "";
      }

      // Initialize map
      const map = L.map(mapElement, {
        center: [-2.5489, 118.0149],
        zoom: 5,
        minZoom: 3,
      });

      // Tambahkan dua layer dasar
      const baseLayers = {
        Peta: L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "&copy; OpenStreetMap contributors",
          }
        ),
        Satelit: L.tileLayer(
          "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
          {
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
            maxZoom: 20,
            attribution: "&copy; Google Maps",
          }
        ),
      };

      baseLayers.Peta.addTo(map);
      L.control.layers(baseLayers).addTo(map);

      // Render daftar story
      const renderStoryList = (data) => {
        listContainer.innerHTML = data
          .map((story) => {
            const time = story.createdAt
              ? new Date(story.createdAt).toLocaleString("id-ID")
              : "Tanggal tidak diketahui";
            return `
          <article class="story-card" tabindex="0" data-lat="${story.lat}" data-lon="${story.lon}">
            <img src="${story.photoUrl}" alt="Foto ${story.name}" loading="lazy" />
            <div class="story-info">
              <h3>${story.name}</h3>
              <p>${story.description}</p>
              <small>📅 ${time}</small>
            </div>
            <button class="favorite-btn" data-id="${story.id}" aria-label="Tambah ke favorit">
              ❤️
            </button>
          </article>
        `;
          })
          .join("");

        // Re-attach favorite button event listeners after rendering
        this.attachFavoriteButtonListeners();
      };

      // Render marker di peta
      const renderMarkers = (data) => {
        const markers = [];

        data.forEach((story) => {
          if (story.lat && story.lon) {
            const popupContent = `
            <b>${story.name}</b><br>
            <small>${
              story.createdAt
                ? new Date(story.createdAt).toLocaleString("id-ID")
                : "Tanggal tidak diketahui"
            }</small><br>
            <p>${story.description}</p>
          `;
            const marker = L.marker([story.lat, story.lon])
              .addTo(map)
              .bindPopup(popupContent);
            markers.push({ ...story, marker });
          }
        });

        return markers;
      };

      renderStoryList(this.filteredStories);
      const activeMarkers = renderMarkers(this.filteredStories);

      // Event klik story -> fokus ke marker
      const storyCards = document.querySelectorAll(".story-card");
      storyCards.forEach((card) => {
        card.addEventListener("click", (e) => {
          // Prevent triggering if favorite button was clicked
          if (e.target.classList.contains("favorite-btn")) return;

          const lat = parseFloat(card.dataset.lat);
          const lon = parseFloat(card.dataset.lon);

          if (!isNaN(lat) && !isNaN(lon)) {
            map.flyTo([lat, lon], 10, { duration: 1 });
            const match = activeMarkers.find(
              (m) => m.lat === lat && m.lon === lon
            );
            if (match) match.marker.openPopup();
          }

          storyCards.forEach((el) => el.classList.remove("active"));
          card.classList.add("active");
        });
      });

      // Attach favorite button listeners
      this.attachFavoriteButtonListeners();

      // Pastikan map menyesuaikan ukuran container
      setTimeout(() => map.invalidateSize(), 500);
    } catch (error) {
      console.error("Error loading stories:", error);
      alert("Gagal memuat stories. Silakan coba lagi nanti.");
    }
  }

  initSearchAndSort() {
    const searchInput = document.getElementById("story-search");
    const sortNewestBtn = document.getElementById("sort-newest");
    const sortOldestBtn = document.getElementById("sort-oldest");

    if (!searchInput || !sortNewestBtn || !sortOldestBtn) return;

    // Search functionality
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      this.filterStories(query);
      this.updateSortButtons();
    });

    // Sort functionality
    sortNewestBtn.addEventListener("click", () => {
      this.sortStories("newest");
      this.updateSortButtons("newest");
    });

    sortOldestBtn.addEventListener("click", () => {
      this.sortStories("oldest");
      this.updateSortButtons("oldest");
    });
  }

  filterStories(query) {
    if (!query) {
      this.filteredStories = [...this.allStories];
    } else {
      this.filteredStories = this.allStories.filter(
        (story) =>
          story.name.toLowerCase().includes(query) ||
          story.description.toLowerCase().includes(query)
      );
    }
    this.renderFilteredStories();
  }

  sortStories(order) {
    this.filteredStories.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);

      if (order === "newest") {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    });
    this.renderFilteredStories();
  }

  renderFilteredStories() {
    const listContainer = document.getElementById("story-list");
    if (!listContainer) return;

    const renderStoryList = (data) => {
      listContainer.innerHTML = data
        .map((story) => {
          const time = story.createdAt
            ? new Date(story.createdAt).toLocaleString("id-ID")
            : "Tanggal tidak diketahui";
          return `
        <article class="story-card" tabindex="0" data-lat="${story.lat}" data-lon="${story.lon}">
          <img src="${story.photoUrl}" alt="Foto ${story.name}" loading="lazy" />
          <div class="story-info">
            <h3>${story.name}</h3>
            <p>${story.description}</p>
            <small>📅 ${time}</small>
          </div>
          <button class="favorite-btn" data-id="${story.id}" aria-label="Tambah ke favorit">
            ❤️
          </button>
        </article>
      `;
        })
        .join("");

      // Re-attach favorite button event listeners after rendering
      this.attachFavoriteButtonListeners();
    };

    renderStoryList(this.filteredStories);
  }

  updateSortButtons(activeSort = null) {
    const sortNewestBtn = document.getElementById("sort-newest");
    const sortOldestBtn = document.getElementById("sort-oldest");

    if (!sortNewestBtn || !sortOldestBtn) return;

    // Remove active class from all buttons
    sortNewestBtn.classList.remove("active");
    sortOldestBtn.classList.remove("active");

    // Add active class to the selected button
    if (activeSort === "newest") {
      sortNewestBtn.classList.add("active");
    } else if (activeSort === "oldest") {
      sortOldestBtn.classList.add("active");
    }
  }

  attachFavoriteButtonListeners() {
    const favoriteButtons = document.querySelectorAll(".favorite-btn");
    favoriteButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const storyId = e.target.dataset.id;
        const story = this.allStories.find((s) => s.id === storyId);
        if (story) {
          try {
            await saveFavorite(story);
            Swal.fire({
              icon: "success",
              title: "Ditambahkan!",
              text: "Story telah ditambahkan ke favorit.",
              timer: 1500,
              showConfirmButton: false,
              position: "top-end",
              toast: true,
            });
          } catch (error) {
            console.error("Error saving favorite:", error);
            Swal.fire({
              icon: "error",
              title: "Gagal",
              text: "Terjadi kesalahan saat menyimpan ke favorit.",
              confirmButtonColor: "#dc2626",
            });
          }
        }
      });
    });
  }

  updateOnlineStatus() {
    const indicator = document.getElementById("offline-indicator");
    if (indicator) {
      indicator.style.display = isOnline() ? "none" : "block";
    }
  }

  async initNotificationControls() {
    const toggle = document.getElementById("notification-toggle");
    const status = document.querySelector(".notification-status");

    if (!toggle || !status) return;

    try {
      // Check current subscription status
      const isSubscribed = await isNotificationSubscribed();
      toggle.checked = isSubscribed;
      status.textContent = isSubscribed ? "Aktif" : "Tidak aktif";

      // Handle toggle changes
      toggle.addEventListener("change", async () => {
        try {
          if (toggle.checked) {
            await requestNotificationPermission();
            status.textContent = "Aktif";
            Swal.fire({
              icon: "success",
              title: "Berhasil!",
              text: "Push notification telah diaktifkan.",
              timer: 2000,
              showConfirmButton: false,
            });
          } else {
            await unsubscribeNotificationPermission();
            status.textContent = "Tidak aktif";
            Swal.fire({
              icon: "info",
              title: "Dinonaktifkan",
              text: "Push notification telah dinonaktifkan.",
              timer: 2000,
              showConfirmButton: false,
            });
          }
        } catch (error) {
          console.error("Error toggling notifications:", error);
          toggle.checked = !toggle.checked; // Revert toggle
          status.textContent = toggle.checked ? "Aktif" : "Tidak aktif";

          Swal.fire({
            icon: "error",
            title: "Gagal",
            text:
              error.message ||
              "Terjadi kesalahan saat mengubah pengaturan notifikasi.",
            confirmButtonColor: "#dc2626",
          });
        }
      });
    } catch (error) {
      console.error("Error initializing notification controls:", error);
      status.textContent = "Error memeriksa status";
    }
  }
}
