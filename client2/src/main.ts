import { createApp } from "vue"
//@ts-ignore
import VueShopifyDraggable from "vue-shopify-draggable";
import App from "./App.vue"

import "./assets/global.css";

createApp(App).use(VueShopifyDraggable).mount("#app")
