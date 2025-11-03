export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: { extend: {} },
    safelist: [
      "text-[var(--ocean-blue)]",
      "text-[var(--glow-green)]",
      "bg-[var(--steel-gray)]",
      "hover:bg-[var(--steel-gray)]",
      "group-hover:text-[var(--ocean-blue)]",
      "lg:w-1/6",
    ],
    plugins: [],
  };