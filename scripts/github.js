const ORG = 'AAU-Underwater-Robot-Lab';
const API_URL = `https://api.github.com/orgs/${ORG}/repos?per_page=100`;

const FALLBACK_PATH = 'assets/repos_fallback.json';

async function fetchWithFallback(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('GitHub API error: ' + response.status);
    return await response.json();
  } catch (err) {
    console.warn('Primary fetch failed, loading fallback JSON:', err.message);
    const fallback = await fetch(FALLBACK_PATH);
    return await fallback.json();
  }
}

function createRepoRow(repo) {
  const row = document.createElement('tr');

  const nameTd = document.createElement('td');
  nameTd.textContent = repo.name;

  const descTd = document.createElement('td');
  descTd.textContent = repo.description || '';

  const cloneTd = document.createElement('td');
  const iconLink = document.createElement('a');
  iconLink.href = repo.html_url;
  iconLink.innerHTML = '🔗';
  iconLink.title = 'View on GitHub';
  iconLink.target = '_blank';
  cloneTd.appendChild(iconLink);

  //const dateTd = document.createElement('td');
  //dateTd.textContent = new Date(repo.updated_at)
  //  .toLocaleString('default', { dateStyle: 'short', timeStyle: 'short' });
  //dateTd.className = 'small';

  [nameTd, descTd, cloneTd].forEach(td => row.appendChild(td));
  return row;
}

async function loadRepos() {
  const repoSection = document.getElementById('repos');
  const originalTable = document.getElementById('repo-table');
  if (originalTable) originalTable.remove();

  try {
    const repos = await fetchWithFallback(API_URL);
    if (!Array.isArray(repos) || repos.length === 0) {
      repoSection.innerHTML += '<p>No repositories found.</p>';
      return;
    }

    // Step 1: Count topic frequencies
    const topicFreq = {};
    repos.forEach(repo => {
      (repo.topics || []).forEach(topic => {
        topicFreq[topic] = (topicFreq[topic] || 0) + 1;
      });
    });

    // Step 2: Sort topics in each repo by frequency (most common first)
    const groups = new Map();
    repos.forEach(repo => {
      const orderedTopics = (repo.topics || []).slice().sort((a, b) => {
        // Sort by frequency (desc), then alphabetically
        if (topicFreq[b] !== topicFreq[a]) return topicFreq[b] - topicFreq[a];
        return a.localeCompare(b);
      });
      const key = orderedTopics.join(', ') || 'Uncategorized';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(repo);
    });

    // Step 3: Sort group keys by the frequency of their first topic (most common first)
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      const aFirst = a.split(', ')[0] || '';
      const bFirst = b.split(', ')[0] || '';
      const freqA = topicFreq[aFirst] || 0;
      const freqB = topicFreq[bFirst] || 0;
      if (freqB !== freqA) return freqB - freqA;
      return a.localeCompare(b);
    });

    // Step 4: Render
    const table = document.createElement('table');
    table.classList.add('segmented-table');

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Description</th><th>Link</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    sortedKeys.forEach(topicKey => {
      const repoList = groups.get(topicKey);
      const headerRow = document.createElement('tr');
      const headerCell = document.createElement('td');
      headerCell.colSpan = 4;
      headerCell.textContent = topicKey || 'Uncategorized';
      headerCell.style.fontWeight = 'bold';
      headerCell.style.background = '#f0f0f0';
      headerRow.appendChild(headerCell);
      tbody.appendChild(headerRow);

      repoList.forEach(repo => {
        const row = createRepoRow(repo);
        tbody.appendChild(row);
      });
    });

    table.appendChild(tbody);
    repoSection.appendChild(table);

  } catch (err) {
    console.error(err);
    repoSection.innerHTML += '<p>Error loading: ' + err.message + '</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadRepos);