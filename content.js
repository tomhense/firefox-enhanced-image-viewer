"use strict";

(() => {
	if (window.top !== window || !document.body) {
		return;
	}

	const bodyChildren = [...document.body.children];
	const image = document.querySelector("img");
	const video = document.querySelector("video");
	const isImageDocument = Boolean(
		document.querySelector('head link[href="resource://content-accessible/TopLevelImageDocument.css"]') ||
		(bodyChildren.length === 1 && bodyChildren[0] === image)
	);
	const isVideoDocument = Boolean(
		document.querySelector('head link[href="resource://content-accessible/TopLevelVideoDocument.css"]') ||
		(bodyChildren.length === 1 && bodyChildren[0] === video)
	);

	if (isImageDocument && image) {
		setupImage(image);
	} else if (isVideoDocument && video) {
		setupVideo(video);
	}

	function addImageStyles() {
		const style = document.createElement("style");
		style.textContent = `
			html, body {
				width: 100% !important;
				height: 100% !important;
				margin: 0 !important;
				overflow: hidden !important;
				scrollbar-width: none !important;
			}
			.iiz-viewer {
				position: fixed;
				inset: 0;
				overflow: hidden;
				touch-action: none;
				user-select: none;
				-webkit-user-select: none;
				cursor: grab;
			}
			.iiz-viewer.iiz-dragging { cursor: grabbing; }
			.iiz-image {
				position: absolute !important;
				left: 50% !important;
				top: 50% !important;
				max-width: none !important;
				max-height: none !important;
				margin: 0 !important;
				transform-origin: center center;
				will-change: transform;
				pointer-events: none;
			}
			.iiz-info {
				position: fixed;
				z-index: 2147483647;
				top: 0;
				left: 0;
				margin: 0;
				padding: 0.5em 1em;
				border: 3px solid black;
				background: white;
				color: black;
				font: 16px sans-serif;
				line-height: 1.4;
				pointer-events: none;
			}
			.iiz-info p { margin: 0.25em 0; }
		`;
		document.documentElement.appendChild(style);
	}

	function setupImage(originalImage) {
		addImageStyles();

		// Replacing Firefox's image element disables its built-in click-to-zoom handler.
		const imageElement = originalImage.cloneNode(false);
		imageElement.classList.add("iiz-image");
		const viewer = document.createElement("div");
		viewer.className = "iiz-viewer";
		viewer.appendChild(imageElement);
		originalImage.replaceWith(viewer);

		if (imageElement.complete && imageElement.naturalWidth > 0) {
			initializePanZoom(viewer, imageElement);
		} else {
			imageElement.addEventListener("load", () => initializePanZoom(viewer, imageElement), { once: true });
		}
	}

	function initializePanZoom(viewer, image) {
		const minZoom = 0.5;
		const defaultMaxZoom = 10;
		let maxZoom = defaultMaxZoom;
		let zoom = 1;
		let x = 0;
		let y = 0;
		let baseWidth = 0;
		let baseHeight = 0;
		const pointers = new Map();
		let dragStart = null;
		let pinchStart = null;

		function resizeBase() {
			const viewportWidth = viewer.clientWidth;
			const viewportHeight = viewer.clientHeight;
			const fit = Math.min(1, viewportWidth / image.naturalWidth, viewportHeight / image.naturalHeight);
			baseWidth = image.naturalWidth * fit;
			baseHeight = image.naturalHeight * fit;
			image.style.width = `${baseWidth}px`;
			image.style.height = `${baseHeight}px`;
			clampPosition();
			render();
		}

		function render() {
			image.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${zoom})`;
		}

		function clampPosition() {
			const viewportWidth = viewer.clientWidth;
			const viewportHeight = viewer.clientHeight;
			const width = baseWidth * zoom;
			const height = baseHeight * zoom;
			// Let smaller images pan through the empty viewport area as well as
			// larger images pan across their bounds.
			const limitX = Math.abs(width - viewportWidth) / 2;
			const limitY = Math.abs(height - viewportHeight) / 2;
			x = Math.max(-limitX, Math.min(limitX, x));
			y = Math.max(-limitY, Math.min(limitY, y));
		}

		function setZoom(nextZoom, focalX = viewer.clientWidth / 2, focalY = viewer.clientHeight / 2) {
			const boundedZoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));
			const ratio = boundedZoom / zoom;
			x = focalX - viewer.clientWidth / 2 - (focalX - viewer.clientWidth / 2 - x) * ratio;
			y = focalY - viewer.clientHeight / 2 - (focalY - viewer.clientHeight / 2 - y) * ratio;
			zoom = boundedZoom;
			clampPosition();
			render();
		}

		function zoomToFit() {
			zoom = 1;
			maxZoom = defaultMaxZoom;
			x = 0;
			y = 0;
			render();
		}

		function zoomToContain() {
			// Re-read the viewport in case the shortcut is pressed before the
			// browser has delivered a pending resize event.
			resizeBase();
			zoom = Math.min(viewer.clientWidth / baseWidth, viewer.clientHeight / baseHeight);
			// Tiny source images can need more than 10x to use the available space.
			maxZoom = Math.max(defaultMaxZoom, zoom * 10);
			x = 0;
			y = 0;
			clampPosition();
			render();
		}

		function showImageInfo() {
			const oldInfo = document.querySelector(".iiz-info");
			if (oldInfo) {
				oldInfo.remove();
				return;
			}
			const info = document.createElement("div");
			info.className = "iiz-info";
			const width = document.createElement("p");
			width.textContent = `Width: ${image.naturalWidth}px`;
			const height = document.createElement("p");
			height.textContent = `Height: ${image.naturalHeight}px`;
			info.append(width, height);
			document.body.appendChild(info);
		}

		document.addEventListener("keydown", (event) => {
			if (event.code === "KeyF") {
				event.preventDefault();
				zoomToContain();
			} else if (event.code === "Space") {
				event.preventDefault();
				zoomToFit();
			} else if (event.code === "KeyQ") {
				event.preventDefault();
				showImageInfo();
			}
		});

		viewer.addEventListener("mousedown", (event) => {
			if (event.button === 1) {
				event.preventDefault();
				zoomToFit();
			}
		});

		viewer.addEventListener("wheel", (event) => {
			event.preventDefault();
			setZoom(zoom * Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
		}, { passive: false });

		viewer.addEventListener("pointerdown", (event) => {
			if (event.button !== 0 && event.pointerType === "mouse") return;
			event.preventDefault();
			viewer.setPointerCapture(event.pointerId);
			pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
			if (pointers.size === 1) {
				dragStart = { pointerX: event.clientX, pointerY: event.clientY, x, y };
				viewer.classList.add("iiz-dragging");
			} else if (pointers.size === 2) {
				const [first, second] = [...pointers.values()];
				pinchStart = {
					distance: Math.hypot(first.x - second.x, first.y - second.y),
					zoom,
					centerX: (first.x + second.x) / 2,
					centerY: (first.y + second.y) / 2
				};
				dragStart = null;
			}
		});

		viewer.addEventListener("pointermove", (event) => {
			if (!pointers.has(event.pointerId)) return;
			pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
			if (pointers.size >= 2 && pinchStart) {
				const [first, second] = [...pointers.values()];
				const distance = Math.hypot(first.x - second.x, first.y - second.y);
				const centerX = (first.x + second.x) / 2;
				const centerY = (first.y + second.y) / 2;
				setZoom(pinchStart.zoom * distance / Math.max(1, pinchStart.distance), centerX, centerY);
				return;
			}
			if (dragStart) {
				x = dragStart.x + event.clientX - dragStart.pointerX;
				y = dragStart.y + event.clientY - dragStart.pointerY;
				clampPosition();
				render();
			}
		});

		function endPointer(event) {
			pointers.delete(event.pointerId);
			if (pointers.size < 2) pinchStart = null;
			if (pointers.size === 1) {
				const [remaining] = pointers.values();
				dragStart = { pointerX: remaining.x, pointerY: remaining.y, x, y };
			} else if (pointers.size === 0) {
				dragStart = null;
				viewer.classList.remove("iiz-dragging");
			}
		}
		viewer.addEventListener("pointerup", endPointer);
		viewer.addEventListener("pointercancel", endPointer);

		window.addEventListener("resize", resizeBase);
		resizeBase();
	}

	function setupVideo(videoElement) {
		videoElement.loop = true;
		videoElement.width = window.innerWidth;
		videoElement.height = window.innerHeight;
		videoElement.style.objectFit = "contain";
		window.addEventListener("resize", () => {
			videoElement.width = window.innerWidth;
			videoElement.height = window.innerHeight;
		});
	}
})();
