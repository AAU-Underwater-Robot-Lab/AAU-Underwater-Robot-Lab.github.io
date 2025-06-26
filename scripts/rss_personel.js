const PERSONNEL_FEED_URL = 'https://corsproxy.io/?url=' + encodeURIComponent('https://vbn.aau.dk/en/organisations/blue-marine-maritime-research/persons/?format=rss');

function normalizeTitleToFilename(title) {
  return title
    .toLowerCase()
    .normalize('NFKD')                     // Normalize accented characters
    .replace(/[^a-z0-9 ]+/g, '')           // Remove non-alphanumeric (except space)
    .trim()
    .replace(/\s+/g, '_') + '.png';        // Replace space(s) with underscore
}

function extractPersonLinksFromProjects(projectDescriptions) {
  // Extract all /en/persons/ links from all project descriptions
  const personLinks = new Set();
  const regex = /href=\"(\/en\/persons\/[^\"]+)/g;
  for (const desc of projectDescriptions) {
    let match;
    while ((match = regex.exec(desc)) !== null) {
      personLinks.add(match[1]);
    }
  }
  return personLinks;
}

async function getProjectPersonLinks() {
  if (window.loadedProjectItems && Array.isArray(window.loadedProjectItems)) {
    const descriptions = window.loadedProjectItems.map(item => item.description || '');
    return extractPersonLinksFromProjects(descriptions);
  }
  // Fallback: fetch projects feed directly
  const PROJECTS_FEED_URL = 'https://corsproxy.io/?url=' + encodeURIComponent('https://vbn.aau.dk/en/organisations/multimodal-reasoning-for-robotics-and-process-intelligence/projects/?format=rss');
  try {
    const resp = await fetch(PROJECTS_FEED_URL);
    if (!resp.ok) throw new Error('Network error ' + resp.status);
    const text = await resp.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const projectItems = Array.from(xml.querySelectorAll('item'));
    const descriptions = projectItems.map(item => item.querySelector('description')?.textContent || '');
    return extractPersonLinksFromProjects(descriptions);
  } catch {
    return new Set();
  }
}

async function fetchPersonPhoto(personUrl) {
  try {
    // Use corsproxy.io to avoid CORS issues
    const resp = await fetch('https://corsproxy.io/?url=' + encodeURIComponent(personUrl));
    if (!resp.ok) throw new Error('Network error ' + resp.status);
    const html = await resp.text();
    // Parse the HTML and look for a <section class="profile">
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const profileSection = doc.querySelector('section.profile');
    if (profileSection) {
      const picture = profileSection.querySelector('picture');
      if (picture) {
        // Try to find the first <img> inside <picture>
        const img = picture.querySelector('img');
        if (img && img.getAttribute('src')) {
          let src = img.getAttribute('src');
          if (src && !src.startsWith('http')) src = 'https://vbn.aau.dk' + src;
          return src;
        }
        // Or try <source srcset>
        const source = picture.querySelector('source');
        if (source && source.getAttribute('srcset')) {
          let src = source.getAttribute('srcset').split(',')[0].trim().split(' ')[0];
          if (src && !src.startsWith('http')) src = 'https://vbn.aau.dk' + src;
          return src;
        }
      }
    }
  } catch (err) {
    // Ignore errors, fallback to default
  }
  return null;
}

async function loadProjects() {
  // Only update the team section for matched personnel
  const teamEl = document.getElementById('team');
  if (teamEl) teamEl.innerHTML = '';

  try {
    // Fetch personnel feed
    const resp = await fetch(PERSONNEL_FEED_URL);
    if (!resp.ok) throw new Error('Network error ' + resp.status);
    const text = await resp.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const items = Array.from(xml.querySelectorAll('item'));

    // Get all /en/persons/ links from project descriptions
    const projectPersonLinks = await getProjectPersonLinks();

    // Only matched team members: link must match a /en/persons/ link in any project description
    const team = items.filter(item => {
      const personLink = item.querySelector('link')?.textContent || '';
      // Extract the /en/persons/... part from the link
      const match = personLink.match(/\/en\/persons\/[^/]+/);
      if (!match) return false;
      return projectPersonLinks.has(match[0]);
    });

    // Render team section only
    if (teamEl) {
      teamEl.innerHTML = team.length ? '' : '<p>No team members found.</p>';
      const grid = document.createElement('div');
      grid.className = 'team-grid';
      for (let idx = 0; idx < team.length; idx++) {
        const item = team[idx];
        const title = item.querySelector('title')?.textContent || 'Untitled';
        const filename = normalizeTitleToFilename(title);
        let imgPath = `projects/${filename}`;
        let descText = item.querySelector('description')?.textContent || '';
        descText = descText.replace(/href="\/en\//g, 'href="https://vbn.aau.dk/en/');
        // Try to get the photo from the personnel profile page
        const personLink = item.querySelector('link')?.textContent || '';
        let photoUrl = await fetchPersonPhoto(personLink);
        if (!photoUrl) photoUrl = imgPath;
        const card = document.createElement('div');
        card.className = 'team-card';
        card.innerHTML = `
          <div class="team-card-img">
            <img src="${photoUrl}" width="120" height="120" alt="">
          </div>
          <div class="team-card-content">
            <h4>${title}</h4>
            <div class="team-card-desc">${descText}</div>
          </div>
        `;
        grid.appendChild(card);
      }
      teamEl.appendChild(grid);
    }
  } catch (err) {
    console.error(err);
    if (teamEl) teamEl.innerHTML = `<p>Could not load personnel: ${err.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);