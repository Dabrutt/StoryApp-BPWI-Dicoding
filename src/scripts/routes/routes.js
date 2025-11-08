import HomePage from "../pages/home/home-page";
import AboutPage from "../pages/about/about-page";
import MapPage from "../pages/map/map";
import AddStory from "../pages/add/add-page";
import LoginPage from "../pages/login/login-page";
import RegisterPage from "../pages/register/register-page";
import FavoritePage from "../pages/favorite/favorite-page";

const routes = {
  "/": new HomePage(),
  "/about": new AboutPage(),
  "/map": new MapPage(),
  "/add-story": new AddStory(),
  "/login": new LoginPage(),
  "/register": new RegisterPage(),
  "/saved-stories": new FavoritePage(),
};

export default routes;
