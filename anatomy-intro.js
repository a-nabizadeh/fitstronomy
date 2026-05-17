import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const REQUIRED_MODEL_HINT = 'For this static site, place the real model at assets/anatomy-body.glb with separate meshes named Body_Base and Muscle_* (for example Muscle_Pecs, Muscle_Abs, Muscle_Biceps_L, Muscle_Quads_R). If you later use a public folder build, place it at public/models/anatomy-intro.glb and update data-model-src to /models/anatomy-intro.glb.';

const MUSCLE_ORDER = [
  'Muscle_Pecs',
  'Muscle_Shoulders',
  'Muscle_Back',
  'Muscle_Abs',
  'Muscle_Biceps_L',
  'Muscle_Biceps_R',
  'Muscle_Forearm_L',
  'Muscle_Forearm_R',
  'Muscle_Quads_L',
  'Muscle_Quads_R',
  'Muscle_Calves_L',
  'Muscle_Calves_R'
];

class AnatomyIntro {
  constructor(root) {
    this.root = root;
    this.canvasWrap = root.querySelector('[data-intro-canvas]');
    this.skipButton = root.querySelector('[data-intro-skip]');
    this.status = root.querySelector('[data-intro-status]');
    this.modelSrc = root.dataset.modelSrc || 'assets/anatomy-body.glb';
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.bodyGroup = null;
    this.records = [];
    this.frameId = 0;
    this.startedAt = 0;
    this.finished = false;
    this.destroyed = false;
    this.errorTimer = 0;
    this.flyOffset = 3.2;
    this.mixer = null;
    this.clock = new THREE.Clock();
    this.usingFallback = false;
    this.renderLoopLogged = false;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    this.handleResize = this.handleResize.bind(this);
    this.handleSkip = this.handleSkip.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
  }

  init() {
    if (!this.root || !this.canvasWrap) return;
    if (this.root.classList.contains('is-hidden')) return;

    window.anatomyIntroModuleLoaded = true;
    this.root.dataset.ready = 'true';

    if (this.prefersReducedMotion.matches) {
      this.hideImmediately();
      return;
    }

    document.body.classList.add('intro-lock');
    this.skipButton?.addEventListener('click', this.handleSkip);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pagehide', this.handlePageHide);

    this.createScene();
    this.setState('loading', 'Preview anatomy animation — anatomy model missing.');
    console.info('[AnatomyIntro] Loading model:', this.modelSrc);

    this.loadAnatomyModel()
      .then(({ scene, animations }) => this.startWithLoadedModel(scene, animations))
      .catch((error) => this.startWithFallback(error));
  }

  createScene() {
    const width = Math.max(this.canvasWrap.clientWidth, 1);
    const height = Math.max(this.canvasWrap.clientHeight, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.canvasWrap.appendChild(this.renderer.domElement);
    console.info('[AnatomyIntro] Canvas created and sized.', { width, height });

    this.bodyGroup = new THREE.Group();
    this.bodyGroup.name = 'Intro_Body_Group';
    this.scene.add(this.bodyGroup);

    const ambient = new THREE.AmbientLight(0xffffff, 0.62);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1d1c1c, 0.9);
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    const rim = new THREE.DirectionalLight(0xe24b4a, 2.45);
    const redDepth = new THREE.PointLight(0xe24b4a, 1.05, 8);
    const softFill = new THREE.DirectionalLight(0xffffff, 0.42);

    key.position.set(3.4, 5.2, 4.6);
    rim.position.set(-4.2, 2.2, -4.6);
    redDepth.position.set(0, 0.4, -2.4);
    softFill.position.set(0, 1.2, 5);

    this.scene.add(ambient, hemi, key, rim, redDepth, softFill);
    console.info('[AnatomyIntro] Lights added: ambient, hemisphere, key, rim, red depth, and fill.');
    this.handleResize();
  }

