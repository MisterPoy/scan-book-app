(() => {
  try {
    const preference = localStorage.getItem("kodeks-theme-preference");
    const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = preference === "dark" || (preference !== "light" && systemIsDark)
      ? "dark"
      : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#0B1120" : "#3B82F6",
    );
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
