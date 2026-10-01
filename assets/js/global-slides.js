(() => {
    'use strict';

    console.log('[GlobalSlides] Initialisation');

    const slides = window.slidesConfig;

    if (!Array.isArray(slides)) {
        console.error('[GlobalSlides] window.slidesConfig introuvable');
        return;
    }

    if (!window.AppCursor) {
        console.error('[GlobalSlides] AppCursor introuvable');
        return;
    }

    const HIGHLIGHT_DELAY = 200;
    const ELEMENT_TIMEOUT = 5000;
    const CURSOR_APPEAR_DELAY = 500;
    const CURSOR_REFRESH_DELAY = 300;

    let currentSlideIndex = -1;
    let navigationLocked = false;

    const sleep = (ms) => {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    };

    async function waitForElement(id, timeout = ELEMENT_TIMEOUT) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const element = document.getElementById(id);

            if (element) {
                return element;
            }

            await sleep(100);
        }

        return null;
    }

    function clearActiveSlides() {
        document
            .querySelectorAll('.slide-responsive-container.active')
            .forEach((slide) => {
                slide.classList.remove('active');
            });
    }

    function clearActiveHighlights() {
        document
            .querySelectorAll('.slide-responsive-container .highlight.active')
            .forEach((highlight) => {
                highlight.classList.remove('active');
            });
    }

    function activateSlide(slide) {
        clearActiveSlides();

        slide.classList.add('active');

        console.log(
            `[GlobalSlides] Slide actif : #${slide.id}`
        );
    }

    async function activateHighlights(slide) {
        await sleep(HIGHLIGHT_DELAY);

        if (!slide.classList.contains('active')) {
            return;
        }

        clearActiveHighlights();

        const highlights = slide.querySelectorAll('.highlight');

        console.log(
            `[GlobalSlides] ${highlights.length} highlight(s) dans #${slide.id}`
        );

        highlights.forEach((highlight, index) => {
            highlight.classList.add('active');

            console.log(
                `[GlobalSlides] Highlight ${index + 1} actif`
            );
        });
    }

    function setCursorVisibility(visible) {
        const cursor = document.querySelector('.app-cursor');

        if (!cursor) {
            console.warn(
                '[GlobalSlides] .app-cursor introuvable'
            );

            return;
        }

        cursor.style.display = visible ? '' : 'none';
    }

    function resetCursor() {
        setCursorVisibility(false);

        if (typeof AppCursor.reset === 'function') {
            AppCursor.reset();
        }

        console.log('[GlobalSlides] Curseur réinitialisé');
    }

    async function moveCursor(targetId) {
        if (!targetId) {
            return;
        }

        const target = await waitForElement(targetId);

        if (!target) {
            console.warn(
                `[GlobalSlides] #${targetId} introuvable`
            );

            return;
        }

        const rect = target.getBoundingClientRect();

        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        console.log(
            `[GlobalSlides] Curseur → #${targetId}`,
            {
                x,
                y
            }
        );

        await AppCursor.moveTo(x, y);
    }

    async function updateCursor(config, index) {
        if (!config.cursor) {
            setCursorVisibility(false);

            console.log('[GlobalSlides] Curseur → 0, 0');

            await AppCursor.moveTo(0, 0);

            return;
        }

        await sleep(CURSOR_APPEAR_DELAY);

        if (currentSlideIndex !== index) {
            return;
        }

        setCursorVisibility(true);

        await moveCursor(config.cursorTarget);

        sleep(CURSOR_REFRESH_DELAY).then(async () => {
            if (currentSlideIndex !== index) {
                return;
            }

            console.log(
                `[GlobalSlides] Réactualisation du curseur → #${config.cursorTarget}`
            );

            await moveCursor(config.cursorTarget);
        });
    }

    async function showSlide(index) {
        if (navigationLocked) {
            return false;
        }

        if (index < 0 || index >= slides.length) {
            console.warn(
                `[GlobalSlides] Index invalide : ${index}`
            );

            return false;
        }

        navigationLocked = true;

        const config = slides[index];

        console.log(
            `[GlobalSlides] Affichage ${index + 1}/${slides.length} : #${config.id}`
        );

        const slide = await waitForElement(config.id);

        if (!slide) {
            console.error(
                `[GlobalSlides] #${config.id} introuvable`
            );

            navigationLocked = false;

            return false;
        }

        currentSlideIndex = index;

        resetCursor();

        clearActiveHighlights();

        activateSlide(slide);

        activateHighlights(slide);

        await AppCursor.ready;

        await updateCursor(config, index);

        navigationLocked = false;

        console.log(
            `[GlobalSlides] Slide #${config.id} affiché`
        );

        return true;
    }

    async function next() {
        if (currentSlideIndex >= slides.length - 1) {
            console.log(
                '[GlobalSlides] Dernier slide atteint'
            );

            return false;
        }

        const nextIndex = currentSlideIndex + 1;

        console.log(
            `[GlobalSlides] → Slide suivant : ${nextIndex}`
        );

        return await showSlide(nextIndex);
    }

    async function previous() {
        if (currentSlideIndex <= 0) {
            console.log(
                '[GlobalSlides] Premier slide atteint'
            );

            return false;
        }

        const previousIndex = currentSlideIndex - 1;

        console.log(
            `[GlobalSlides] ← Slide précédent : ${previousIndex}`
        );

        return await showSlide(previousIndex);
    }

    async function goTo(index) {
        return await showSlide(index);
    }

    function getCurrentIndex() {
        return currentSlideIndex;
    }

    function getCurrentSlide() {
        return slides[currentSlideIndex] ?? null;
    }

    window.AppSlides = {
        next,
        previous,
        goTo,
        showSlide,
        getCurrentIndex,
        getCurrentSlide
    };

    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
            event.preventDefault();

            console.log('[GlobalSlides] ArrowRight');

            next();
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();

            console.log('[GlobalSlides] ArrowLeft');

            previous();
        }
    });

    window.addEventListener('resize', () => {
        const config = getCurrentSlide();

        if (config?.cursor) {
            moveCursor(config.cursorTarget);
        }
    });

    console.log(
        `[GlobalSlides] ${slides.length} slide(s) chargé(s)`
    );

    console.log(
        '[GlobalSlides] Affichage du premier slide'
    );

    showSlide(0);
})();