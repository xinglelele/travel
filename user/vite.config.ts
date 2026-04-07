import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
    // vue-i18n 优化：启用特性标志以获得更好的 tree-shaking
    __VUE_I18N_FEATURE_FLAGS__: JSON.stringify({
      __BRIDGE__: true,
      __INTLIFY__: true
    })
  },
});
