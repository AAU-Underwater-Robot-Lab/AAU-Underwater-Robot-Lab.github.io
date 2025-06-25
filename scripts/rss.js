const FEED_URL = 'https://corsproxy.io/?url=' + encodeURIComponent('https://vbn.aau.dk/en/organisations/esbjerg-energy-section/projects/?format=rss');

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

async function loadProjects() {
  const timelineEl = document.getElementById('project-timeline');
  timelineEl.innerHTML = '<p>Loading projects…</p>';

  try {
    const resp = await fetch(FEED_URL);
    if (!resp.ok) throw new Error('Network error ' + resp.status);
    const text = await resp.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const items = Array.from(xml.querySelectorAll('item'));

    const filtered = items.filter(item => {
      const title = item.querySelector('title')?.textContent;
      const desc = item.querySelector('description')?.textContent;
      return matchesFilter(title) || matchesFilter(desc);
    });

    timelineEl.innerHTML = filtered.length ?
      '' : '<p>No matching projects found.</p>';

    filtered.forEach((item, idx) => {
      const title = item.querySelector('title')?.textContent || 'Untitled';
      const link = item.querySelector('link')?.textContent || '#';
      const date = item.querySelector('pubDate')?.textContent;
      const dateStr = date ? new Date(date).getFullYear() : 'Year unknown';

      const filename = normalizeTitleToFilename(title);
      const imgPath = `projects/${filename}`;
      let descText = item.querySelector('description')?.textContent || '';
      // Convert relative links to absolute
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
        </div>
      `;
      timelineEl.appendChild(container);
    });

  } catch (err) {
    console.error(err);
    timelineEl.innerHTML = `<p>Could not load projects: ${err.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);