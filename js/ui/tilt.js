export const initTilt = () => {
  const hoverOk = window.matchMedia('(hover: hover)').matches;
  if (!hoverOk) return;

  const cards = document.querySelectorAll('.training-card');

  cards.forEach((card) => {
    let glare = card.querySelector('.tilt-glare');
    if (!glare) {
      glare = document.createElement('div');
      glare.className = 'tilt-glare';
      card.appendChild(glare);
    }

    const handleMove = (e) => {
      const rect = card.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const mouseX = clientX - (rect.left + rect.width / 2);
      const mouseY = clientY - (rect.top + rect.height / 2);

      card.style.transform = `translateY(-4px) rotateX(${-(mouseY / 15)}deg) rotateY(${mouseX / 15}deg)`;
      glare.style.opacity = '1';

      const px = ((clientX - rect.left) / rect.width) * 100;
      const py = ((clientY - rect.top) / rect.height) * 100;
      const isHovered = card.matches(':hover');
      const color = isHovered ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';
      glare.style.background = `radial-gradient(circle at ${px}% ${py}%, ${color}, transparent 60%)`;
    };

    const reset = () => {
      card.style.transform = 'translateY(0) rotateX(0deg) rotateY(0deg)';
      glare.style.opacity = '0';
    };

    card.addEventListener('mousemove', handleMove);
    card.addEventListener('mouseleave', reset);
  });
};