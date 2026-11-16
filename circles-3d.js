// 3D rendering of the community circles with Babylon.js.
//
// Exposes window.Circles3D.start(container, items, onSelect). It returns
// false when Babylon.js or WebGL is unavailable, so community-circles.js can
// fall back to the DOM circles.
//
// The camera is orthographic with 1 world unit = 1 CSS pixel, so the sizes
// below mirror the CSS custom properties in index.html. World y grows upward,
// so a circle at CSS offset (left, top) sits at world (left, -top).
(function () {
  "use strict";

  // bleed: how far the canvas extends past the container on each side, so
  // edge circles can overhang into the page padding like the DOM version.
  const DESKTOP = { size: 150, overlap: 40, rowOverlap: 40, textMax: 90, fixedCols: 0, bleed: 20 };
  const MOBILE = { size: 132, overlap: 36, rowOverlap: 40, textMax: 82, fixedCols: 2, bleed: 8 };
  const MOBILE_QUERY = "(max-width: 420px)";

  const FONT_PX = 14;
  const LINE_HEIGHT = 1.35;
  const EDGE = 12;            // canvas margin around the grid (shadow, highlight)
  const RING_RADIUS = 68 / 150; // matches --ring-inset: 7px on a 150px circle
  const LABEL_SIZE = 0.68;    // label plane size, relative to circle size
  const TEX_SIZE = 512;
  const HIGHLIGHT_SCALE = 1.07;
  const TILT_Z = 9;

  // Chain links: each ring's plane is tilted in depth along the diagonal, so
  // its depth is z = ±CHAIN_SLOPE * (x + y) relative to its center, with the
  // sign flipped between the two tones. Neighbors in the checkerboard always
  // have opposite tones, so at the two points where neighboring rings cross
  // (seen from the front), one ring is in front at one crossing and behind at
  // the other — they pass through each other like chain links. This holds for
  // both side-by-side and stacked neighbors. The gap between the rings at a
  // crossing is about 0.55 * CHAIN_SLOPE * size, which must clear the tube
  // thickness (0.06 * size).
  const CHAIN_SLOPE = 0.275;
  const CHAIN_AXIS = [1, -1, 0];  // the in-plane line where depth stays 0
  const CHAIN_ANGLE = Math.atan(CHAIN_SLOPE * Math.SQRT2);
  const LABEL_Z = -0.22;          // in front of the tilted disc, in circle units
  const SHADOW_Z = 0.3;           // behind the tilted ring, in circle units

  const TONES = {
    a: { rgb: [55, 145, 205], tiltZ: -TILT_Z, chain: 1, discAlphaIndex: 2 },
    b: { rgb: [226, 145, 52], tiltZ: TILT_Z, chain: -1, discAlphaIndex: 1 },
  };

  const deg = (d) => (d * Math.PI) / 180;

  function start(container, items, onSelect) {
    const B = window.BABYLON;
    if (!B || !B.Engine || !B.Engine.isSupported()) {
      return false;
    }

    const canvas = document.createElement("canvas");
    canvas.className = "circles-canvas";
    canvas.setAttribute("aria-hidden", "true");

    let engine;
    try {
      engine = new B.Engine(
        canvas,
        true,
        { alpha: false, stencil: false, doNotHandleTouchAction: true },
        true
      );
    } catch (error) {
      return false;
    }

    container.innerHTML = "";
    container.classList.add("circles-3d");
    container.appendChild(canvas);

    // Babylon gives the canvas tabindex="1" (re-applied on every pointer
    // move) and focuses it on pointer down, which jumps the page to the
    // canvas top and puts it first in tab order. Keyboard access goes through
    // the invisible buttons instead, so keep the canvas out of tab order.
    engine.canvasTabIndex = -1;
    canvas.tabIndex = -1;

    const scene = new B.Scene(engine);
    scene.doNotHandleCursors = true;
    scene.preventDefaultOnPointerDown = false;
    scene.preventDefaultOnPointerUp = false;
    // Opaque white, matching the page background, so the 50% fills blend
    // exactly like the CSS rgba() fills.
    scene.clearColor = new B.Color4(1, 1, 1, 1);

    const camera = new B.FreeCamera("camera", new B.Vector3(0, 0, -1000), scene);
    camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;
    camera.minZ = 1;
    camera.maxZ = 2000;
    camera.inputs.clear();

    const sky = new B.HemisphericLight("sky", new B.Vector3(-0.3, 1, -0.6), scene);
    sky.intensity = 0.8;
    sky.groundColor = new B.Color3(0.3, 0.3, 0.3);
    const sun = new B.DirectionalLight("sun", new B.Vector3(0.5, -0.6, 1), scene);
    sun.intensity = 0.7;

    const shadowMaterial = createShadowMaterial(B, scene);
    const ringMaterial = new B.StandardMaterial("ring", scene);
    ringMaterial.diffuseColor = new B.Color3(0.55, 0.55, 0.57);
    ringMaterial.specularColor = new B.Color3(1, 1, 1);
    ringMaterial.specularPower = 48;
    ringMaterial.emissiveColor = new B.Color3(0.12, 0.12, 0.12);

    const fillMaterials = {};
    Object.entries(TONES).forEach(([name, tone]) => {
      const material = new B.StandardMaterial("fill-" + name, scene);
      // Unlit at 50% alpha over the white page gives the same color as the
      // CSS rgba(..., 0.5) fill.
      material.disableLighting = true;
      material.emissiveColor = B.Color3.FromInts(...tone.rgb);
      material.alpha = 0.5;
      material.backFaceCulling = false;
      fillMaterials[name] = material;
    });

    const circles = items.map((item, index) =>
      createCircle(B, scene, item, index, shadowMaterial, ringMaterial)
    );

    // Invisible buttons laid over each circle keep keyboard and screen-reader
    // access. Focusing one scrolls it into view and highlights its circle.
    circles.forEach((circle) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "circle-focus-target";
      button.textContent = circle.item.title;
      button.addEventListener("click", () => onSelect(circle.item));
      button.addEventListener("focus", () => {
        focusIndex = circle.index;
        refreshHighlight();
      });
      button.addEventListener("blur", () => {
        focusIndex = null;
        refreshHighlight();
      });
      container.appendChild(button);
      circle.button = button;
    });

    let hoverIndex = null;
    let focusIndex = null;
    let highlighted = null;
    let conf = null;

    // x, y are CSS pixels relative to the canvas.
    function pickIndex(x, y) {
      const pick = scene.pick(x, y, (mesh) => mesh.isPickable);
      return pick && pick.hit ? pick.pickedMesh.metadata.index : null;
    }

    canvas.addEventListener("pointermove", (event) => {
      hoverIndex = pickIndex(event.offsetX, event.offsetY);
      canvas.style.cursor = hoverIndex === null ? "" : "pointer";
      refreshHighlight();
    });

    canvas.addEventListener("click", (event) => {
      const index = pickIndex(event.offsetX, event.offsetY);
      if (index !== null) {
        onSelect(items[index]);
      }
    });

    canvas.addEventListener("pointerleave", () => {
      hoverIndex = null;
      canvas.style.cursor = "";
      refreshHighlight();
    });

    function refreshHighlight() {
      const next = hoverIndex !== null ? hoverIndex : focusIndex;
      if (next === highlighted) {
        return;
      }
      const previous = highlighted;
      highlighted = next;
      [previous, next].forEach((index) => {
        if (index !== null) {
          applyHighlight(circles[index]);
        }
      });
    }

    function applyHighlight(circle) {
      const on = circle.index === highlighted;
      circle.root.scaling.setAll(conf.size * (on ? HIGHLIGHT_SCALE : 1));
      drawLabel(circle, conf, on);
    }

    function layout() {
      const nextConf = window.matchMedia(MOBILE_QUERY).matches ? MOBILE : DESKTOP;
      const confChanged = nextConf !== conf;
      conf = nextConf;

      const containerWidth = container.clientWidth;
      const width = containerWidth + 2 * conf.bleed;
      const cellW = conf.size - conf.overlap;
      const cellH = conf.size - conf.rowOverlap;
      // Same column count as the CSS grid's auto-fit.
      const fit = Math.floor(containerWidth / cellW);
      const cols = conf.fixedCols || Math.max(1, Math.min(items.length, fit));
      const rows = Math.ceil(items.length / cols);
      const height = rows * cellH + conf.rowOverlap + 2 * EDGE;

      canvas.style.width = width + "px";
      canvas.style.marginInline = -conf.bleed + "px";
      canvas.style.height = height + "px";
      engine.resize();

      camera.orthoLeft = -width / 2;
      camera.orthoRight = width / 2;
      camera.orthoTop = height / 2;
      camera.orthoBottom = -height / 2;
      camera.position.set(width / 2, -height / 2, -1000);
      camera.setTarget(new B.Vector3(width / 2, -height / 2, 0));

      // Grid is centered and filled right-to-left, like the RTL CSS grid.
      const offsetX = (width - cols * cellW) / 2;
      circles.forEach((circle) => {
        const row = Math.floor(circle.index / cols);
        const col = circle.index % cols;
        const toneName = (row + col) % 2 === 1 ? "b" : "a";
        const tone = TONES[toneName];

        const x = width - offsetX - cellW * (col + 0.5);
        const top = EDGE + conf.rowOverlap / 2 + cellH * (row + 0.5);
        circle.root.position.set(x, -top, 0);
        circle.tilt.rotationQuaternion = B.Quaternion.RotationAxis(
          new B.Vector3(...CHAIN_AXIS).normalize(),
          tone.chain * CHAIN_ANGLE
        );
        circle.spin.rotation.z = deg(tone.tiltZ);
        circle.label.rotation.z = deg(tone.tiltZ);

        circle.disc.material = fillMaterials[toneName];
        circle.disc.alphaIndex = tone.discAlphaIndex;

        const style = circle.button.style;
        style.left = x - conf.bleed - conf.size / 2 + "px";
        style.top = top - conf.size / 2 + "px";
        style.width = conf.size + "px";
        style.height = conf.size + "px";

        circle.root.scaling.setAll(conf.size * (circle.index === highlighted ? HIGHLIGHT_SCALE : 1));
        if (confChanged) {
          drawLabel(circle, conf, circle.index === highlighted);
        }
      });
    }

    let resizeTimeout;
    function scheduleLayout() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(layout, 150);
    }
    if (window.ResizeObserver) {
      new ResizeObserver(scheduleLayout).observe(container);
    } else {
      window.addEventListener("resize", scheduleLayout);
    }

    layout();
    engine.runRenderLoop(() => scene.render());
    return true;
  }

  function createCircle(B, scene, item, index, shadowMaterial, ringMaterial) {
    const root = new B.TransformNode("circle-" + index, scene);
    // tilt: the chain-link depth tilt (set in layout). spin: the small
    // in-plane turn of the original design, applied inside the tilted plane.
    const tilt = new B.TransformNode("tilt-" + index, scene);
    tilt.parent = root;
    const spin = new B.TransformNode("spin-" + index, scene);
    spin.parent = tilt;

    // Soft shadow standing in for the CSS drop-shadow(5px 8px 5px). It stays
    // flat, behind the tilted ring.
    const shadow = B.MeshBuilder.CreatePlane("shadow-" + index, { size: 1.15 }, scene);
    shadow.parent = root;
    shadow.position.set(5 / 150, -8 / 150, SHADOW_Z);
    shadow.material = shadowMaterial;
    shadow.alphaIndex = 0;
    shadow.isPickable = false;

    const disc = B.MeshBuilder.CreateDisc(
      "disc-" + index,
      { radius: RING_RADIUS, tessellation: 64, sideOrientation: B.Mesh.DOUBLESIDE },
      scene
    );
    disc.parent = spin;

    const ring = B.MeshBuilder.CreateTorus(
      "ring-" + index,
      { diameter: RING_RADIUS * 2, thickness: 0.06, tessellation: 64 },
      scene
    );
    ring.parent = spin;
    ring.rotation.x = Math.PI / 2;
    ring.material = ringMaterial;

    const label = B.MeshBuilder.CreatePlane("label-" + index, { size: LABEL_SIZE }, scene);
    // The label stays flat (not tilted with the ring) so the text stays crisp,
    // floating just in front of the tilted disc.
    label.parent = root;
    label.position.z = LABEL_Z;
    label.alphaIndex = 3;

    const texture = new B.DynamicTexture(
      "label-tex-" + index,
      { width: TEX_SIZE, height: TEX_SIZE },
      scene,
      true
    );
    texture.hasAlpha = true;
    const labelMaterial = new B.StandardMaterial("label-mat-" + index, scene);
    labelMaterial.diffuseTexture = texture;
    labelMaterial.useAlphaFromDiffuseTexture = true;
    labelMaterial.disableLighting = true;
    labelMaterial.emissiveColor = new B.Color3(1, 1, 1);
    labelMaterial.backFaceCulling = false;
    label.material = labelMaterial;

    [disc, ring, label].forEach((mesh) => {
      mesh.metadata = { index };
    });

    return { item, index, root, tilt, spin, shadow, disc, ring, label, texture, button: null };
  }

  function createShadowMaterial(B, scene) {
    const size = 256;
    const texture = new B.DynamicTexture("shadow-tex", { width: size, height: size }, scene, true);
    const ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.18)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    texture.hasAlpha = true;
    texture.update();

    const material = new B.StandardMaterial("shadow", scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.backFaceCulling = false;
    return material;
  }

  // Draws the circle title onto its label texture, wrapped like the DOM
  // version (14px, line-height 1.35, max-width 90px or 82px on mobile).
  function drawLabel(circle, conf, underline) {
    const texture = circle.texture;
    const ctx = texture.getContext();
    const scale = TEX_SIZE / (LABEL_SIZE * conf.size);
    const fontPx = FONT_PX * scale;
    const lineHeight = fontPx * LINE_HEIGHT;

    ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
    ctx.font = fontPx + "px Arial, Helvetica, sans-serif";
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = Math.max(1, fontPx / 14);

    const lines = wrapLines(ctx, circle.item.title, conf.textMax * scale);
    const firstY = TEX_SIZE / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      const y = firstY + i * lineHeight;
      ctx.fillText(line, TEX_SIZE / 2, y);
      if (underline) {
        const half = ctx.measureText(line).width / 2;
        const underlineY = y + fontPx * 0.55;
        ctx.beginPath();
        ctx.moveTo(TEX_SIZE / 2 - half, underlineY);
        ctx.lineTo(TEX_SIZE / 2 + half, underlineY);
        ctx.stroke();
      }
    });
    texture.update();
  }

  function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
    text.split(/\s+/).filter(Boolean).forEach((word) => {
      const candidate = line ? line + " " + word : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        return;
      }
      if (line) {
        lines.push(line);
      }
      line = word;
      // overflow-wrap: anywhere — split a single word that is still too wide.
      while (line.length > 1 && ctx.measureText(line).width > maxWidth) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) {
          cut--;
        }
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    });
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  window.Circles3D = { start };
})();
