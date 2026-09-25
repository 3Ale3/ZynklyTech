import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function NeuralNetworkBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.018);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 19);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0xffffff, 1);
    mount.appendChild(renderer.domElement);

    // ---------- Textura de resplandor ----------
    function makeGlowTexture() {
      const size = 128;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(255,255,255,0.7)");
      g.addColorStop(0.6, "rgba(255,255,255,0.12)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(c);
    }
    const glowTex = makeGlowTexture();

    // ---------- Grupo principal: la red ----------
    const network = new THREE.Group();
    scene.add(network);

    const RADIUS = 6.2;
    const icoGeo = new THREE.IcosahedronGeometry(RADIUS, 1);

    const nodesGeo = new THREE.BufferGeometry();
    nodesGeo.setAttribute("position", icoGeo.attributes.position.clone());
    const nodesMat = new THREE.PointsMaterial({
      size: 0.42,
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      color: 0x000000,
      opacity: 0.9,
    });
    network.add(new THREE.Points(nodesGeo, nodesMat));

    const wireGeo = new THREE.WireframeGeometry(icoGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.16,
    });
    network.add(new THREE.LineSegments(wireGeo, wireMat));

    const wirePos = wireGeo.attributes.position;
    const edges = [];
    for (let i = 0; i < wirePos.count; i += 2) {
      edges.push([
        new THREE.Vector3(wirePos.getX(i), wirePos.getY(i), wirePos.getZ(i)),
        new THREE.Vector3(wirePos.getX(i + 1), wirePos.getY(i + 1), wirePos.getZ(i + 1)),
      ]);
    }

    // Núcleo central
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.9, wireframe: true })
    );
    network.add(core);

    const coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x000000,
        transparent: true,
        blending: THREE.NormalBlending,
        opacity: 0.6,
        depthWrite: false,
      })
    );
    coreGlow.scale.set(3.2, 3.2, 1);
    network.add(coreGlow);

    // ---------- Pulsos de señal sobre las aristas ----------
    const PULSE_COUNT = 34;
    const pulses = [];
    for (let i = 0; i < PULSE_COUNT; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0x000000,
          transparent: true,
          blending: THREE.NormalBlending,
          depthWrite: false,
          opacity: 0.95,
        })
      );
      sprite.scale.set(0.5, 0.5, 1);
      network.add(sprite);
      pulses.push({
        sprite,
        edge: edges[Math.floor(Math.random() * edges.length)],
        t: Math.random(),
        speed: 0.18 + Math.random() * 0.35,
        pause: 0,
      });
    }

    // ---------- Cometas: señales entrantes ----------
    const COMET_COUNT = 10;
    const comets = [];
    function resetComet(comet) {
      const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      comet.start.copy(dir).multiplyScalar(24 + Math.random() * 10);
      const targetDir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      comet.end.copy(targetDir).multiplyScalar(RADIUS);
      comet.t = 0;
      comet.duration = 1.6 + Math.random() * 1.6;
      comet.delay = Math.random() * 4;
    }
    for (let i = 0; i < COMET_COUNT; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0x000000,
          transparent: true,
          blending: THREE.NormalBlending,
          depthWrite: false,
          opacity: 0,
        })
      );
      sprite.scale.set(0.9, 0.9, 1);
      network.add(sprite);
      const comet = { sprite, start: new THREE.Vector3(), end: new THREE.Vector3(), t: 0, duration: 2, delay: 0 };
      resetComet(comet);
      comets.push(comet);
    }

    // ---------- Campo de estrellas ----------
    const STAR_COUNT = 700;
    const starGeo = new THREE.BufferGeometry();
    const starArr = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 40 + Math.random() * 90;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starArr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starArr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starArr[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starArr, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ size: 0.12, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })
    );
    scene.add(stars);

    // ---------- Interacción con el ratón ----------
    const mouse = { x: 0, y: 0 };
    const mouseTarget = { x: 0, y: 0 };
    function onMouseMove(e) {
      const rect = mount.getBoundingClientRect();
      mouseTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseTarget.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    }
    mount.addEventListener("mousemove", onMouseMove);

    // ---------- Bucle de animación ----------
    const clock = new THREE.Clock();
    let baseRotationY = 0;
    let rafId;

    function animate() {
      rafId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      mouse.x += (mouseTarget.x - mouse.x) * 0.03;
      mouse.y += (mouseTarget.y - mouse.y) * 0.03;
      baseRotationY += delta * 0.055;
      network.rotation.y = baseRotationY;
      network.rotation.x = mouse.y * 0.18;
      network.rotation.z = mouse.x * 0.06;

      const pulseScale = 3.0 + Math.sin(elapsed * 1.4) * 0.4;
      coreGlow.scale.set(pulseScale, pulseScale, 1);
      core.rotation.y += delta * 0.4;
      core.rotation.x += delta * 0.25;

      pulses.forEach((p) => {
        if (p.pause > 0) {
          p.pause -= delta;
        } else {
          p.t += delta * p.speed;
          if (p.t >= 1) {
            p.t = 0;
            p.pause = Math.random() * 1.2;
            p.edge = edges[Math.floor(Math.random() * edges.length)];
          }
        }
        const pos = new THREE.Vector3().lerpVectors(p.edge[0], p.edge[1], p.t);
        p.sprite.position.copy(pos);
        const fade = Math.sin(p.t * Math.PI);
        p.sprite.material.opacity = 0.15 + fade * 0.85;
        p.sprite.scale.setScalar(0.28 + fade * 0.35);
      });

      comets.forEach((c) => {
        if (c.delay > 0) {
          c.delay -= delta;
          c.sprite.material.opacity = 0;
          return;
        }
        c.t += delta / c.duration;
        if (c.t >= 1) {
          resetComet(c);
          return;
        }
        const pos = new THREE.Vector3().lerpVectors(c.start, c.end, c.t);
        c.sprite.position.copy(pos);
        const fadeIn = Math.min(c.t * 4, 1);
        const fadeOut = 1 - Math.pow(c.t, 3);
        c.sprite.material.opacity = fadeIn * fadeOut * 0.9;
      });

      stars.rotation.y += delta * 0.004;
      stars.rotation.x += delta * 0.002;

      camera.position.x = Math.sin(elapsed * 0.05) * 1.5;
      camera.position.y = Math.cos(elapsed * 0.04) * 1.0;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("mousemove", onMouseMove);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-screen bg-white relative overflow-hidden" />;
}
