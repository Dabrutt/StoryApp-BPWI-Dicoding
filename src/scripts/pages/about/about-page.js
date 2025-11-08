export default class AboutPage {
  async render() {
    return `
      <section class="container about-page">
        <div class="about-hero">
          <h1>Tentang StoryApp</h1>
          <p>
            StoryApp adalah platform untuk berbagi cerita dan foto dengan fitur berbasis lokasi. 
            Pengguna dapat membagikan pengalaman pribadi, perjalanan, atau momen istimewa yang akan 
            ditandai di peta, memungkinkan orang lain menemukan inspirasi dari berbagai lokasi.
          </p>
        </div>

        <div class="about-content">
          <h2>Bagikan Ceritamu</h2>
          <p>
            Unggah foto-foto terbaikmu dan tuliskan kisah menarik di baliknya! Setiap cerita 
            yang kamu bagikan tidak hanya akan muncul di halaman utama StoryApp, tetapi juga 
            bisa diakses dan dinikmati oleh pengguna dari berbagai belahan dunia. Dengan begitu, 
            pengalamanmu dapat menginspirasi orang lain, sekaligus memperluas jaringan dan interaksi 
            dengan komunitas global yang memiliki minat serupa.
          </p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    console.log("Halaman AboutPage berhasil dirender.");
  }
}
