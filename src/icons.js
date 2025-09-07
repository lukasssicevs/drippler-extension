// Phosphor Icons Helper for Chrome Extension
// This module provides easy access to Phosphor icons

/**
 * Creates a Phosphor icon element
 * @param {string} iconName - The name of the Phosphor icon (e.g., 'plus', 'user', 'heart')
 * @param {number} size - Size in pixels (default: 16)
 * @param {string} weight - Icon weight: 'thin', 'light', 'regular', 'bold', 'fill', 'duotone' (default: 'regular')
 * @param {string} color - CSS color value (default: 'currentColor')
 * @param {string} className - Additional CSS classes
 * @returns {HTMLElement} Icon element
 */
export function createIcon(
  iconName,
  size = 16,
  weight = "regular",
  color = "currentColor",
  className = ""
) {
  const icon = document.createElement("i");
  icon.className = `ph${
    weight === "regular" ? "" : `-${weight}`
  } ph-${iconName} ${className}`.trim();
  icon.style.fontSize = `${size}px`;
  icon.style.color = color;
  return icon;
}

/**
 * Creates a Phosphor icon as HTML string
 * @param {string} iconName - The name of the Phosphor icon
 * @param {number} size - Size in pixels (default: 16)
 * @param {string} weight - Icon weight (default: 'regular')
 * @param {string} color - CSS color value (default: 'currentColor')
 * @param {string} className - Additional CSS classes
 * @returns {string} Icon HTML string
 */
export function createIconHTML(
  iconName,
  size = 16,
  weight = "regular",
  color = "currentColor",
  className = ""
) {
  const weightClass = weight === "regular" ? "ph" : `ph-${weight}`;
  const style = `font-size: ${size}px; color: ${color};`;
  return `<i class="${weightClass} ph-${iconName} ${className}" style="${style}"></i>`;
}

/**
 * Replace an existing element with a Phosphor icon
 * @param {HTMLElement} element - Element to replace
 * @param {string} iconName - The name of the Phosphor icon
 * @param {number} size - Size in pixels (default: 16)
 * @param {string} weight - Icon weight (default: 'regular')
 * @param {string} color - CSS color value (default: 'currentColor')
 * @param {string} className - Additional CSS classes
 */
export function replaceWithIcon(
  element,
  iconName,
  size = 16,
  weight = "regular",
  color = "currentColor",
  className = ""
) {
  const icon = createIcon(iconName, size, weight, color, className);
  element.parentNode.replaceChild(icon, element);
}

/**
 * Add a Phosphor icon to an existing element
 * @param {HTMLElement} element - Element to add icon to
 * @param {string} iconName - The name of the Phosphor icon
 * @param {number} size - Size in pixels (default: 16)
 * @param {string} weight - Icon weight (default: 'regular')
 * @param {string} color - CSS color value (default: 'currentColor')
 * @param {string} className - Additional CSS classes
 * @param {boolean} prepend - Whether to prepend (true) or append (false) the icon
 */
export function addIconToElement(
  element,
  iconName,
  size = 16,
  weight = "regular",
  color = "currentColor",
  className = "",
  prepend = true
) {
  const icon = createIcon(iconName, size, weight, color, className);
  if (prepend) {
    element.insertBefore(icon, element.firstChild);
  } else {
    element.appendChild(icon);
  }
}

// Icon name mappings for common use cases
export const IconNames = {
  // Basic actions
  PLUS: "plus",
  MINUS: "minus",
  X: "x",
  CHECK: "check",

  // Navigation
  ARROW_LEFT: "arrow-left",
  ARROW_RIGHT: "arrow-right",
  ARROW_UP: "arrow-up",
  ARROW_DOWN: "arrow-down",
  CARET_LEFT: "caret-left",
  CARET_RIGHT: "caret-right",
  CARET_UP: "caret-up",
  CARET_DOWN: "caret-down",

  // User & Profile
  USER: "user",
  USER_CIRCLE: "user-circle",
  USERS: "users",

  // Actions
  HEART: "heart",
  STAR: "star",
  BOOKMARK: "bookmark",
  SHARE: "share",
  DOWNLOAD: "download",
  UPLOAD: "upload",

  // Interface
  GEAR: "gear",
  BELL: "bell",
  MAGNIFYING_GLASS: "magnifying-glass",
  FUNNEL: "funnel",
  DOTS_THREE: "dots-three",
  DOTS_THREE_VERTICAL: "dots-three-vertical",

  // Media
  PLAY: "play",
  PAUSE: "pause",
  STOP: "stop",
  CAMERA: "camera",
  IMAGE: "image",
  FILM_STRIP: "film-strip",

  // Communication
  CHAT: "chat",
  ENVELOPE: "envelope",
  PHONE: "phone",

  // Files & Folders
  FOLDER: "folder",
  FILE: "file",
  FILE_IMAGE: "file-image",
  TRASH: "trash",

  // Shopping & Fashion (relevant for Drippler)
  SHOPPING_BAG: "shopping-bag",
  SHOPPING_CART: "shopping-cart",
  DRESS: "dress",
  T_SHIRT: "t-shirt",
  PANTS: "pants",
  SNEAKER: "sneaker",
  HANDBAG: "handbag",

  // Status & Feedback
  INFO: "info",
  WARNING: "warning",
  ERROR: "x-circle",
  SUCCESS: "check-circle",

  // Loading & Refresh
  SPINNER: "spinner",
  ARROW_CLOCKWISE: "arrow-clockwise",
  ARROW_COUNTER_CLOCKWISE: "arrow-counter-clockwise",

  // Authentication
  SIGN_IN: "sign-in",
  SIGN_OUT: "sign-out",
  LOCK: "lock",
  UNLOCK: "lock-open",

  // Content
  EYE: "eye",
  EYE_SLASH: "eye-slash",
  COPY: "copy",
  LINK: "link",

  // Layout
  GRID_FOUR: "grid-four",
  LIST: "list",
  COLUMNS: "columns",

  // Special Drippler icons
  SPARKLE: "sparkle",
  MAGIC_WAND: "magic-wand",
  PALETTE: "palette",
  CROWN: "crown",
};

// Weight options
export const IconWeights = {
  THIN: "thin",
  LIGHT: "light",
  REGULAR: "regular",
  BOLD: "bold",
  FILL: "fill",
  DUOTONE: "duotone",
};
