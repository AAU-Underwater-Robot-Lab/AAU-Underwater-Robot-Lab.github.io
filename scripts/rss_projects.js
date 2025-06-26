const FEED_URL = 'https://corsproxy.io/?url=' + encodeURIComponent('https://vbn.aau.dk/en/organisations/multimodal-reasoning-for-robotics-and-process-intelligence/projects/?format=rss');

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

function parseProjectDescription(descriptionHTML) {
  const doc = new DOMParser().parseFromString(descriptionHTML, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return {};

  // Title
  const title = root.querySelector('.title span')?.textContent?.trim() || '';

  // Participants
  const participants = [];
  const peopleP = root.querySelector('p:not(.period):not(.type)');
  if (peopleP) {
    peopleP.querySelectorAll('a.person').forEach(a => {
      const name = a.textContent.trim();
      const href = a.getAttribute('href');
      // Role is the text node after the <a>
      let role = '';
      let node = a.nextSibling;
      while (node && node.nodeType === Node.TEXT_NODE && !role) {
        const match = node.textContent.match(/\(([^)]+)\)/);
        if (match) role = match[1].trim();
        node = node.nextSibling;
      }
      participants.push({ name, href, role });
    });
  }

  // Dates
  const periodP = root.querySelector('p.period');
  const dates = periodP ? Array.from(periodP.querySelectorAll('.date')).map(e => e.textContent.trim()) : [];
  const [startDate, endDate] = dates;

  // Type
  const typeP = root.querySelector('p.type');
  const typeFamily = typeP?.querySelector('.type_family')?.textContent.replace(/:$/, '').trim() || '';
  const typeClassification = typeP?.querySelector('.type_classification')?.textContent.trim() || '';

  return {
    parsedTitle: title,
    participants,
    startDate,
    endDate,
    typeFamily,
    typeClassification
  };
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

    // Save filtered project items for use in other scripts, with parsed description
    window.loadedProjectItems = filtered.map(item => {
      const description = item.querySelector('description')?.textContent || '';
      const parsed = parseProjectDescription(description);
      return {
        title: item.querySelector('title')?.textContent || '',
        description,
        link: item.querySelector('link')?.textContent || '',
        pubDate: item.querySelector('pubDate')?.textContent || '',
        ...parsed
      };
    });

    timelineEl.innerHTML = filtered.length ? '' : '<p>No matching projects found.</p>';

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