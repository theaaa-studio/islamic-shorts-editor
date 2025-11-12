// HTML Partial Loader
// Loads HTML partials from assets/html/ and inserts them into the page

async function loadHTMLPartial(containerId, partialPath) {
  try {
    const response = await fetch(partialPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${partialPath}: ${response.statusText}`);
    }
    const html = await response.text();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
    } else {
      console.warn(`Container with id "${containerId}" not found`);
    }
  } catch (error) {
    console.error(`Error loading ${partialPath}:`, error);
  }
}

// Load all HTML partials when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Load sidebar sections
  await loadHTMLPartial('brand-container', 'assets/html/brand.html');
  await loadHTMLPartial('input-panel-container', 'assets/html/input-panel.html');
  await loadHTMLPartial('background-panel-container', 'assets/html/background-panel.html');
  await loadHTMLPartial('typography-panel-container', 'assets/html/typography-panel.html');
  await loadHTMLPartial('credits-panel-container', 'assets/html/credits-panel.html');
  await loadHTMLPartial('playback-panel-container', 'assets/html/playback-panel.html');
  
  // Load preview section
  await loadHTMLPartial('preview-container', 'assets/html/preview.html');
  
  // Dispatch custom event when all HTML partials are loaded
  window.dispatchEvent(new CustomEvent('htmlPartialsLoaded'));
});

