# Auto zoom lone images and videos

A Firefox extension that adds pan and zoom controls to standalone image documents and makes standalone videos loop. It is a self-contained WebExtension: the former `panzoom` dependency is implemented in `content.js`, and the extension loads no remote code or CDN assets.

## Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on…**.
3. Select this folder's `manifest.json`.

Temporary add-ons are removed when Firefox restarts. For regular installation, package and sign the extension through Mozilla Add-ons.

## Image controls

- Drag to pan; use the mouse wheel or a touch pinch to zoom.
- Press **Space** to return to fit, or **F** to fill the viewport.
- Press **Q** to toggle the image dimensions.
- Click the middle mouse button to return to fit.

The extension only changes a page when it is a standalone image or video document. It needs access to HTTP and HTTPS pages so it can recognize images regardless of their file extension or URL query string.
