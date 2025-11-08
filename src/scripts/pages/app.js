import routes from "../routes/routes";
import { getActiveRoute } from "../routes/url-parser";

class App {
  #content;
  #drawerBtn;
  #navDrawer;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerBtn = drawerButton;
    this.#navDrawer = navigationDrawer;

    this.#initDrawerEvents();
  }

  #initDrawerEvents() {
    this.#drawerBtn.addEventListener("click", () => {
      this.#navDrawer.classList.toggle("open");
    });

    document.body.addEventListener("click", (e) => {
      const isClickInsideDrawer = this.#navDrawer.contains(e.target);
      const isClickOnButton = this.#drawerBtn.contains(e.target);

      if (!isClickInsideDrawer && !isClickOnButton) {
        this.#navDrawer.classList.remove("open");
      }

      // Tutup drawer saat link di dalamnya diklik
      this.#navDrawer.querySelectorAll("a").forEach((link) => {
        if (link.contains(e.target)) {
          this.#navDrawer.classList.remove("open");
        }
      });
    });
  }

  async renderPage() {
    const currentRoute = getActiveRoute();
    const activePage = routes[currentRoute];

    if (!activePage) {
      this.#content.innerHTML = `<h2>Halaman tidak ditemukan</h2>`;
      return;
    }

    const renderContent = async () => {
      this.#content.innerHTML = await activePage.render();
      await activePage.afterRender();
    };

    if (document.startViewTransition) {
      document.startViewTransition(renderContent);
    } else {
      await renderContent();
    }
  }
}

export default App;
