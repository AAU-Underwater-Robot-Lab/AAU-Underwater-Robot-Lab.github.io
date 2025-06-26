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