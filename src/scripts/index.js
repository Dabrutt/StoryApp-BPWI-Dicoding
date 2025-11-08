import "../styles/styles.css";
import App from "./pages/app.js";
import { sleep as delay } from "../utils/index.js";
import { initOfflineSync } from "./data/api.js";

// Register service worker for push notifications and offline sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Initialize offline sync functionality
initOfflineSync();

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    content: document.querySelector("#app"),
    drawerButton: document.querySelector(".drawer-button"),
    navigationDrawer: document.querySelector(".navigation-drawer"),
  });

  const btnAuth = document.getElementById("login-link");
  const token = localStorage.getItem("token");

  if (!token) {
    if (
      window.location.hash === "" ||
      window.location.hash === "#/" ||
      window.location.hash === "#/home"
    ) {
      window.location.hash = "#/login";
    }
  } else if (
    window.location.hash === "#/login" ||
    window.location.hash === "#/register"
  ) {
    window.location.hash = "#/";
  }

  if (token) {
    btnAuth.textContent = "Logout";
    btnAuth.addEventListener("click", async (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      alert("Kamu berhasil keluar dari akunmu!");
      window.location.hash = "#/login";
      await delay(500);
      window.location.reload();
    });
  } else {
    btnAuth.textContent = "Login";
    btnAuth.setAttribute("href", "#/login");
  }

  await app.renderPage();

  const handleNavigation = async () => {
    if (!document.startViewTransition) {
      await app.renderPage();
      return;
    }

    document.startViewTransition(async () => {
      await app.renderPage();
    });
  };

  window.addEventListener("hashchange", handleNavigation);
  window.addEventListener("load", handleNavigation);
});
