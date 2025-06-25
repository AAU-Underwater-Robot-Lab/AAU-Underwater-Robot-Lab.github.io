const FEED_URL = 'https://vbn.aau.dk/da/organisations/offshore-drones-and-robotics/projects/?format=rss';

async function loadProjects() {
  const listEl = document.getElementById('project-list');
  listEl.innerHTML = '<li>Indlæser projekter…</li>';

  try {
    const response = await fetch(FEED_URL);
    if (!response.ok) throw new Error('Netværksfejl ' + response.status);
    const text = await response.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const items = Array.from(xml.querySelectorAll('item'));
    if (items.length === 0) {
      listEl.innerHTML = '<li>Ingen projekter fundet.</li>';
      return;
    }

    listEl.innerHTML = '';
    items.forEach(item => {
      const title = item.querySelector('title')?.textContent || 'Uden titel';
      const link = item.querySelector('link')?.textContent || '#';
      const date = item.querySelector('pubDate')?.textContent;
      const dateStr = date ? new Date(date).toLocaleDateString('da-DK') : '';

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link;
      a.textContent = title;
      a.target = '_blank';
      li.appendChild(a);

      if (dateStr) {
        const span = document.createElement('span');
        span.className = 'pubDate';
        span.textContent = ' (' + dateStr + ')';
        li.appendChild(span);
      }
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<li>Kunne ikke hente RSS‑feed: ' + err.message + '</li>';
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);
