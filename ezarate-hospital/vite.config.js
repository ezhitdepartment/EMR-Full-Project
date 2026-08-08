import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Allows any Host header to reach the dev server — needed because
    // Cloudflare's quick tunnels (trycloudflare.com) proxy requests
    // through a random subdomain that changes every time cloudflared is
    // restarted, and Vite blocks unrecognized hosts by default as a
    // DNS-rebinding protection. Fine for local stress-test tunneling;
    // if you later run this behind a permanent domain, swap `true` for
    // an explicit array of that domain instead.
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
})