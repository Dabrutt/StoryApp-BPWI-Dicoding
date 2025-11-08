export default class LoginPage {
  async render() {
    return `
      <section class="container page-login">
        <div class="login-wrapper">
          <h1 class="login-heading">Selamat Datang di StoryApp</h1>
          
          <form id="loginForm" novalidate>
            <div class="form-item">
              <label for="emailInput">Email</label>
              <input 
                type="email" 
                id="emailInput" 
                name="email" 
                placeholder="nama@email.com" 
                required
              />
            </div>

            <div class="form-item">
              <label for="passwordInput">Kata Sandi</label>
              <input 
                type="password" 
                id="passwordInput" 
                name="password" 
                placeholder="Minimal 8 karakter" 
                required
              />
            </div>

            <button type="submit" class="btn-submit">Masuk Sekarang</button>
          </form>

          <p class="register-text">
            Belum memiliki akun? 
            <a href="#/register" class="register-link">Daftar di sini</a>
          </p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById("loginForm");
    const emailField = document.getElementById("emailInput");
    const passwordField = document.getElementById("passwordInput");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = emailField.value.trim();
      const password = passwordField.value.trim();

      if (!email || !password) {
        return Swal.fire({
          icon: "warning",
          title: "Data Belum Lengkap",
          text: "Mohon isi email dan kata sandi terlebih dahulu.",
          confirmButtonColor: "#2563eb",
        });
      }

      Swal.fire({
        title: "Memverifikasi...",
        text: "Silakan tunggu sebentar.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const request = await fetch("https://story-api.dicoding.dev/v1/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const response = await request.json();

        if (response.error) {
          return Swal.fire({
            icon: "error",
            title: "Login Gagal",
            text: response.message,
            confirmButtonColor: "#dc2626",
          });
        }

        // Simpan data login di localStorage
        localStorage.setItem("token", response.loginResult.token);
        localStorage.setItem("username", response.loginResult.name || email);

        Swal.fire({
          icon: "success",
          title: "Berhasil Masuk!",
          text: "Mengalihkan ke halaman utama...",
          timer: 1600,
          showConfirmButton: false,
        });

        setTimeout(() => {
          window.location.hash = "/";
          window.location.reload();
        }, 1600);
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Terjadi Kesalahan",
          text: error.message || "Gagal memproses permintaan.",
          confirmButtonColor: "#dc2626",
        });
      }
    });
  }
}
