"use client";

/* Lluvia de monedas de oro + brasas ambientales. Solo capa visual; sin órbita. */
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function CoinRain() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let frame = 0;

    try {
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x050608, 5, 20);

      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 10;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.1));
      const keyLight = new THREE.DirectionalLight(0xffdf9b, 2.5);
      keyLight.position.set(0, 10, 5);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(0xa9c7ff, 1.5, 30);
      rimLight.position.set(0, 0, -5);
      scene.add(rimLight);

      const rainGroup = new THREE.Group();
      scene.add(rainGroup);

      const rainMat = new THREE.MeshStandardMaterial({
        color: 0xd9a92c,
        metalness: 0.85,
        roughness: 0.18,
        transparent: true,
        opacity: 0.45,
      });
      const rainGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.03, 16);
      const rainCoins: THREE.Mesh[] = [];

      for (let i = 0; i < 70; i++) {
        const coin = new THREE.Mesh(rainGeo, rainMat);
        coin.rotation.x = Math.PI / 2;
        coin.position.set(
          (Math.random() - 0.5) * 22,
          Math.random() * 16 - 2,
          -2 - Math.random() * 6,
        );
        coin.userData = {
          fallSpeed: 0.012 + Math.random() * 0.03,
          rotSpeed: 0.02 + Math.random() * 0.05,
        };
        rainGroup.add(coin);
        rainCoins.push(coin);
      }

      const bokehMat = new THREE.MeshStandardMaterial({
        color: 0xe8b83a,
        metalness: 0.9,
        roughness: 0.25,
        transparent: true,
        opacity: 0.18,
      });
      for (let i = 0; i < 7; i++) {
        const size = 0.5 + Math.random() * 0.6;
        const bokehGeo = new THREE.CylinderGeometry(size, size, 0.06, 24);
        const coin = new THREE.Mesh(bokehGeo, bokehMat);
        coin.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        coin.position.set(
          (Math.random() - 0.5) * 24,
          Math.random() * 18 - 4,
          -0.2 - Math.random() * 1.6,
        );
        coin.userData = {
          fallSpeed: 0.004 + Math.random() * 0.008,
          rotSpeed: 0.004 + Math.random() * 0.006,
        };
        rainGroup.add(coin);
        rainCoins.push(coin);
      }

      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = 256;
      glowCanvas.height = 256;
      const gctx = glowCanvas.getContext("2d");
      if (gctx) {
        const grad = gctx.createRadialGradient(128, 128, 10, 128, 128, 128);
        grad.addColorStop(0, "rgba(217,169,44,0.5)");
        grad.addColorStop(0.4, "rgba(217,169,44,0.16)");
        grad.addColorStop(1, "rgba(217,169,44,0)");
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, 256, 256);
      }
      const glowTex = new THREE.CanvasTexture(glowCanvas);
      const glowSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      glowSprite.scale.set(15, 10, 1);
      glowSprite.position.set(0.5, 0.8, -1.5);
      scene.add(glowSprite);

      const dustGeo = new THREE.BufferGeometry();
      const dustCount = 60;
      const dustPos = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 24;
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
        dustPos[i * 3 + 2] = -1 - Math.random() * 7;
      }
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      const dustMat = new THREE.PointsMaterial({
        color: 0xf2cc6a,
        size: 0.06,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const dust = new THREE.Points(dustGeo, dustMat);
      scene.add(dust);

      const onResize = () => {
        const w = mount.clientWidth || window.innerWidth;
        const h = mount.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer?.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      const animate = () => {
        frame = requestAnimationFrame(animate);
        const time = Date.now();

        for (const coin of rainCoins) {
          const d = coin.userData as { fallSpeed: number; rotSpeed: number };
          coin.position.y -= d.fallSpeed;
          coin.rotation.x += d.rotSpeed;
          coin.rotation.z += d.rotSpeed * 0.5;
          if (coin.position.y < -8) {
            coin.position.y = 10;
            coin.position.x = (Math.random() - 0.5) * 20;
          }
        }

        dust.rotation.y += 0.0003;
        void time;
        renderer?.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", onResize);
        renderer?.dispose();
        if (renderer?.domElement.parentElement === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    } catch {
      return undefined;
    }
  }, []);

  return <div ref={mountRef} className="coin-rain" aria-hidden="true" />;
}