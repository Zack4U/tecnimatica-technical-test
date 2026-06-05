import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme.js";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 7,
        border: "1px solid var(--border-ui)",
        backgroundColor: isDark ? "var(--bg-panel)" : "var(--bg-surface)",
        color: isDark ? "var(--text-secondary)" : "var(--text-secondary)",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: 600,
        transition: "all 0.15s",
      }}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        style={{ display: "flex" }}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </motion.span>
      {isDark ? "Claro" : "Oscuro"}
    </button>
  );
}
