export default class RegisterPage {
  async render() {
    return `
      <section class="container register-page">
        <div class="register-panel">
          <h1 class="register-heading">Daftar Menjadi Pengguna StoryApp</h1>

          <form id="signupForm" class="signup-form">
            <div class="form-control">
              <label for="signupName">Nama Lengkap</label>
              <input
                type="text"
                id="signupName"
                name="name"
                placeholder="Tulis nama lengkapmu"
                required
              />
            </div>

            <div class="form-control">
              <label for="signupEmail">Alamat Email</label>
              <input
                type="email"
                id="signupEmail"
                name="email"
                placeholder="contoh@mail.com"
                required
              />
            </div>

            <div class="form-control">
              <label for="signupPassword">Kata Sandi</label>
              <input
                type="password"
                id="signupPassword"
                name="password"
                placeholder="Minimal 6 karakter"
                minlength="6"
                required
              />
            </div>

            <button type="submit" class="btn-primary">Buat Akun</button>
          </form>

          <p class="redirect-text">
            Sudah punya akun?
            <a href="#/login" class="redirect-link">Masuk Sekarang</a>
          </p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const signupForm = document.querySelector("#signupForm");

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.querySelector("#signupName").value.trim();
      const email = document.querySelector("#signupEmail").value.trim();
      const password = document.querySelector("#signupPassword").value.trim();

      // 🔹 Validasi input
      if (!name || !email || !password) {
        Swal.fire({
          icon: "warning",
          title: "Input tidak lengkap",
          text: "Mohon isi semua kolom dengan benar.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      if (password.length < 6) {
        Swal.fire({
          icon: "info",
          title: "Kata sandi lemah",
          text: "Gunakan minimal 6 karakter agar lebih aman.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      // 🔹 Proses pendaftaran
      Swal.fire({
        title: "Memproses data...",
        text: "Sedang membuat akunmu, harap tunggu.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const res = await fetch("https://story-api.dicoding.dev/v1/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const result = await res.json();

        if (result.error) {
          Swal.fire({
            icon: "error",
            title: "Pendaftaran Gagal",
            text: result.message || "Terjadi kesalahan saat membuat akun.",
            confirmButtonColor: "#dc2626",
          });
          return;
        }

        // 🔹 Pendaftaran berhasil
        Swal.fire({
          icon: "success",
          title: "Akun Berhasil Dibuat 🎉",
          text: "Silakan login menggunakan akun yang baru kamu buat.",
          timer: 2000,
          showConfirmButton: false,
        });

        setTimeout(() => {
          window.location.hash = "#/login";
        }, 1800);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Kesalahan Sistem",
          text: err.message || "Tidak dapat terhubung ke server.",
          confirmButtonColor: "#dc2626",
        });
      }
    });
  }
}
