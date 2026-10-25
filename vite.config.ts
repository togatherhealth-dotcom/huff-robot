import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps the build working from any folder or sub-path (for embedding in the portfolio later)
export default defineConfig({ plugins: [react()], base: "./" });
