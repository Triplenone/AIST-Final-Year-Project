(function () {
  const navLinks = document.querySelectorAll('.nav-list a');
  const sections = document.querySelectorAll('section.panel');
  const themeToggle = document.querySelector('#theme-toggle');
  const themeLabel = themeToggle?.querySelector('.chip__label');
  const themeIcon = themeToggle?.querySelector('.chip__icon');
  const searchInput = document.querySelector('#resident-search');
  const tableRows = Array.from(
    document.querySelectorAll('.resident-table .table-row[data-name]')
  );
  const emptyState = document.querySelector('[data-empty-state]');
  const lastSync = document.querySelector('[data-last-sync]');
  const refreshButton = document.querySelector('[data-refresh]');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const id = entry.target.getAttribute('id');
        const link = document.querySelector(`.nav-list a[href="#${id}"]`);
        if (entry.isIntersecting) {
          link?.classList.add('active');
        } else {
          link?.classList.remove('active');
        }
      });
    },
    { threshold: 0.3 }
  );

  sections.forEach(section => observer.observe(section));

  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const storedTheme = localStorage.getItem('dashboard-theme');
  const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);

  themeToggle?.addEventListener('click', () => {
    const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
  });

  function applyTheme(theme) {
    document.body.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    if (themeLabel) {
      themeLabel.textContent = theme === 'dark' ? 'Dark' : 'Light';
    }
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '🌙' : '🌞';
    }
  }

  searchInput?.addEventListener('input', event => {
    const value = event.target.value.toLowerCase().trim();
    let visibleCount = 0;

    tableRows.forEach(row => {
      const nameMatch = row.dataset.name?.includes(value) ?? false;
      const contentMatch = row.textContent?.toLowerCase().includes(value) ?? false;
      const matches = value.length === 0 ? true : nameMatch || contentMatch;
      row.hidden = value.length > 0 ? !matches : false;
      if (!row.hidden) {
        visibleCount += 1;
      }
    });

    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  });

  refreshButton?.addEventListener('click', () => {
    animateRefresh();
    updateLastSync();
  });

  function updateLastSync() {
    if (!lastSync) return;
    const timestamp = new Date();
    lastSync.textContent = timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function animateRefresh() {
    refreshButton?.classList.add('is-refreshing');
    setTimeout(() => refreshButton?.classList.remove('is-refreshing'), 600);
  }

  updateLastSync();
})();
