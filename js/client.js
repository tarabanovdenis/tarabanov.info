document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrambleTextPlugin, ScrollTrigger, ScrollSmoother);

    const body = document.body;
    const header = document.querySelector('.header');
    const nav = document.querySelector('.nav');
    const burger = document.querySelector('.burger-container');
    const burgerLabel = document.querySelector('.burger__label');
    const smoothContent = document.getElementById('smooth-content');
    const yearNode = document.getElementById('year');
    const mm = gsap.matchMedia();
    const preloader = document.querySelector('.preloader');
    const blind = document.querySelector('.blind');
    const preloaderContainer = preloader ? preloader.querySelector('.preloader__container') : null;
    const preloaderStatus = preloader ? preloader.querySelector('.preloader__status') : null;
    const preloaderItems = preloader ? Array.from(preloader.querySelectorAll('.preloader__item')) : [];
    const oddPreloaderItems = preloaderItems.filter((_, index) => index % 2 === 0);
    const evenPreloaderItems = preloaderItems.filter((_, index) => index % 2 === 1);

    const NAV_CLOSE_SCROLL_DELAY = 320;
    const HASH_CORRECTION_DELAY = 1.35;
    const QR_DOWNLOAD_SIZE = 1500;
    const initialHash = normalizeHash(window.location.hash);
    const PRELOADER_EASE = 'expo.inOut';
    const PRELOADER_ROW_LEG1 = 2;
    const PRELOADER_ROW_LEG2 = 2.5;
    const PRELOADER_ROW_STAGGER = 0.08;
    const PRELOADER_EXIT_RATIO = 120 / 220;
    const PRELOADER_STORAGE_KEY = 'dt_preloader_shown';

    let smoother = null;
    let hashCorrectionCall = null;
    let pendingNavigationTimeout = null;
    let preloaderTimeline = null;

    const hasSeenPreloader = (() => {
        try {
            return sessionStorage.getItem(PRELOADER_STORAGE_KEY) === '1';
        } catch (error) {
            return false;
        }
    })();

    const markPreloaderSeen = () => {
        try {
            sessionStorage.setItem(PRELOADER_STORAGE_KEY, '1');
        } catch (error) {
            // Ignore storage errors (private mode, disabled storage, etc).
        }
    };

    const hidePreloaderInstant = () => {
        if (preloader) {
            gsap.set(preloader, { autoAlpha: 0, scale: 1, display: 'none' });
            preloader.setAttribute('aria-busy', 'false');
        }

        if (blind) {
            gsap.set(blind, { autoAlpha: 0, display: 'none' });
        }
    };

    const resetPreloader = () => {
        if (!preloader) {
            return;
        }

        gsap.set(preloader, { display: 'flex', autoAlpha: 1, scale: 1 });

        if (preloaderStatus) {
            gsap.set(preloaderStatus, { autoAlpha: 1 });
        }

        if (preloaderContainer) {
            gsap.set(preloaderContainer, { autoAlpha: 0, scale: 1, rotation: 0 });
        }

        if (preloaderItems.length) {
            gsap.set(preloaderItems, { opacity: 0, x: '0%' });
        }
    };

    const startPreloader = () => {
        if (!preloader) {
            return;
        }

        if (!preloaderContainer || !preloaderItems.length) {
            stopPreloader();
            return;
        }

        resetPreloader();

        if (preloaderTimeline) {
            preloaderTimeline.kill();
            preloaderTimeline = null;
        }

        if (preloaderStatus) {
            gsap.to(preloaderStatus, {
                autoAlpha: 0,
                duration: 0.25,
                ease: PRELOADER_EASE
            });
        }

        gsap.to(preloaderContainer, {
            autoAlpha: 1,
            duration: 0.25,
            ease: PRELOADER_EASE
        });

        preloaderTimeline = gsap.timeline({
            defaults: { ease: PRELOADER_EASE }
        });

        preloaderTimeline.to(
            preloaderContainer,
            {
                duration: 2.4,
                scale: 2.7,
                rotation: -90
            },
            0
        );

        preloaderTimeline.to(
            preloaderItems,
            {
                opacity: 1,
                duration: 0.8,
                stagger: 0.05
            },
            0
        );

        preloaderTimeline.to(
            oddPreloaderItems,
            {
                keyframes: [
                    { x: '20%', duration: PRELOADER_ROW_LEG1 },
                    { x: '-200%', duration: PRELOADER_ROW_LEG2 }
                ],
                stagger: PRELOADER_ROW_STAGGER
            },
            0
        );

        preloaderTimeline.to(
            evenPreloaderItems,
            {
                keyframes: [
                    { x: '-20%', duration: PRELOADER_ROW_LEG1 },
                    { x: '200%', duration: PRELOADER_ROW_LEG2 }
                ],
                stagger: PRELOADER_ROW_STAGGER
            },
            0
        );

        const rowsCount = Math.max(oddPreloaderItems.length, evenPreloaderItems.length);
        const staggerTail = PRELOADER_ROW_STAGGER * Math.max(0, rowsCount - 1);
        const visibleEnd = PRELOADER_ROW_LEG1 + (PRELOADER_ROW_LEG2 * PRELOADER_EXIT_RATIO) + staggerTail;
        const blindFadeStart = Math.max(0, visibleEnd - 1.4);
        const preloaderFadeStart = Math.max(0, visibleEnd - 0.8);

        preloaderTimeline.add(fadeOutBlind, blindFadeStart);
        preloaderTimeline.add(fadeOutPreloader, preloaderFadeStart);
        preloaderTimeline.eventCallback('onComplete', () => {
            preloaderTimeline = null;
        });
    };

    const fadeOutPreloader = () => {
        if (!preloader) {
            return;
        }

        gsap.to(preloader, {
            autoAlpha: 0,
            scale: 0.98,
            duration: 0.8,
            delay: 0.4,
            ease: PRELOADER_EASE,
            onComplete: () => {
                preloader.style.display = 'none';
            }
        });
    };

    const fadeOutBlind = () => {
        if (!blind) {
            return;
        }

        gsap.fromTo(blind,
            { opacity: 1 },
            {
                opacity: 0,
                duration: 0.4,
                delay: 1,
                ease: PRELOADER_EASE,
                onComplete: () => {
                    blind.style.display = 'none';
                }
            }
        );
    };

    const stopPreloader = () => {
        if (!preloader) {
            return;
        }

        if (preloaderTimeline) {
            preloaderTimeline.kill();
            preloaderTimeline = null;
        }

        fadeOutPreloader();
        fadeOutBlind();
    };

    if (initialHash) {
        window.scrollTo(0, 0);
    }

    if (preloader) {
        if (hasSeenPreloader) {
            hidePreloaderInstant();
        } else {
            resetPreloader();

            window.addEventListener('load', () => {
                startPreloader();
                markPreloaderSeen();
            }, { once: true });
        }
    } else {
        window.addEventListener('load', () => {
            markPreloaderSeen();
        }, { once: true });
    }

    const burgerTimeline = gsap.timeline({
        paused: true,
        defaults: { duration: 0.3, ease: 'expo.inOut' }
    });

    burgerTimeline
        .to('.burger__icon_top', { y: 3 }, 0)
        .to('.burger__icon_bottom', { y: -3 }, 0)
        .to('.burger__icon_top', { rotate: 135 }, 0.2)
        .to('.burger__icon_bottom', { rotate: 225 }, 0.2);

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const useSmoother = !isTouchDevice();

    const syncBurgerLabel = (text) => {
        if (!burgerLabel) {
            return;
        }

        gsap.to(burgerLabel, {
            duration: 0.4,
            scrambleText: {
                text,
                chars: 'upperCase',
                speed: 0.3
            }
        });
    };

    const setNavState = (isOpen) => {
        body.classList.toggle('nav_open', isOpen);

        if (isOpen) {
            burgerTimeline.play();
        } else {
            burgerTimeline.reverse();
        }

        syncBurgerLabel(isOpen ? 'close' : 'menu');
    };

    const closeNav = () => setNavState(false);
    const toggleNav = () => setNavState(!body.classList.contains('nav_open'));

    const normalizePathname = (pathname) => {
        let normalized = pathname || '/';

        if (!normalized.startsWith('/')) {
            normalized = `/${normalized}`;
        }

        normalized = normalized.replace(/\/index\.html?$/i, '/');
        normalized = normalized.replace(/\/works\.html$/i, '/works');
        normalized = normalized.replace(/\/+$/, '');

        return normalized || '/';
    };

    function normalizeHash(hashValue) {
        const rawHash = (hashValue || '').replace(/^#/, '').trim();

        if (!rawHash) {
            return '';
        }

        try {
            return decodeURIComponent(rawHash);
        } catch (error) {
            return rawHash;
        }
    }

    const getHashTarget = (hashValue) => {
        const id = normalizeHash(hashValue);
        return id ? document.getElementById(id) : null;
    };

    if (useSmoother) {
        smoother = ScrollSmoother.create({
            smooth: 1.2,
            effects: true,
            normalizeScroll: true
        });

        if (initialHash) {
            smoother.scrollTop(0);
        }
    } else {
        const speedElems = gsap.utils.toArray('[data-speed]');

        speedElems.forEach((el) => {
            const speedAttr = parseFloat(el.getAttribute('data-speed')) || 1;
            const movement = (1 - speedAttr) * 40;

            gsap.fromTo(el,
                { yPercent: -movement },
                {
                    yPercent: movement,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    }
                }
            );
        });
    }

    const getCurrentScrollTop = () => {
        if (smoother) {
            return smoother.scrollTop();
        }

        return window.pageYOffset || document.documentElement.scrollTop || 0;
    };

    const setScrollTop = (value, smooth = false) => {
        const nextValue = Math.max(0, Math.round(value));

        if (smoother) {
            if (smooth) {
                smoother.scrollTo(nextValue, true);
            } else {
                smoother.scrollTop(nextValue);
            }
            return;
        }

        window.scrollTo({
            top: nextValue,
            behavior: smooth ? 'smooth' : 'auto'
        });
    };

    const getAnchorOffset = () => {
        const headerHeight = header ? header.offsetHeight : 0;
        const breathingRoom = window.innerWidth <= 830 ? 10 : 18;

        return headerHeight + breathingRoom;
    };

    const syncAnchorOffset = () => {
        document.documentElement.style.setProperty('--anchor-offset', `${getAnchorOffset()}px`);
    };

    const refreshSmoothLayout = () => {
        syncAnchorOffset();

        if (smoother) {
            smoother.refresh();
        }

        ScrollTrigger.refresh();
    };

    const delayedRefresh = gsap.delayedCall(0.2, refreshSmoothLayout).pause();
    const queueRefresh = () => delayedRefresh.restart(true);

    const getTargetScrollTop = (target) => {
        const currentScrollTop = getCurrentScrollTop();
        return target.getBoundingClientRect().top + currentScrollTop - getAnchorOffset();
    };

    const updateHistoryHash = (hashValue, mode = 'push') => {
        const id = normalizeHash(hashValue);

        if (!id || !window.history || !window.history.pushState) {
            return;
        }

        if (window.location.hash === `#${id}`) {
            return;
        }

        const nextUrl = new URL(window.location.href);
        nextUrl.hash = id;

        window.history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', nextUrl);
    };

    const scheduleHashCorrection = (target) => {
        if (hashCorrectionCall) {
            hashCorrectionCall.kill();
        }

        hashCorrectionCall = gsap.delayedCall(HASH_CORRECTION_DELAY, () => {
            const correctedTop = getTargetScrollTop(target);

            if (Math.abs(getCurrentScrollTop() - correctedTop) > 2) {
                setScrollTop(correctedTop, false);
            }

            ScrollTrigger.update();
            refreshSmoothLayout();
        });
    };

    const navigateToHash = (hashValue, { smooth = true, historyMode = 'push' } = {}) => {
        const target = getHashTarget(hashValue);

        if (!target) {
            return false;
        }

        refreshSmoothLayout();
        setScrollTop(getTargetScrollTop(target), smooth);
        ScrollTrigger.update();

        if (historyMode !== 'none') {
            updateHistoryHash(hashValue, historyMode);
        }

        scheduleHashCorrection(target);

        return true;
    };

    const navigateAfterNavClose = (hashValue, options = {}) => {
        if (pendingNavigationTimeout) {
            window.clearTimeout(pendingNavigationTimeout);
            pendingNavigationTimeout = null;
        }

        const runNavigation = () => {
            pendingNavigationTimeout = null;
            navigateToHash(hashValue, options);
        };

        if (body.classList.contains('nav_open')) {
            closeNav();
            pendingNavigationTimeout = window.setTimeout(runNavigation, NAV_CLOSE_SCROLL_DELAY);
            return;
        }

        runNavigation();
    };

    syncAnchorOffset();

    if (yearNode) {
        yearNode.textContent = new Date().getFullYear();
    }

    const qrContainers = document.querySelectorAll('.qr-container');
    qrContainers.forEach((container) => {
        const modeInputs = container.querySelectorAll('input[name="qr-mode"]');
        const modePanels = container.querySelectorAll('[data-qr-mode-panel]');
        const textInput = container.querySelector('[name="qr-text-value"]');
        const vCardInputs = container.querySelectorAll('[name^="qr-vcard-"]');
        const output = container.querySelector('[data-qr-output]');
        const status = container.querySelector('[data-qr-status]');
        const downloadLink = container.querySelector('[data-qr-download]');

        let qrRenderTimer = null;
        let qrResizeTimer = null;
        let lastRenderedPayload = null;

        if (!modeInputs.length || !modePanels.length || !output || !status) {
            return;
        }

        const setStatus = (message) => {
            status.textContent = message;
        };

        const clearDownload = () => {
            if (!downloadLink) {
                return;
            }

            downloadLink.hidden = true;
            downloadLink.removeAttribute('download');
        };

        const showDownload = (filename) => {
            if (!downloadLink) {
                return;
            }

            downloadLink.hidden = false;
            downloadLink.href = '#';
            downloadLink.download = filename;
        };

        const setPlaceholder = (message) => {
            output.replaceChildren();

            const placeholder = document.createElement('div');
            placeholder.className = 'qr-preview__placeholder';
            placeholder.textContent = message;
            output.appendChild(placeholder);
        };

        const clearQr = (message) => {
            lastRenderedPayload = null;
            clearDownload();
            setPlaceholder(message);
            setStatus(message);
            queueRefresh();
        };

        const getQrSize = () => {
            const fallbackSize = window.innerWidth <= 830 ? 300 : 380;
            const availableWidth = output.clientWidth ? output.clientWidth - 40 : fallbackSize;

            return Math.max(220, Math.min(availableWidth, fallbackSize));
        };

        const createHighResPngDataUrl = (payload) => new Promise((resolve, reject) => {
            if (!window.QRCode) {
                reject(new Error('QR generator library failed to load.'));
                return;
            }

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'fixed';
            tempContainer.style.left = '-99999px';
            tempContainer.style.top = '0';
            tempContainer.style.width = `${QR_DOWNLOAD_SIZE}px`;
            tempContainer.style.height = `${QR_DOWNLOAD_SIZE}px`;
            tempContainer.style.pointerEvents = 'none';
            tempContainer.style.opacity = '0';
            document.body.appendChild(tempContainer);

            const cleanup = () => {
                tempContainer.remove();
            };

            const resolveFromCanvas = (canvas) => {
                try {
                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    reject(error);
                } finally {
                    cleanup();
                }
            };

            const resolveFromImage = (image) => {
                try {
                    const exportCanvas = document.createElement('canvas');
                    const context = exportCanvas.getContext('2d');

                    exportCanvas.width = QR_DOWNLOAD_SIZE;
                    exportCanvas.height = QR_DOWNLOAD_SIZE;

                    if (!context) {
                        throw new Error('Could not create export canvas.');
                    }

                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, QR_DOWNLOAD_SIZE, QR_DOWNLOAD_SIZE);
                    context.drawImage(image, 0, 0, QR_DOWNLOAD_SIZE, QR_DOWNLOAD_SIZE);

                    resolve(exportCanvas.toDataURL('image/png'));
                } catch (error) {
                    reject(error);
                } finally {
                    cleanup();
                }
            };

            try {
                new QRCode(tempContainer, {
                    text: payload,
                    width: QR_DOWNLOAD_SIZE,
                    height: QR_DOWNLOAD_SIZE,
                    colorDark: '#050505',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.Q
                });
            } catch (error) {
                cleanup();
                reject(error);
                return;
            }

            requestAnimationFrame(() => {
                const canvas = tempContainer.querySelector('canvas');
                const image = tempContainer.querySelector('img');

                if (canvas) {
                    resolveFromCanvas(canvas);
                    return;
                }

                if (image) {
                    if (image.complete) {
                        resolveFromImage(image);
                    } else {
                        image.addEventListener('load', () => resolveFromImage(image), { once: true });
                        image.addEventListener('error', () => {
                            cleanup();
                            reject(new Error('Could not render QR image.'));
                        }, { once: true });
                    }
                    return;
                }

                cleanup();
                reject(new Error('Could not build QR export.'));
            });
        });

        const renderQr = ({ payload, successMessage, filename }) => {
            if (!window.QRCode) {
                clearQr('QR generator library failed to load.');
                return;
            }

            try {
                output.replaceChildren();

                new QRCode(output, {
                    text: payload,
                    width: getQrSize(),
                    height: getQrSize(),
                    colorDark: '#050505',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.Q
                });

                lastRenderedPayload = { payload, successMessage, filename };
                setStatus(successMessage);
                showDownload(filename);
                queueRefresh();
            } catch (error) {
                clearQr('Could not generate this QR code. Try shorter content.');
            }
        };

        const escapeVCardValue = (value) => value
            .replace(/\\/g, '\\\\')
            .replace(/\r?\n/g, '\\n')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,');

        const buildVCardPayload = () => {
            const values = {};

            vCardInputs.forEach((input) => {
                values[input.name] = input.value.trim();
            });

            const hasValue = Object.values(values).some(Boolean);

            if (!hasValue) {
                return null;
            }

            const firstName = values['qr-vcard-first-name'] || '';
            const lastName = values['qr-vcard-last-name'] || '';
            const company = values['qr-vcard-company'] || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const fallbackName = fullName || company || values['qr-vcard-email'] || values['qr-vcard-phone'] || 'Contact';

            const payload = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`,
                `FN:${escapeVCardValue(fallbackName)}`
            ];

            if (company) {
                payload.push(`ORG:${escapeVCardValue(company)}`);
            }

            if (values['qr-vcard-title']) {
                payload.push(`TITLE:${escapeVCardValue(values['qr-vcard-title'])}`);
            }

            if (values['qr-vcard-phone']) {
                payload.push(`TEL;TYPE=CELL:${escapeVCardValue(values['qr-vcard-phone'])}`);
            }

            if (values['qr-vcard-email']) {
                payload.push(`EMAIL:${escapeVCardValue(values['qr-vcard-email'])}`);
            }

            if (values['qr-vcard-website']) {
                payload.push(`URL:${escapeVCardValue(values['qr-vcard-website'])}`);
            }

            if (values['qr-vcard-address']) {
                payload.push(`ADR:;;${escapeVCardValue(values['qr-vcard-address'])};;;;`);
            }

            if (values['qr-vcard-note']) {
                payload.push(`NOTE:${escapeVCardValue(values['qr-vcard-note'])}`);
            }

            payload.push('END:VCARD');

            const safeFilenameRoot = fallbackName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'contact';

            return {
                payload: payload.join('\r\n'),
                successMessage: `vCard QR ready for ${fallbackName}.`,
                filename: `${safeFilenameRoot}-vcard-qr.png`
            };
        };

        const buildTextPayload = () => {
            if (!textInput) {
                return null;
            }

            const value = textInput.value.trim();

            if (!value) {
                return null;
            }

            return {
                payload: value,
                successMessage: 'QR ready for your text or link.',
                filename: 'text-qr.png'
            };
        };

        const renderActiveMode = () => {
            const activeMode = container.getAttribute('data-qr-mode') || 'text';
            const content = activeMode === 'vcard' ? buildVCardPayload() : buildTextPayload();

            if (!content) {
                clearQr(
                    activeMode === 'vcard'
                        ? 'Fill at least one vCard field to generate the contact QR.'
                        : 'Type text or a URL and press Enter to generate the QR code.'
                );
                return;
            }

            renderQr(content);
        };

        const scheduleRender = (delay = 220) => {
            if (qrRenderTimer) {
                window.clearTimeout(qrRenderTimer);
            }

            qrRenderTimer = window.setTimeout(() => {
                qrRenderTimer = null;
                renderActiveMode();
            }, delay);
        };

        const syncQrMode = (mode) => {
            container.setAttribute('data-qr-mode', mode);

            modePanels.forEach((panel) => {
                panel.hidden = panel.getAttribute('data-qr-mode-panel') !== mode;
            });

            renderActiveMode();
            queueRefresh();
        };

        modeInputs.forEach((input) => {
            input.addEventListener('change', () => {
                if (input.checked) {
                    syncQrMode(input.value);
                }
            });
        });

        if (textInput) {
            textInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    renderActiveMode();
                }
            });

            textInput.addEventListener('input', () => {
                if ((container.getAttribute('data-qr-mode') || 'text') === 'text') {
                    scheduleRender(260);
                }
            });

            textInput.addEventListener('blur', () => {
                if ((container.getAttribute('data-qr-mode') || 'text') === 'text') {
                    renderActiveMode();
                }
            });
        }

        vCardInputs.forEach((input) => {
            input.addEventListener('input', () => {
                if ((container.getAttribute('data-qr-mode') || 'text') === 'vcard') {
                    scheduleRender(220);
                }
            });

            input.addEventListener('change', () => {
                if ((container.getAttribute('data-qr-mode') || 'text') === 'vcard') {
                    renderActiveMode();
                }
            });
        });

        if (downloadLink) {
            downloadLink.addEventListener('click', async (event) => {
                event.preventDefault();

                if (!lastRenderedPayload) {
                    return;
                }

                const previousStatus = status.textContent;
                setStatus(`Preparing ${QR_DOWNLOAD_SIZE}×${QR_DOWNLOAD_SIZE} PNG...`);

                try {
                    const dataUrl = await createHighResPngDataUrl(lastRenderedPayload.payload);
                    const tempLink = document.createElement('a');

                    tempLink.href = dataUrl;
                    tempLink.download = lastRenderedPayload.filename;
                    document.body.appendChild(tempLink);
                    tempLink.click();
                    tempLink.remove();

                    setStatus(`${previousStatus} Downloaded PNG is ${QR_DOWNLOAD_SIZE}×${QR_DOWNLOAD_SIZE}.`);
                } catch (error) {
                    setStatus('Could not prepare the PNG download.');
                }
            });
        }

        window.addEventListener('resize', () => {
            if (qrResizeTimer) {
                window.clearTimeout(qrResizeTimer);
            }

            qrResizeTimer = window.setTimeout(() => {
                qrResizeTimer = null;

                if (lastRenderedPayload) {
                    renderQr(lastRenderedPayload);
                }
            }, 120);
        });

        const initialMode = [...modeInputs].find((input) => input.checked) || modeInputs[0];
        syncQrMode(initialMode.value);
    });

    window.addEventListener('load', queueRefresh, { once: true });
    window.addEventListener('resize', queueRefresh);
    window.addEventListener('orientationchange', queueRefresh);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(queueRefresh).catch(() => {});
    }

    if (smoothContent) {
        smoothContent.querySelectorAll('img').forEach((img) => {
            if (!img.complete) {
                img.addEventListener('load', queueRefresh, { once: true });
            }
        });

        smoothContent.querySelectorAll('video').forEach((video) => {
            if (video.readyState < 1) {
                video.addEventListener('loadedmetadata', queueRefresh, { once: true });
            }
        });
    }

    document.addEventListener('click', (event) => {
        const clickedBurger = burger && burger.contains(event.target);

        if (clickedBurger) {
            event.preventDefault();
            toggleNav();
            return;
        }

        const link = event.target.closest('a[href]');

        if (!link) {
            if (body.classList.contains('nav_open') && !(nav && nav.contains(event.target))) {
                closeNav();
            }
            return;
        }

        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const url = new URL(link.getAttribute('href'), window.location.href);
        const targetHash = normalizeHash(url.hash);
        const samePageHash = Boolean(targetHash) &&
            normalizePathname(url.pathname) === normalizePathname(window.location.pathname);

        if (samePageHash && getHashTarget(targetHash)) {
            event.preventDefault();
            navigateAfterNavClose(targetHash, { smooth: true, historyMode: 'push' });
            return;
        }

        if (body.classList.contains('nav_open') && nav && nav.contains(link)) {
            closeNav();
        }
    });

    window.addEventListener('hashchange', () => {
        const targetHash = normalizeHash(window.location.hash);

        if (targetHash && getHashTarget(targetHash)) {
            navigateToHash(targetHash, { smooth: false, historyMode: 'none' });
        }
    });

    if (initialHash && getHashTarget(initialHash)) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                navigateToHash(initialHash, { smooth: true, historyMode: 'replace' });
            });
        });

        window.addEventListener('load', () => {
            navigateToHash(initialHash, { smooth: false, historyMode: 'replace' });
        }, { once: true });
    }

    const circles = document.querySelectorAll('.mesh-circle');

    circles.forEach((circle, index) => {
        const duration = 3 + (index * 0.8);

        gsap.to(circle, {
            attr: { cx: '+=15%' },
            duration,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });

        gsap.to(circle, {
            attr: { cy: '+=25%' },
            duration: duration * 1.2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });

        gsap.to(circle, {
            attr: { r: '-=10%' },
            opacity: 0.4,
            duration: duration * 0.7,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut'
        });
    });

    const inlineInfoSection = document.querySelector('.inline-info');
    const scrollingLine = inlineInfoSection ? inlineInfoSection.querySelector('.inline-info__line') : null;

    if (inlineInfoSection && scrollingLine) {
        const getScrollAmount = () => -(scrollingLine.offsetWidth - window.innerWidth);

        const inlineInfoTrigger = {
            trigger: inlineInfoSection,
            start: 'top top',
            end: () => `+=${scrollingLine.offsetWidth}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
        };

        gsap.to(scrollingLine, {
            x: () => getScrollAmount(),
            ease: 'none',
            scrollTrigger: inlineInfoTrigger
        });

        const tarabanovEl = inlineInfoSection.querySelector('.tarabanov-denys');
        const { pin, ...triggerWithoutPin } = inlineInfoTrigger;

        if (tarabanovEl) {
            const tarabanovTl = gsap.timeline({
                scrollTrigger: {
                    ...triggerWithoutPin,
                    scrub: 1.2,
                }
            });

            tarabanovTl.fromTo(tarabanovEl,
                { opacity: 0, scale: 0.92, filter: 'blur(8px)' },
                {
                    opacity: 1,
                    scale: 1,
                    filter: 'blur(0px)',
                    ease: 'power2.out',
                    duration: 0.12,
                }
            );

            tarabanovTl.to(tarabanovEl, {
                opacity: 1,
                filter: 'blur(0px)',
                duration: 0.58,
                ease: 'none'
            });

            tarabanovTl.to(tarabanovEl, {
                opacity: 0,
                filter: 'blur(12px)',
                duration: 0.3,
                ease: 'power2.in'
            });
        }

        const icons = inlineInfoSection.querySelectorAll('.inline-info__icon');
        const iconCount = icons.length;

        if (iconCount) {
            const iconIndices = Array.from({ length: iconCount }, (_, index) => index);

            for (let index = iconIndices.length - 1; index > 0; index -= 1) {
                const randomIndex = Math.floor(Math.random() * (index + 1));
                [iconIndices[index], iconIndices[randomIndex]] = [iconIndices[randomIndex], iconIndices[index]];
            }

            const iconSpacing = 85 / (iconCount - 1 || 1);
            const baseX = 7.5;

            icons.forEach((icon, index) => {
                const shuffledPosition = iconIndices[index];
                const xPosition = baseX + (shuffledPosition * iconSpacing);
                const randomOffset = (Math.random() - 0.5) * 3;
                const finalX = xPosition + randomOffset;

                gsap.set(icon, {
                    left: `${finalX}%`,
                    bottom: '8%',
                    xPercent: -50,
                    y: 0,
                    scale: 0.6,
                    opacity: 0,
                    zIndex: 1,
                    rotation: (Math.random() - 0.5) * 15,
                });
            });

            const iconTl = gsap.timeline({
                scrollTrigger: {
                    trigger: inlineInfoSection,
                    start: 'top top',
                    end: () => `+=${scrollingLine.offsetWidth}`,
                    scrub: 1.5,
                    invalidateOnRefresh: true,
                }
            });

            icons.forEach((icon, index) => {
                const shuffledIndex = iconIndices.indexOf(index);
                const start = (shuffledIndex / iconCount) * 0.7;
                const flyDuration = 0.25;
                const fadeDuration = 0.18;
                const horizontalDrift = (Math.random() - 0.5) * 20;
                const getUpwardDistance = () => -window.innerHeight * 0.75;

                iconTl.fromTo(icon,
                    {
                        opacity: 0,
                        scale: 0.5,
                        y: 0,
                        x: 0,
                        zIndex: 1,
                    },
                    {
                        opacity: 1,
                        scale: 0.7,
                        y: () => getUpwardDistance(),
                        x: horizontalDrift,
                        zIndex: 2,
                        duration: flyDuration,
                        ease: 'power2.out'
                    },
                    start
                );

                iconTl.to(icon,
                    {
                        opacity: 0,
                        scale: 0.5,
                        y: () => getUpwardDistance() - 40,
                        x: horizontalDrift * 1.2,
                        duration: fadeDuration,
                        ease: 'power2.in'
                    },
                    start + flyDuration
                );
            });
        }
    }

    const about = document.querySelector('.about');
    const pic = about ? about.querySelector('.pic') : null;

    if (about && pic) {
        mm.add('(min-width: 831px)', () => {
            ScrollTrigger.create({
                trigger: pic,
                pin: true,
                start: 'top 15%',
                end: () => `+=${about.offsetHeight - pic.offsetHeight}`,
                pinSpacing: false,
                invalidateOnRefresh: true,
            });
        });
    }

    const blurTargets = document.querySelectorAll('.from-blur');

    blurTargets.forEach((target) => {
        gsap.fromTo(target,
            {
                filter: 'blur(20px)',
                opacity: 0,
                y: 20
            },
            {
                filter: 'blur(0px)',
                opacity: 1,
                y: 0,
                duration: 1.2,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: target,
                    start: 'top 90%',
                    toggleActions: 'play none none reverse',
                }
            }
        );
    });

    const worksItems = gsap.utils.toArray('.works__item');

    worksItems.forEach((item) => {
        gsap.fromTo(item,
            { y: 30, scale: 0.9, opacity: 0.5, filter: 'blur(10px)' },
            {
                y: 0,
                scale: 1,
                opacity: 1,
                filter: 'blur(0px)',
                ease: 'sine.inOut',
                scrollTrigger: {
                    trigger: item,
                    start: 'top 100%',
                    end: 'top 70%',
                    scrub: true,
                }
            }
        );
    });

    const yearsSwitcherNodes = gsap.utils.toArray('.years__switcher');
    const yearsContainers = [...new Set(
        yearsSwitcherNodes
            .map((node) => node.closest('.years'))
            .filter(Boolean)
    )];

    yearsContainers.forEach((container) => {
        ScrollTrigger.create({
            trigger: container,
            start: 'top 82%',
            end: 'bottom 18%',
            onEnter: () => container.classList.add('is-visible'),
            onEnterBack: () => container.classList.add('is-visible'),
            onLeave: () => container.classList.remove('is-visible'),
            onLeaveBack: () => container.classList.remove('is-visible'),
        });
    });

    queueRefresh();
});
