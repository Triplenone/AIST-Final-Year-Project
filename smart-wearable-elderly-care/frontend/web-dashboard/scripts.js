(function () {
  const navLinks = document.querySelectorAll('.nav-list a');

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
    { threshold: 0.2 }
  );

  document.querySelectorAll('section.panel').forEach(section => {
    observer.observe(section);
  });

  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
