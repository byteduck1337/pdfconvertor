export const initPencilLines = () => {
  const cards = document.querySelectorAll('.training-card');

  cards.forEach((card) => {
    let canvas = card.querySelector('.pencil-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'pencil-canvas';
      card.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    let width = card.clientWidth;
    let height = card.clientHeight;
    canvas.width = width;
    canvas.height = height;

    let lines = [];
    let animationFrame = null;
    let isHovered = false;

    const createRandomLine = () => {
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      const points = [];
      let x = startX;
      let y = startY;
      const numPoints = 4 + Math.floor(Math.random() * 8);
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 20;

      for (let i = 0; i < numPoints; i++) {
        points.push({ x, y });
        x += Math.cos(angle) * speed + (Math.random() - 0.5) * 15;
        y += Math.sin(angle) * speed + (Math.random() - 0.5) * 15;
      }

      return {
        points,
        alpha: 0.6 + Math.random() * 0.4,
        fadeSpeed: 0.003 + Math.random() * 0.005,
        moveX: (Math.random() - 0.5) * 3,
        moveY: -1 - Math.random() * 3
      };
    };

    const draw = () => {
      if (!isHovered && lines.length === 0) return;

      ctx.clearRect(0, 0, width, height);
      let active = 0;

      lines.forEach((line) => {
        if (line.alpha > 0) {
          active++;
          line.alpha -= line.fadeSpeed;
          line.points.forEach((p) => {
            p.x += line.moveX;
            p.y += line.moveY;
          });

          ctx.beginPath();
          ctx.moveTo(line.points[0].x, line.points[0].y);
          for (let i = 1; i < line.points.length; i++) {
            ctx.lineTo(
              line.points[i].x + (Math.random() - 0.5) * 2,
              line.points[i].y + (Math.random() - 0.5) * 2
            );
          }
          ctx.strokeStyle = `rgba(0, 0, 0, ${line.alpha})`;
          ctx.lineWidth = 1 + Math.random() * 0.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      });

      if (active === 0) lines = [];
      else animationFrame = requestAnimationFrame(draw);
    };

    card.addEventListener('mouseenter', () => {
      isHovered = true;
      width = card.clientWidth;
      height = card.clientHeight;
      canvas.width = width;
      canvas.height = height;

      lines = [];
      const count = 20 + Math.floor(Math.random() * 15);
      for (let i = 0; i < count; i++) lines.push(createRandomLine());

      if (animationFrame) cancelAnimationFrame(animationFrame);
      draw();
    });

    card.addEventListener('mouseleave', () => {
      isHovered = false;
      ctx.clearRect(0, 0, width, height);
      lines = [];
      if (animationFrame) cancelAnimationFrame(animationFrame);
    });
  });
};