const FEED_URL = 'https://api.allorigins.win/raw?url=' +
  encodeURIComponent('https://vbn.aau.dk/da/organisations/offshore-drones-and-robotics/projects/?format=rss');

async function loadProjects() {
  const timelineEl = document.getElementById('project-timeline');
  timelineEl.innerHTML = '<p>Loading projects…</p>';

  try {
    const response = await fetch(FEED_URL);
    if (!response.ok) throw new Error('Network error ' + response.status);
    const text = await response.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const items = Array.from(xml.querySelectorAll('item'));
    if (items.length === 0) {
      timelineEl.innerHTML = '<p>No projects found.</p>';
      return;
    }

    timelineEl.innerHTML = '';
    items.forEach((item, idx) => {
      const title = item.querySelector('title')?.textContent || 'Untitled';
      const link = item.querySelector('link')?.textContent || '#';
      const date = item.querySelector('pubDate')?.textContent;
      const desc = item.querySelector('description')?.textContent || '';
      const dateStr = date ? new Date(date).getFullYear() : 'Unknown Year';

      const container = document.createElement('div');
      container.className = 'timeline-item';
      if (idx % 2 === 1) container.style.flexDirection = 'row-reverse';

      const imgDiv = document.createElement('div');
      imgDiv.className = 'timeline-img';
      const img = document.createElement('img');
      img.src = 'assets/project_placeholder.png';
      img.style.width = '256px';
      img.style.height = '256px';
      imgDiv.appendChild(img);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'timeline-content';

      const titleEl = document.createElement('div');
      titleEl.className = 'timeline-title';
      titleEl.innerHTML = `<a href="${link}" target="_blank">${title}</a>`;

      const meta1 = document.createElement('div');
      meta1.className = 'timeline-meta';
      meta1.textContent = 'Type: Research Project';

      const meta2 = document.createElement('div');
      meta2.className = 'timeline-meta';
      meta2.textContent = `Period: ${dateStr}`;

      const p = document.createElement('p');
      p.textContent = desc;

      [titleEl, meta1, meta2, p].forEach(el => contentDiv.appendChild(el));
      container.appendChild(imgDiv);
      container.appendChild(contentDiv);
      timelineEl.appendChild(container);
    });
  } catch (err) {
    console.error(err);
    timelineEl.innerHTML = '<p>Could not load project feed: ' + err.message + '</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);
