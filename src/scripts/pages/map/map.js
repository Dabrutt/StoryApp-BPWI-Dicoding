import L from "leaflet";
import { loadStories } from "../../data/api.js";

export default class MapPage {
  async render() {
    return `
      <section class="container map-wrapper">
        <header class="map-header">
          <h1 class="map-title">Peta Cerita Pengguna</h1>
        </header>
        
        <div class="map-content">
          <div id="mapCanvas" class="map-canvas"></div>
          <aside id="storyContainer" class="story-container"></aside>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const mapElement = document.getElementById("mapCanvas");

    if (mapElement && L.DomUtil.get(mapElement.id) !== undefined) {
      L.DomUtil.get(mapElement.id)._leaflet_id = null;
    }

    // Inisialisasi Map
    const map = L.map("mapCanvas", {
      center: [-6.2, 106.8],
      zoom: 5,
      zoomControl: true,
    });

    // Base layer OpenStreetMap
    const baseOSM = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
      }
    ).addTo(map);

    // Base layer Satelit Esri
    const baseSatelit = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri" }
    );

    // Control pilihan peta
    L.control
      .layers({ "Peta Dasar": baseOSM, Satelit: baseSatelit })
      .addTo(map);

    // Data story
    const response = await loadStories({ includeLocation: true });
    const stories = response.listStory || [];
    const markerList = [];

    stories.forEach((item) => {
      if (!item.lat || !item.lon) return;

      const popupContent = `
        <div class="popup-info">
          <h4>${item.name}</h4>
          <img src="${item.photoUrl}" alt="Story Image" width="150" style="border-radius:8px;margin-top:5px;">
          <p>${item.description}</p>
        </div>
      `;

      const marker = L.marker([item.lat, item.lon]).addTo(map);
      marker.bindPopup(popupContent);

      markerList.push({ data: item, marker });
    });

    // Daftar story di sidebar
    const storyContainer = document.getElementById("storyContainer");
    storyContainer.innerHTML = stories
      .map((s) => {
        const formattedDate = new Date(s.createdAt).toLocaleDateString(
          "id-ID",
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        );

        return `
          <div class="story-card" data-lat="${s.lat}" data-lon="${s.lon}">
            <h3>${s.name}</h3>
            <p>${s.description}</p>
            <small class="story-date">${formattedDate}</small>
          </div>
        `;
      })
      .join("");

    storyContainer.addEventListener("click", (e) => {
      const storyCard = e.target.closest(".story-card");
      if (!storyCard) return;

      const lat = parseFloat(storyCard.dataset.lat);
      const lon = parseFloat(storyCard.dataset.lon);

      map.flyTo([lat, lon], 10, { duration: 1 });

      const activeMarker = markerList.find(
        (m) => m.data.lat === lat && m.data.lon === lon
      );
      if (activeMarker) activeMarker.marker.openPopup();
    });
  }
}
