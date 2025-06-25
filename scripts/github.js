const ORG = 'AAU-Underwater-Robot-Lab';
const API_URL = `https://api.github.com/orgs/${ORG}/repos?per_page=100`;

function createRepoRow(repo) {
  const row = document.createElement('tr');

  const nameTd = document.createElement('td');
  nameTd.textContent = repo.name;

  const descTd = document.createElement('td');
  const tags = (repo.topics || []).join(', ');
  descTd.textContent = (repo.description || '') + (tags ? ` [${tags}]` : '');

  const cloneTd = document.createElement('td');
  const iconLink = document.createElement('a');
  iconLink.href = repo.html_url;
  iconLink.innerHTML = '🔗';
  iconLink.title = 'View on GitHub';
  iconLink.target = '_blank';
  cloneTd.appendChild(iconLink);

  const dateTd = document.createElement('td');
  dateTd.textContent = new Date(repo.updated_at)
    .toLocaleString('default', { dateStyle: 'short', timeStyle: 'short' });
  dateTd.className = 'small';

  [nameTd, descTd, cloneTd, dateTd].forEach(td => row.appendChild(td));
  return row;
}

async function loadRepos() {
  const repoSection = document.getElementById('repos');
  const originalTable = document.getElementById('repo-table');
  if (originalTable) originalTable.remove();

  try {
    const resp = await fetch(API_URL, {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (!resp.ok) throw new Error(resp.status + ' ' + resp.statusText);
    const repos = await resp.json();

    if (!Array.isArray(repos) || repos.length === 0) {
      repoSection.innerHTML += '<p>No repositories found.</p>';
      return;
    }

    const groups = new Map();

    repos.forEach(repo => {
      const key = (repo.topics || []).join(', ') || 'Uncategorized';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(repo);
    });

    groups.forEach((repoList, topicKey) => {
      const topicTitle = document.createElement('h3');
      topicTitle.textContent = topicKey || 'Uncategorized';
      repoSection.appendChild(topicTitle);

      const table = document.createElement('table');
      table.classList.add('segmented-table');

      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Name</th><th>Description</th><th>Link</th><th>Last Updated</th></tr>';
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      repoList.forEach(repo => tbody.appendChild(createRepoRow(repo)));
      table.appendChild(tbody);

      repoSection.appendChild(table);
    });

  } catch (err) {
    console.error(err);
    repoSection.innerHTML += '<p>Error loading: ' + err.message + '</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadRepos);