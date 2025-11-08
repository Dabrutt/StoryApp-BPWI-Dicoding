import { getAllFavorites, deleteFavorite, clearAllFavorites } from "../../../utils/idb.js";

export default class FavoritePage {
  async render() {
    return `
      <section class="container favorite-page">
        <header>
          <h1>Koleksi Favorit</h1>
          <p>Story yang Anda simpan untuk dibaca nanti</p>
        </header>

        <div class="favorite-controls">
          <button id="clear-all-btn" class="clear-all-btn">Hapus Semua</button>
        </div>

        <div id="favorite-list" class="favorite-list">
          <div class="loading">Memuat stories favorit...</div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const favoriteList = document.getElementById('favorite-list');
    const clearAllBtn = document.getElementById('clear-all-btn');

    // Load favorite stories
    await this.loadFavoriteStories();

    // Clear all handler
    clearAllBtn.addEventListener('click', async () => {
      const result = await Swal.fire({
        title: 'Hapus Semua?',
        text: 'Apakah Anda yakin ingin menghapus semua story favorit?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Hapus Semua',
        cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
        try {
          await clearAllFavorites();
          await this.loadFavoriteStories();
          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Semua story favorit telah dihapus.',
            timer: 2000,
            showConfirmButton: false
          });
        } catch (error) {
          console.error('Error clearing favorites:', error);
          Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: 'Terjadi kesalahan saat menghapus stories.',
            confirmButtonColor: '#dc2626'
          });
        }
      }
    });
  }

  async loadFavoriteStories() {
    const favoriteList = document.getElementById('favorite-list');

    try {
      const favorites = await getAllFavorites();

      if (favorites.length === 0) {
        favoriteList.innerHTML = `
          <div class="empty-state">
            <h3>Belum ada story favorit</h3>
            <p>Klik ikon hati pada story di halaman Home untuk menyimpannya ke favorit.</p>
          </div>
        `;
        return;
      }

      favoriteList.innerHTML = favorites
        .map((story) => {
          const time = story.createdAt
            ? new Date(story.createdAt).toLocaleString("id-ID")
            : "Tanggal tidak diketahui";
          return `
        <article class="favorite-card" data-id="${story.id}">
          <img src="${story.photoUrl}" alt="Foto ${story.name}" loading="lazy" />
          <div class="favorite-info">
            <h3>${story.name}</h3>
            <p>${story.description}</p>
            <small>📅 ${time}</small>
          </div>
          <button class="remove-favorite-btn" data-id="${story.id}" aria-label="Hapus dari favorit">
            🗑️
          </button>
        </article>
      `;
        })
        .join("");

      // Add remove handlers
      document.querySelectorAll('.remove-favorite-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const storyId = e.target.dataset.id;
          await this.removeFavorite(storyId);
        });
      });

    } catch (error) {
      console.error('Error loading favorites:', error);
      favoriteList.innerHTML = `
        <div class="error-state">
          <h3>Gagal memuat stories favorit</h3>
          <p>Silakan coba lagi nanti.</p>
        </div>
      `;
    }
  }

  async removeFavorite(storyId) {
    try {
      await deleteFavorite(storyId);
      await this.loadFavoriteStories(); // Refresh list without page reload

      Swal.fire({
        icon: 'success',
        title: 'Dihapus!',
        text: 'Story telah dihapus dari favorit.',
        timer: 1500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Terjadi kesalahan saat menghapus story.',
        confirmButtonColor: '#dc2626'
      });
    }
  }
}
