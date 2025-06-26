const FEED_URL = 'https://corsproxy.io/?url=' + encodeURIComponent('https://vbn.aau.dk/en/organisations/blue-marine-maritime-research/persons/?format=rss');

// Keywords to filter by (case-insensitive)
const FILTER_WORDS = ['underwater', 'undervands','ACOMAR','AUV','ROV','eelgrass','acomar'];

function matchesFilter(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return FILTER_WORDS.some(w => lower.includes(w));
}

function normalizeTitleToFilename(title) {
  return title
    .toLowerCase()
    .normalize('NFKD')                     // Normalize accented characters
    .replace(/[^a-z0-9 ]+/g, '')           // Remove non-alphanumeric (except space)
    .trim()
    .replace(/\s+/g, '_') + '.png';        // Replace space(s) with underscore
}

async function fetchProjects() {
  // Fetch and parse the projects feed from rss.js
  const PROJECTS_FEED_URL = 'https://corsproxy.io/?url=' + encodeURIComponent('https://vbn.aau.dk/en/organisations/multimodal-reasoning-for-robotics-and-process-intelligence/projects/?format=rss');
  try {
    const resp = await fetch(PROJECTS_FEED_URL);
    if (!resp.ok) throw new Error('Network error ' + resp.status);
    const text = await resp.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    return Array.from(xml.querySelectorAll('item'));
  } catch (err) {
    console.error('Could not load projects feed:', err);
    return [];
  }
}

async function getProjectTexts() {
  // Try to reuse loaded projects from rss.js if available
  if (window.loadedProjectItems && Array.isArray(window.loadedProjectItems)) {
    return window.loadedProjectItems.map(item => {
      const title = item.title || '';
      const desc = item.description || '';
      return (title + ' ' + desc).toLowerCase();
    });
  }
  // Fallback: fetch projects feed directly
  const projectItems = await fetchProjects();
  return projectItems.map(item => {
    const title = item.querySelector('title')?.textContent || '';
    const desc = item.querySelector('description')?.textContent || '';
    return (title + ' ' + desc).toLowerCase();
  });
}

async function loadProjects() {
  // Only update the team section for matched personnel
  const teamEl = document.getElementById('team');
  if (teamEl) teamEl.innerHTML = '';

  try {
    // Fetch personnel feed
    const resp = await fetch(FEED_URL);
    if (!resp.ok) throw new Error('Network error ' + resp.status);
    const text = await resp.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const items = Array.from(xml.querySelectorAll('item'));

    // Get project texts from rss.js or fetch if not available
    const projectTexts = await getProjectTexts();

    const filtered = items.filter(item => {
      const title = item.querySelector('title')?.textContent;
      const desc = item.querySelector('description')?.textContent;
      return matchesFilter(title) || matchesFilter(desc);
    });

    // Only matched team members
    const team = filtered.filter(item => {
      const title = item.querySelector('title')?.textContent || 'Untitled';
      const personName = title.toLowerCase();
      return projectTexts.some(text => text.includes(personName));
    });

    // Render team section only
    if (teamEl) {
      teamEl.innerHTML = team.length ? '' : '<p>No team members found.</p>';
      team.forEach((item, idx) => {
        const title = item.querySelector('title')?.textContent || 'Untitled';
        const filename = normalizeTitleToFilename(title);
        const imgPath = `projects/${filename}`;
        let descText = item.querySelector('description')?.textContent || '';
        descText = descText.replace(/href="\/en\//g, 'href="https://vbn.aau.dk/en/');
        const container = document.createElement('div');
        container.className = 'timeline-item';
        if (idx % 2 === 1) container.style.flexDirection = 'row-reverse';
        container.innerHTML = `
          <div class="timeline-img">
            <img src="${imgPath}" width="342" height="256" alt="">
          </div>
          <div class="timeline-content">
              <p>${descText}</p>
              <p><strong>Project association:</strong> Yes</p>
          </div>
        `;
        teamEl.appendChild(container);
      });
    }
  } catch (err) {
    console.error(err);
    if (teamEl) teamEl.innerHTML = `<p>Could not load personnel: ${err.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);