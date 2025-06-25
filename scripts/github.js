const ORG = 'AAU-Underwater-Robot-Lab';
const API_URL = `https://api.github.com/orgs/${ORG}/repos?per_page=100`;

async function loadRepos() {
  const tbody = document.querySelector('#repo-table tbody');
  tbody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';

  try {
    const resp = await fetch(API_URL, {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (!resp.ok) throw new Error(resp.status + ' ' + resp.statusText);
    const repos = await resp.json();

    if (!Array.isArray(repos) || repos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No repositories found.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    repos.forEach(r => {
      const row = document.createElement('tr');

      const name = document.createElement('a');
      name.href = r.html_url;
      name.textContent = r.name;
      name.target = '_blank';
      const nameTd = document.createElement('td');
      nameTd.appendChild(name);

      const descTd = document.createElement('td');
      descTd.textContent = r.description || '';

      const cloneTd = document.createElement('td');
      const cloneLink = document.createElement('a');
      cloneLink.href = r.clone_url;
      cloneLink.textContent = r.clone_url;
      cloneTd.appendChild(cloneLink);

      const dateTd = document.createElement('td');
      dateTd.textContent = new Date(r.updated_at)
        .toLocaleString('default', { dateStyle: 'short', timeStyle: 'short' });
      dateTd.className = 'small';

      [nameTd, descTd, cloneTd, dateTd].forEach(td => row.appendChild(td));
      tbody.appendChild(row);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Error loading: ${err.message}</td></tr>`;
    console.error(err);
  }
}

window.addEventListener('DOMContentLoaded', loadRepos);
