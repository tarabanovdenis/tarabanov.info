document.addEventListener('DOMContentLoaded', () => {

    const burgerContainer = document.querySelector('.burger-container');
    const body = document.body;

// eyes animation (begin)
    const eyePupil = document.querySelectorAll('.eye__pupil');
    const eyelid = document.querySelectorAll('.eye__lid');

    let lastX = 0;
    let lastY = 0;

    function randomWiggle() {
        // Occasionally move with personality
        const radius = 5;

        // Use "personalities": curious, bored, surprised
        const personality = Math.random();

        let x, y;

        if (personality < 0.3) {
            // Curious - quick dart
            x = Math.random() * radius * 2 - radius;
            y = Math.random() * radius * 2 - radius;
        } else if (personality < 0.6) {
            // Bored - tiny slow shift
            x = lastX + (Math.random() - 0.5) * 2;
            y = lastY + (Math.random() - 0.5) * 2;
        } else {
            // Surprised - quick to the top or sides
            x = (Math.random() > 0.5 ? 1 : -1) * radius;
            y = (Math.random() > 0.5 ? 1 : -1) * radius;
        }

        // Limit range
        x = Math.max(-radius, Math.min(radius, x));
        y = Math.max(-radius, Math.min(radius, y));

        lastX = x;
        lastY = y;

        // Move pupils
        eyePupil.forEach(element => {
            element.style.left = `${7 + x}px`;
            element.style.top = `${7 + y}px`;
        });


        // Next movement after a random delay
        const nextDelay = 1000 + Math.random() * 2000;
        setTimeout(randomWiggle, nextDelay);
    }

    function blinkEyes() {
        eyelid.forEach(element => {
            element.classList.add('blink');
        });
        setTimeout(() => {
            eyelid.forEach(element => {
                element.classList.remove('blink');
            });
        }, 250);
    }

    function randomBlink() {
        if (Math.random() > 0.4) blinkEyes();
        setTimeout(randomBlink, 2000 + Math.random() * 3000);
    }

    // Start personality wiggle and blinking
    randomWiggle();
    randomBlink();
// eyes animation (end)

// sticky burger (begin)
    const stickyOffset = 15;
    let initialAbsoluteTop;
    let scrollThreshold;

    if (burgerContainer) {
        initialAbsoluteTop = burgerContainer.getBoundingClientRect().top + window.pageYOffset;
        scrollThreshold = initialAbsoluteTop - stickyOffset;

        function handleScroll() {
            const currentScrollPos = window.pageYOffset || document.documentElement.scrollTop;

            if (currentScrollPos >= scrollThreshold) {
                if (!burgerContainer.classList.contains('is-stuck')) {
                    burgerContainer.classList.add('is-stuck');
                    body.classList.add('is-scrolled'); // Adding this class to body too
                }
            } else {
                if (burgerContainer.classList.contains('is-stuck')) {
                    burgerContainer.classList.remove('is-stuck');
                    body.classList.remove('is-scrolled'); // Removing this class from body
                }
            }
        }

        window.addEventListener('scroll', handleScroll);
        handleScroll();
    }
// sticky burger (end)

// burger open close (begin)
    if (burgerContainer) {
        burgerContainer.addEventListener('click', (event) => {
            event.stopPropagation();
            body.classList.toggle('burger-open');
        });
    }

    document.addEventListener('click', (event) => {
        if (body.classList.contains('burger-open')) {
            if (burgerContainer && !burgerContainer.contains(event.target)) {
                body.classList.remove('burger-open');
            }
        }
    });
// burger open close (end)

// Scroll-triggered section animations (begin)
    const sections = document.querySelectorAll('.page > div:not(.welcome)');
    const disappearingThresholdTop = 100;

    // Observer for when section enters from bottom
    const inViewObserverOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    };

    const inViewObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in-view');
            } else {
                entry.target.classList.remove('is-in-view');
            }
        });
    }, inViewObserverOptions);


    // Combined observer for 'is-disappearing-top' and 'is-out-of-view'
    const comprehensiveObserverOptions = {
        root: null,
        rootMargin: '0px 0px 0px 0px',
        threshold: [0, 0.01, 0.25, 0.5, 0.75, 0.99, 1]
    };

    const comprehensiveSectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const section = entry.target;
            const rect = entry.boundingClientRect;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

            // --- Logic for 'is-disappearing-top' ---
            if (rect.top <= disappearingThresholdTop && rect.bottom > 0) {
                section.classList.add('is-disappearing-top');
            } else {
                section.classList.remove('is-disappearing-top');
            }

            // --- Logic for 'is-out-of-view' (completely off-screen) ---
            if (!entry.isIntersecting && (rect.top > viewportHeight || rect.bottom < 0)) {
                section.classList.add('is-out-of-view');
            } else {
                section.classList.remove('is-out-of-view');
            }
        });
    }, comprehensiveObserverOptions);


    sections.forEach(section => {
        inViewObserver.observe(section);
        comprehensiveSectionObserver.observe(section);
    });
// Scroll-triggered section animations (end)

// Simple Parallax effect (begin)
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    const defaultExtraScrollSpeed = 0.1;

    const opacityFadeStartPx = 150;
    const opacityFadeEndPx = 0;

    function applyParallax() {
        const currentScrollPos = window.pageYOffset || document.documentElement.scrollTop;

        parallaxElements.forEach(element => {
            const dataParallax = element.dataset.parallax;
            let extraScrollSpeed = defaultExtraScrollSpeed;

            if (dataParallax) {
                const parsedSpeed = parseFloat(dataParallax);
                if (!isNaN(parsedSpeed)) {
                    extraScrollSpeed = parsedSpeed;
                } else {
                    console.warn(`Invalid data-parallax value '${dataParallax}' on element:`, element);
                }
            }

            const translateYAmount = -(currentScrollPos * extraScrollSpeed);
            element.style.transform = `translateY(${translateYAmount}px)`;

            const rect = element.getBoundingClientRect();
            const elementTopInViewport = rect.top;
            const elementHeight = element.offsetHeight;

            let opacity = 1;

            if (elementTopInViewport <= opacityFadeStartPx && rect.bottom > 0) {
                const fadeProgress = 1 - (((elementTopInViewport - opacityFadeEndPx + (elementHeight/2)) / (opacityFadeStartPx - opacityFadeEndPx)));
                opacity = 1 - fadeProgress;

                opacity = Math.max(0, Math.min(1, opacity));

            } else if (elementTopInViewport > opacityFadeStartPx) {
                opacity = 1;
            } else if (rect.bottom <= 0) {
                opacity = 0;
            }

            element.style.opacity = opacity.toString();
        });
    }

    let ticking = false;
    function updateParallax() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                applyParallax();
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', updateParallax);
    window.addEventListener('resize', updateParallax);

    setTimeout(applyParallax, 6000);
// Simple Parallax effect (end)

// scroll on very top (begin)
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    window.scrollTo(0, 0);
// scroll on very top (end)
});