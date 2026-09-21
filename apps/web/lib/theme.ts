/**
 * Theme bootstrap. Runs before first paint from the root layout and applies
 * the stored theme, falling back to the system preference. The toggle in the
 * header writes the same storage key. Dark is the primary presentation, but
 * the choice is the user's.
 */
export const themeInitScript = `(function(){var s;try{s=localStorage.getItem("stackreplay-theme");}catch(e){}var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);})();`;

export const themeStorageKey = "stackreplay-theme";
