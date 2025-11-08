import L from "leaflet";
import { getStoredToken, uploadStory, requestNotificationPermission, saveOfflineStory, isOnline } from "../../data/api.js";

export default class AddStory {
  async render() {
    return `
      <section class="container add-story">
        <h1>Buat Cerita Baru</h1>

        <form id="add-story-form">
          <div class="form-group">
            <label for="desc">Deskripsi</label>
            <textarea id="desc" name="description" required></textarea>
          </div>

          <div class="form-group">
            <label for="photo">Foto</label>
            <input type="file" id="photo" name="photo" accept="image/*" required />
            <img id="preview-photo" style="display:none; width:150px; margin-top:8px; border-radius:8px;">
          </div>

          <div class="form-group">
            <label>Pilih Lokasi di Peta</label>
            <div id="map" style="height:300px; border-radius:8px; margin-bottom:1em;"></div>
          </div>

          <div class="form-row" style="display:flex; gap:1em;">
            <div class="form-group" style="flex:1;">
              <label for="lat">Latitude</label>
              <input type="number" id="lat" name="lat" step="any" readonly required />
            </div>

            <div class="form-group" style="flex:1;">
              <label for="lon">Longitude</label>
              <input type="number" id="lon" name="lon" step="any" readonly required />
            </div>
          </div>

          <div class="form-group">
            <video id="camera-stream" width="250" autoplay style="display:none; border:1px solid #ccc; border-radius:8px;"></video>
            <button type="button" id="open-camera-btn">Buka Kamera</button>
            <button type="button" id="capture-btn" style="display:none;">Ambil Foto</button>
          </div>

          <button type="submit" class="submit-btn">Kirim Cerita</button>
        </form>
      </section>
    `;
  }

  async afterRender() {
    // ======= Inisialisasi Elemen DOM =======
    const form = document.getElementById("add-story-form");
    const photoInput = document.getElementById("photo");
    const previewPhoto = document.getElementById("preview-photo");
    const latInput = document.getElementById("lat");
    const lonInput = document.getElementById("lon");
    const video = document.getElementById("camera-stream");
    const openCameraBtn = document.getElementById("open-camera-btn");
    const captureBtn = document.getElementById("capture-btn");

    let stream = null;

    // ======= Peta Lokasi (Leaflet) =======
    const map = L.map("map").setView([-2.5489, 118.0149], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    let currentMarker = null;
    map.on("click", (event) => {
      const { lat, lng } = event.latlng;
      if (currentMarker) map.removeLayer(currentMarker);
      currentMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Lokasi terpilih")
        .openPopup();
      latInput.value = lat.toFixed(6);
      lonInput.value = lng.toFixed(6);
    });

    // ======= Fungsi untuk Kompres Foto =======
    const compressImage = (file, maxW = 800, maxH = 800) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxW) {
            height *= maxW / width;
            width = maxW;
          } else if (height > maxH) {
            width *= maxH / height;
            height = maxH;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => resolve(new File([blob], file.name, { type: file.type })),
            file.type,
            0.8
          );
        };
        img.src = URL.createObjectURL(file);
      });

    // ======= Preview Foto Upload =======
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (file) {
        previewPhoto.src = URL.createObjectURL(file);
        previewPhoto.style.display = "block";
      }
    });

    // ======= Kamera Langsung =======
    openCameraBtn.addEventListener("click", async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = "block";
        captureBtn.style.display = "inline-block";
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Kamera Tidak Dapat Diakses",
          text: error.message,
          confirmButtonColor: "#2563eb",
        });
      }
    });

    // ======= Ambil Foto dari Kamera =======
    captureBtn.addEventListener("click", async () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        let photo = new File([blob], "photo-captured.png", {
          type: "image/png",
        });
        if (photo.size > 1_000_000) photo = await compressImage(photo);

        const dt = new DataTransfer();
        dt.items.add(photo);
        photoInput.files = dt.files;

        previewPhoto.src = URL.createObjectURL(photo);
        previewPhoto.style.display = "block";
      });

      if (stream) stream.getTracks().forEach((track) => track.stop());
      video.style.display = "none";
      captureBtn.style.display = "none";
    });

    // ======= Submit Cerita =======
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const token = getStoredToken();
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Autentikasi Diperlukan",
          text: "Silakan login kembali untuk mengirim cerita.",
          confirmButtonColor: "#dc2626",
        });
        return;
      }

      const description = form.description.value.trim();
      const photoFile = photoInput.files[0];
      const lat = parseFloat(latInput.value);
      const lon = parseFloat(lonInput.value);

      if (!description || !photoFile || isNaN(lat) || isNaN(lon)) {
        Swal.fire({
          icon: "warning",
          title: "Form Belum Lengkap",
          text: "Pastikan semua bidang telah diisi dengan benar.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      Swal.fire({
        title: "Mengirim Cerita...",
        text: "Mohon tunggu sebentar.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const formData = new FormData();
      formData.append("description", description);
      formData.append("photo", photoFile);
      formData.append("lat", lat);
      formData.append("lon", lon);

      try {
        let data;

        if (isOnline()) {
          // Online: upload directly to API
          data = await uploadStory({
            description,
            photoFile,
            lat,
            lon,
          });
        } else {
          // Offline: save to local storage for later sync
          const offlineStory = await saveOfflineStory({
            description,
            photoFile,
            lat,
            lon,
          });

          data = { error: false, message: 'Story saved offline and will be synced when online' };
        }

        if (!data.error) {
          // Trigger push notification for successful story upload (only if online)
          if (isOnline()) {
            try {
              await requestNotificationPermission();
            } catch (notificationError) {
              console.warn('Could not enable notifications:', notificationError);
            }
          }

          const successMessage = isOnline()
            ? "Ceritamu berhasil disimpan."
            : "Ceritamu disimpan offline dan akan disinkronkan saat online.";

          Swal.fire({
            icon: "success",
            title: isOnline() ? "Cerita Terkirim!" : "Cerita Disimpan Offline!",
            text: successMessage,
            timer: 3000,
            showConfirmButton: false,
          });

          form.reset();
          previewPhoto.style.display = "none";
          if (currentMarker) map.removeLayer(currentMarker);
        } else {
          Swal.fire({
            icon: "error",
            title: "Gagal Mengirim Cerita",
            text: data.message,
            confirmButtonColor: "#dc2626",
          });
        }
      } catch (error) {
        // If online upload fails, try to save offline
        if (isOnline()) {
          try {
            await saveOfflineStory({
              description,
              photoFile,
              lat,
              lon,
            });

            Swal.fire({
              icon: "warning",
              title: "Disimpan Offline",
              text: "Gagal mengirim online, cerita disimpan offline untuk disinkronkan nanti.",
              timer: 3000,
              showConfirmButton: false,
            });

            form.reset();
            previewPhoto.style.display = "none";
            if (currentMarker) map.removeLayer(currentMarker);
          } catch (offlineError) {
            Swal.fire({
              icon: "error",
              title: "Terjadi Kesalahan",
              text: error.message,
              confirmButtonColor: "#dc2626",
            });
          }
        } else {
          Swal.fire({
            icon: "error",
            title: "Terjadi Kesalahan",
            text: error.message,
            confirmButtonColor: "#dc2626",
          });
        }
      }
    });
  }
}