  async loadAnatomyModel() {
    // Put the final model at assets/anatomy-body.glb, or update data-model-src in index.html.
    // Required structure: Body_Base plus separate Muscle_* meshes for chest, abs, shoulders, arms, quads, calves, back, etc.
    await this.verifyModelAvailable();

    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`The anatomy model did not load in time. ${REQUIRED_MODEL_HINT}`));
      }, 9000);

      loader.load(
        this.modelSrc,
        (gltf) => {
          if (settled) {
            this.disposeObject(gltf.scene);
            return;
          }
          settled = true;
          window.clearTimeout(timeoutId);
          resolve({ scene: gltf.scene, animations: gltf.animations || [] });
        },
        undefined,
        (error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          console.error('[AnatomyIntro] Exact GLTFLoader error:', error);
          reject(new Error(`Could not load ${this.modelSrc}. ${REQUIRED_MODEL_HINT}`));
        }
      );
    });
  }

  async verifyModelAvailable() {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 1800);

    try {
      const response = await fetch(this.modelSrc, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while checking ${this.modelSrc}`);
      }
    } catch (error) {
      console.error('[AnatomyIntro] Model availability check failed:', error);
      throw new Error(`Could not find ${this.modelSrc}. ${REQUIRED_MODEL_HINT}`);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  startWithLoadedModel(model, animations) {
    if (this.finished || this.destroyed) {
      this.disposeObject(model);
      return;
    }

    const muscles = this.collectMuscles(model);
    const baseMeshes = this.collectBaseMeshes(model);

    if (!baseMeshes.length || !muscles.length) {
      this.disposeObject(model);
      this.startWithFallback(new Error(`The loaded GLB is missing required separate meshes. ${REQUIRED_MODEL_HINT}`));
      return;
    }

    this.bodyGroup.add(model);
    this.normalizeModel(model);
    this.applyMaterials(model, muscles);
    this.prepareMuscles(muscles);
    this.setupAnimationMixer(model, animations);

    this.root.classList.add('is-model-ready');
    this.setState('playing-animation', 'Playing anatomy intro animation...');
    this.startedAt = performance.now() + 180;
    this.clock.start();
    this.animate();
  }

  startWithFallback(error) {
    if (this.finished || this.destroyed) return;

    console.error('[AnatomyIntro] Model failed, using fallback Three.js placeholder.', error);
    this.usingFallback = true;
    this.root.classList.add('using-fallback');
    this.setState('model-failed-using-fallback', 'Preview anatomy animation — anatomy model missing.');

    const fallback = this.createFallbackModel();
    const muscles = this.collectMuscles(fallback);
    this.bodyGroup.add(fallback);
    this.normalizeModel(fallback);
    this.applyMaterials(fallback, muscles);
    this.prepareMuscles(muscles);
    this.startedAt = performance.now() + 180;
    this.clock.start();
    this.animate();
  }

  createFallbackModel() {
    const group = new THREE.Group();
    group.name = 'Debug_Anatomy_Fallback';

    // Temporary Three.js-only fallback. Replace this by placing the real GLB at assets/anatomy-body.glb.
    group.add(this.createBaseCapsule('Body_Base_Torso', [0, 0.55, 0], [0.74, 1.28, 0.42], 0.42, 1.04));
    group.add(this.createBaseSphere('Body_Base_Head', [0, 1.86, 0], [0.34, 0.39, 0.32], 0.5));
    group.add(this.createBaseSphere('Body_Base_Neck', [0, 1.48, 0], [0.18, 0.2, 0.17], 0.5));
    group.add(this.createBaseSphere('Body_Base_Pelvis', [0, -0.18, 0], [0.55, 0.32, 0.36], 0.5));

    group.add(this.createMuscleEllipsoid('Muscle_Pecs_L', [-0.23, 1.02, 0.33], [0.36, 0.2, 0.09], -0.1));
    group.add(this.createMuscleEllipsoid('Muscle_Pecs_R', [0.23, 1.02, 0.33], [0.36, 0.2, 0.09], 0.1));
    group.add(this.createMuscleEllipsoid('Muscle_Abs_Upper', [0, 0.65, 0.36], [0.23, 0.18, 0.07], 0));
    group.add(this.createMuscleEllipsoid('Muscle_Abs_Mid', [0, 0.42, 0.37], [0.25, 0.2, 0.07], 0));
    group.add(this.createMuscleEllipsoid('Muscle_Abs_Lower', [0, 0.18, 0.35], [0.22, 0.19, 0.06], 0));
    group.add(this.createMuscleEllipsoid('Muscle_Shoulders_L', [-0.6, 1.19, 0.08], [0.28, 0.24, 0.22], -0.2));
    group.add(this.createMuscleEllipsoid('Muscle_Shoulders_R', [0.6, 1.19, 0.08], [0.28, 0.24, 0.22], 0.2));
    group.add(this.createMuscleEllipsoid('Muscle_Back', [0, 0.72, -0.32], [0.52, 0.82, 0.1], 0));
    group.add(this.createMuscleCapsule('Muscle_Biceps_L', [-0.83, 0.73, 0.13], [0.16, 0.52, 0.16], -0.12));
    group.add(this.createMuscleCapsule('Muscle_Biceps_R', [0.83, 0.73, 0.13], [0.16, 0.52, 0.16], 0.12));
    group.add(this.createMuscleCapsule('Muscle_Forearm_L', [-0.92, 0.15, 0.09], [0.12, 0.43, 0.12], -0.08));
    group.add(this.createMuscleCapsule('Muscle_Forearm_R', [0.92, 0.15, 0.09], [0.12, 0.43, 0.12], 0.08));
    group.add(this.createMuscleCapsule('Muscle_Quads_L', [-0.26, -0.73, 0.14], [0.24, 0.76, 0.2], 0.03));
    group.add(this.createMuscleCapsule('Muscle_Quads_R', [0.26, -0.73, 0.14], [0.24, 0.76, 0.2], -0.03));
    group.add(this.createMuscleCapsule('Muscle_Calves_L', [-0.28, -1.54, -0.02], [0.15, 0.48, 0.15], 0.02));
    group.add(this.createMuscleCapsule('Muscle_Calves_R', [0.28, -1.54, -0.02], [0.15, 0.48, 0.15], -0.02));

    return group;
  }

  createBaseCapsule(name, position, scale, radius, length) {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 12, 24), new THREE.MeshStandardMaterial());
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    return mesh;
  }

  createBaseSphere(name, position, scale, radius) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 18), new THREE.MeshStandardMaterial());
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    return mesh;
  }

  createMuscleEllipsoid(name, position, scale, zRotation) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 18), new THREE.MeshStandardMaterial());
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    mesh.rotation.z = zRotation;
    return mesh;
  }

  createMuscleCapsule(name, position, scale, zRotation) {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 10, 22), new THREE.MeshStandardMaterial());
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    mesh.rotation.z = zRotation;
    return mesh;
  }

  collectBaseMeshes(model) {
    const baseMeshes = [];
    model.traverse((child) => {
      if (child.isMesh && child.name.startsWith('Body_Base')) {
        baseMeshes.push(child);
      }
    });
    return baseMeshes;
  }

  collectMuscles(model) {
    const muscles = [];
    model.traverse((child) => {
      if (child.isMesh && child.name.startsWith('Muscle_')) {
        muscles.push(child);
      }
    });

    return muscles.sort((a, b) => this.muscleRank(a.name) - this.muscleRank(b.name));
  }

  muscleRank(name) {
    const index = MUSCLE_ORDER.findIndex((item) => name.startsWith(item));
    return index === -1 ? MUSCLE_ORDER.length : index;
  }

  normalizeModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetHeight = window.innerWidth < 768 ? 4.3 : 5.15;
    const height = Math.max(size.y, 0.001);
    const scale = targetHeight / height;

    model.scale.multiplyScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);
    this.flyOffset = Math.max(size.x * scale * 0.9, targetHeight * 0.48, 2.6);
  }

  applyMaterials(model, muscles) {
    const muscleSet = new Set(muscles);

    model.traverse((child) => {
      if (!child.isMesh) return;

      if (muscleSet.has(child)) {
        this.replaceMaterial(child, this.createMuscleMaterial(child.name, muscles.indexOf(child)));
        return;
      }

      this.replaceMaterial(child, this.createBaseMaterial());
    });
  }

  createBaseMaterial() {
    const base = this.cssColor('--text3', '#666666').lerp(this.cssColor('--bg2', '#242222'), 0.38);
    return new THREE.MeshStandardMaterial({
      color: base,
      transparent: true,
      opacity: 0.22,
      roughness: 0.78,
      metalness: 0.02,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  createMuscleMaterial(name, index) {
    const color = this.muscleColor(name, index);
    const opacity = this.muscleOpacity(name);

    return new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.18),
      transparent: true,
      opacity: 0,
      roughness: 0.42,
      metalness: 0.04,
      depthWrite: false,
      side: THREE.DoubleSide,
      userData: { finalOpacity: opacity }
    });
  }

  muscleColor(name, index) {
    const red = this.cssColor('--red', '#E24B4A');
    const redDark = this.cssColor('--red-dark', '#b83736');
    const text = this.cssColor('--text', '#ffffff');
    const text3 = this.cssColor('--text3', '#666666');

    if (name.includes('Pecs') || name.includes('Chest')) return red.clone();
    if (name.includes('Abs')) return red.clone().lerp(text, 0.18);
    if (name.includes('Shoulders') || name.includes('Delts')) return red.clone().lerp(text3, 0.22);
    if (name.includes('Back') || name.includes('Lats')) return redDark.clone().lerp(text3, 0.12);
    if (name.includes('Biceps') || name.includes('Triceps') || name.includes('Forearm') || name.includes('Arms')) return red.clone().lerp(redDark, 0.42);
    if (name.includes('Quads') || name.includes('Hamstrings')) return redDark.clone().lerp(red, 0.24);
    if (name.includes('Calves')) return redDark.clone().lerp(text, 0.08);

    return red.clone().lerp(text, (index % 4) * 0.06);
  }

  muscleOpacity(name) {
    if (name.includes('Pecs') || name.includes('Chest')) return 0.86;
    if (name.includes('Abs')) return 0.76;
    if (name.includes('Shoulders') || name.includes('Back') || name.includes('Lats')) return 0.74;
    if (name.includes('Biceps') || name.includes('Triceps') || name.includes('Forearm') || name.includes('Arms')) return 0.8;
    if (name.includes('Quads') || name.includes('Hamstrings')) return 0.72;
    if (name.includes('Calves')) return 0.68;
    return 0.72;
  }

  prepareMuscles(muscles) {
    this.records = muscles.map((mesh, index) => {
      const originalPosition = mesh.position.clone();
      const originalRotation = mesh.rotation.clone();
      const originalScale = mesh.scale.clone();
      const side = this.entrySide(mesh.name, index);
      const sideMultiplier = side === 'left' ? -1 : 1;
      const startPosition = originalPosition.clone().add(new THREE.Vector3(sideMultiplier * this.flyOffset, 0.12 * Math.sin(index), 0.08));
      const startScale = originalScale.clone().multiplyScalar(0.7);

      mesh.userData.introOriginal = {
        position: originalPosition.clone(),
        rotation: originalRotation.clone(),
        scale: originalScale.clone()
      };

      mesh.position.copy(startPosition);
      mesh.scale.copy(startScale);
      this.setMeshOpacity(mesh, 0);

      return {
        mesh,
        startPosition,
        startScale,
        originalPosition,
        originalRotation,
        originalScale,
        delay: index * 190,
        duration: 780
      };
    });
  }

  setupAnimationMixer(model, animations) {
    if (!animations.length) return;

    this.mixer = new THREE.AnimationMixer(model);
    animations.forEach((clip) => {
      this.mixer.clipAction(clip).play();
    });
  }

  entrySide(name, index) {
    if (/_L$/i.test(name)) return 'left';
    if (/_R$/i.test(name)) return 'right';
    return index % 2 === 0 ? 'left' : 'right';
  }

  animate() {
    if (this.finished || this.destroyed) return;

    const now = performance.now();
    const elapsed = Math.max(0, now - this.startedAt);
    const maxEnd = this.records.length
      ? this.records[this.records.length - 1].delay + this.records[this.records.length - 1].duration
      : 0;

    if (this.mixer) this.mixer.update(Math.min(this.clock.getDelta(), 0.033));

    this.bodyGroup.rotation.y = -0.42 + elapsed * 0.00072;

    if (!this.renderLoopLogged) {
      this.renderLoopLogged = true;
      console.info('[AnatomyIntro] Render loop running.', {
        fallback: this.usingFallback,
        records: this.records.length,
        canvas: {
          width: this.renderer.domElement.clientWidth,
          height: this.renderer.domElement.clientHeight
        },
        camera: {
          position: this.camera.position.toArray()
        }
      });
    }

    this.records.forEach((record) => {
      const progress = this.clamp((elapsed - record.delay) / record.duration, 0, 1);
      const eased = this.easeOutCubic(progress);
      const settle = progress < 0.82
        ? this.lerp(0.7, 1.08, this.easeOutCubic(progress / 0.82))
        : this.lerp(1.08, 1, this.easeOutCubic((progress - 0.82) / 0.18));

      record.mesh.position.lerpVectors(record.startPosition, record.originalPosition, eased);
      record.mesh.rotation.x = this.lerp(record.mesh.rotation.x, record.originalRotation.x, eased);
      record.mesh.rotation.y = this.lerp(record.mesh.rotation.y, record.originalRotation.y, eased);
      record.mesh.rotation.z = this.lerp(record.mesh.rotation.z, record.originalRotation.z, eased);
      record.mesh.scale.copy(record.originalScale).multiplyScalar(settle);
      this.setMeshOpacity(record.mesh, this.clamp(progress * 1.18, 0, 1));
    });

    this.renderer.render(this.scene, this.camera);

    if (elapsed > maxEnd + 1000) {
      this.finish();
      return;
    }

    this.frameId = window.requestAnimationFrame(() => this.animate());
  }

  handleResize() {
    if (!this.renderer || !this.camera || !this.canvasWrap) return;

    const width = Math.max(this.canvasWrap.clientWidth, 1);
    const height = Math.max(this.canvasWrap.clientHeight, 1);
    const mobile = width < 768;

    this.camera.aspect = width / height;
    this.camera.fov = mobile ? 42 : 36;
    this.camera.position.set(0, mobile ? 0.3 : 0.45, mobile ? 7.8 : 7.1);
    this.camera.lookAt(0, mobile ? 0.28 : 0.38, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    console.info('[AnatomyIntro] Camera and renderer updated.', {
      width,
      height,
      cameraPosition: this.camera.position.toArray()
    });
  }

  handleSkip() {
    this.finish();
  }

  handlePageHide() {
    this.destroy();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.setState('finished', 'Intro finished.');
    window.clearTimeout(this.errorTimer);
    window.cancelAnimationFrame(this.frameId);
    document.body.classList.remove('intro-lock');
    this.root.classList.add('is-hidden');
    this.root.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => this.destroy(), 760);
  }

  hideImmediately() {
    document.body.classList.remove('intro-lock');
    this.root.classList.add('is-hidden');
    this.root.setAttribute('aria-hidden', 'true');
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    window.clearTimeout(this.errorTimer);
    window.cancelAnimationFrame(this.frameId);
    this.skipButton?.removeEventListener('click', this.handleSkip);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pagehide', this.handlePageHide);
    document.body.classList.remove('intro-lock');
    this.disposeThreeOnly();
    this.records = [];
  }

  disposeThreeOnly() {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    if (this.scene) {
      this.disposeObject(this.scene);
      this.scene.clear();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.bodyGroup = null;
  }

  disposeObject(object) {
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) this.disposeMaterial(child.material);
    });
  }

  disposeMaterial(material) {
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((item) => {
      if (!item) return;
      Object.keys(item).forEach((key) => {
        const value = item[key];
        if (value && value.isTexture) value.dispose();
      });
      item.dispose();
    });
  }

  replaceMaterial(mesh, material) {
    if (mesh.material) this.disposeMaterial(mesh.material);
    mesh.material = material;
  }

  setMeshOpacity(mesh, progress) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!material) return;
      const finalOpacity = material.userData?.finalOpacity ?? material.opacity ?? 1;
      material.opacity = finalOpacity * progress;
      material.needsUpdate = true;
    });
  }

  cssColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return new THREE.Color(value || fallback);
  }

  setState(state, message) {
    this.root.dataset.state = state;
    if (this.status) this.status.textContent = message;
  }

  easeOutCubic(value) {
    return 1 - Math.pow(1 - this.clamp(value, 0, 1), 3);
  }

  lerp(start, end, progress) {
    return start + (end - start) * this.clamp(progress, 0, 1);
  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
}

const introRoot = document.getElementById('anatomyIntro');
if (introRoot) {
  new AnatomyIntro(introRoot).init();
}
