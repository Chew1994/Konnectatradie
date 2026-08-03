import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/]react(?:-dom)?[\\/]/
            },
            {
              name: "supabase-vendor",
              test: /node_modules[\\/]@supabase[\\/]/
            },
            {
              name: "icons-vendor",
              test: /node_modules[\\/]lucide-react[\\/]/
            }
          ]
        }
      }
    }
  }
});
