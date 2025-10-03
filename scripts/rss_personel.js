const PERSONNEL_FEED_URL = 'https://corsproxy.io/?url=' + encodeURIComponent('https://vbn.aau.dk/en/organisations/underwater-technology/persons/?format=rss');

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
  const PROJECTS_FEED_URL = 'https://corsproxy.io/?url=' + encodeURIComponent('https://vbn.aau.dk/en/organisations/underwater-technology/projects/?format=rss');
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

function parsePersonnelItem(item) {
  const title = item.querySelector('title')?.textContent || '';
  const link = item.querySelector('link')?.textContent || '';
  const description = item.querySelector('description')?.textContent || '';
  let heading = '', email = '', role = '', organizations = [];
  if (description) {
    const parser = new DOMParser();
    const descDoc = parser.parseFromString(description, 'text/html');
    // Heading
    heading = descDoc.querySelector('h3.title')?.textContent?.trim() || '';
    // Email (try to get the visible part, not the obfuscated script)
    const emailA = descDoc.querySelector('ul.relations.email a.email');
    if (emailA) {
      // Replace encryptedA() and encryptedDot() with @ and .
      let raw = emailA.innerHTML
        .replace(/<script>encryptedA\(\);<\/script>/g, '@')
        .replace(/<script>encryptedDot\(\);<\/script>/g, '.')
        .replace(/<[^>]+>/g, '') // Remove any other tags
        .replace(/\s+/g, '')
        .replace(/\n/g, '');
      email = raw;
    }
    // Role
    role = descDoc.querySelector('p.type')?.textContent?.replace(/Person: /, '').trim() || '';
    // Organizations
    organizations = Array.from(descDoc.querySelectorAll('ul.relations.organisations li')).map(li => li.textContent.trim()).filter(Boolean);
  }
  return {
    title,
    link,
    description,
    heading,
    email,
    role,
    organizations
  };
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

    // Build a map of person link to project count
    const personProjectCount = {};
    if (window.loadedProjectItems && Array.isArray(window.loadedProjectItems)) {
      for (const project of window.loadedProjectItems) {
        if (project.participants && Array.isArray(project.participants)) {
          for (const p of project.participants) {
            if (p.href && p.href.startsWith('/en/persons/')) {
              personProjectCount[p.href] = (personProjectCount[p.href] || 0) + 1;
            }
          }
        }
      }
    } 

    // Only matched team members: link must match a /en/persons/ link in any project description
    const team = items;

    // Sort by number of projects (descending)
    team.sort((a, b) => {
      const aLink = a.querySelector('link')?.textContent.match(/\/en\/persons\/[^/]+/);
      const bLink = b.querySelector('link')?.textContent.match(/\/en\/persons\/[^/]+/);
      const aCount = aLink ? (personProjectCount[aLink[0]] || 0) : 0;
      const bCount = bLink ? (personProjectCount[bLink[0]] || 0) : 0;
      return bCount - aCount;
    });

    // Render team section only
    if (teamEl) {
      teamEl.innerHTML = team.length ? '' : '<p>No team members found.</p>';
      const grid = document.createElement('div');
      grid.className = 'team-grid';
      for (let idx = 0; idx < team.length; idx++) {
        const item = team[idx];
        const person = parsePersonnelItem(item);
        const filename = normalizeTitleToFilename(person.title);
        let imgPath = `projects/${filename}`;
        // Try to get the photo from the personnel profile page
        let photoUrl = await fetchPersonPhoto(person.link);
        if (!photoUrl) photoUrl = imgPath;
        // Get project count
        const personLink = person.link.match(/\/en\/persons\/[^/]+/);
        const projectCount = personLink ? (personProjectCount[personLink[0]] || 0) : 0;
        const isFormer = projectCount === 0;
        const card = document.createElement('a');
        card.className = 'team-card';
        card.href = person.link;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.innerHTML = `
          <div class="team-card-img">
            <img src="${photoUrl}" width="120" height="120" alt="">
          </div>
          <div class="team-card-content">
            <h4>${person.heading || person.title}</h4>
            <div class="team-card-desc">
              ${person.role ? `<div class='team-role'>${person.role}</div>` : ''}
              ${person.email ? `<div class='team-email'><a href='mailto:${person.email}' onclick='event.stopPropagation();'>${person.email}</a></div>` : ''}
              ${isFormer ? `<div class='team-former'>Former</div>` : ''}
            </div>
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
