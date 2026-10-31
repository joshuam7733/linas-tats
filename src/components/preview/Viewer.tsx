'use client';

import { CameraControls, CameraControlsImpl, ContactShadows, Environment, Lightformer, useGLTF } from '@react-three/drei';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import * as THREE from 'three';
import type { AreaId, BodyId, Placement } from '@/lib/concept';
import { BodySurface, bakeGeometry, buildDecalGeometry, decalBasis } from '@/lib/surface';
import { BODIES, CLOTHING_GLSL, type CameraView } from './bodies';

export type { CameraView };

export interface ViewerApi {
  /** Finds the skin point for a named area and (optionally) frames the camera on it. */
  placeAtArea(area: AreaId, frame?: boolean): Placement | null;
  setView(view: CameraView): void;
  /** Moves the camera to look squarely at a placed tattoo. */
  frame(placement: Placement): void;
  /** Slides a placement across the skin by the given centimetres (x: right, y: up). */
  nudge(placement: Placement, dxCm: number, dyCm: number, rotation: number): Placement | null;
  rotate(azimuthDeg: number, polarDeg: number): void;
  zoom(factor: number): void;
  /** Renders the current view and returns it as a PNG data URL. */
  capture(): string | null;
}

interface ViewerProps {
  apiRef: Ref<ViewerApi | null>;
  body: BodyId;
  skinColor: string;
  tattoo: { texture: THREE.Texture; aspect: number } | null;
  placement: Placement | null;
  sizeCm: number;
  rotation: number;
  reducedMotion: boolean;
  onPlace(placement: Placement): void;
  onReady(body: BodyId): void;
}

type ClothUniforms = {
  uShorts: { value: THREE.Vector4 };
  uTop: { value: THREE.Vector4 };
  uFrame: { value: THREE.Vector3 };
};

function createClothUniforms(): ClothUniforms {
  return { uShorts: { value: new THREE.Vector4() }, uTop: { value: new THREE.Vector4() }, uFrame: { value: new THREE.Vector3() } };
}

function applyClothing(uniforms: ClothUniforms, body: BodyId) {
  const { shorts, top, frame } = BODIES[body].clothing;
  uniforms.uShorts.value.set(...shorts);
  uniforms.uTop.value.set(...top);
  uniforms.uFrame.value.set(...frame);
}

function createSkinMaterial(cloth: ClothUniforms) {
  const material = new THREE.MeshPhysicalMaterial({
    roughness: 0.56,
    metalness: 0,
    sheen: 0.3,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#ffd2b8'),
  });
  // Garments are painted in body space, so the body stays one clean surface and tattoos can respect them.
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cloth, { uFabric: { value: new THREE.Color('#141414') } });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBodyPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBodyPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vBodyPos;\nuniform vec3 uFabric;\n${CLOTHING_GLSL}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float fabricMask = clothMask(vBodyPos);
diffuseColor.rgb = mix(diffuseColor.rgb, uFabric * (1.0 + 0.9 * clothTrim(vBodyPos)), fabricMask);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.9, fabricMask);',
      );
  };
  return material;
}

function createInkMaterial(cloth: ClothUniforms) {
  const material = new THREE.MeshStandardMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    roughness: 0.6,
    metalness: 0,
    opacity: 0.94,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cloth);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float facing;\nvarying float vFacing;\nvarying vec3 vBodyPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFacing = facing;\nvBodyPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vFacing;\nvarying vec3 vBodyPos;\n${CLOTHING_GLSL}`)
      .replace(
        '#include <alphamap_fragment>',
        // Fade where the skin turns away from the projector, and never draw on top of clothing.
        '#include <alphamap_fragment>\ndiffuseColor.a *= smoothstep(0.16, 0.5, vFacing) * (1.0 - clothMask(vBodyPos));',
      );
  };
  return material;
}

interface BodyHandle {
  mesh: THREE.Mesh | null;
  surface: BodySurface | null;
}

function Body({
  body,
  material,
  onPlace,
  onSurface,
  handle,
}: {
  body: BodyId;
  material: THREE.Material;
  onPlace(p: Placement): void;
  onSurface(surface: BodySurface | null, body: BodyId): void;
  handle: React.RefObject<BodyHandle>;
}) {
  const gltf = useGLTF(BODIES[body].url, false, true);
  const meshRef = useRef<THREE.Mesh>(null);

  // The largest mesh is the skin (tattoos go there); small helper parts such as nails and lips are drawn too.
  const { geometry, helpers, surface } = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });
    if (!meshes.length) throw new Error('Body model contains no mesh');
    meshes.sort((a, b) => b.geometry.getAttribute('position').count - a.geometry.getAttribute('position').count);
    const [skin, ...rest] = meshes.map((m) => bakeGeometry(m.geometry, m.matrixWorld));
    return { geometry: skin, helpers: rest, surface: new BodySurface(skin) };
  }, [gltf]);

  useEffect(() => {
    handle.current.mesh = meshRef.current;
    handle.current.surface = surface;
    onSurface(surface, body);
    return () => {
      handle.current.mesh = null;
      handle.current.surface = null;
      onSurface(null, body);
    };
  }, [surface, handle, onSurface, body]);

  useEffect(
    () => () => {
      geometry.dispose();
      helpers.forEach((g) => g.dispose());
    },
    [geometry, helpers],
  );

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // Ignore the click that ends a drag-to-rotate gesture.
    if (e.delta > 6) return;
    e.stopPropagation();
    const hitNormal = (e as unknown as { normal?: THREE.Vector3 }).normal ?? e.face?.normal;
    if (!hitNormal) return;
    const towardsCamera = e.ray.direction.clone().negate();
    const hint = hitNormal.clone();
    if (hint.dot(towardsCamera) < 0) hint.negate();
    const normal = surface.averageNormal(e.point, hint);
    onPlace({ point: e.point.toArray() as Placement['point'], normal: normal.toArray() as Placement['normal'], area: 'custom' });
  };

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={handleClick}
        onPointerOver={() => (document.body.style.cursor = 'crosshair')}
        onPointerOut={() => (document.body.style.cursor = '')}
      />
      {helpers.map((g) => (
        <mesh key={g.uuid} geometry={g} material={material} />
      ))}
    </>
  );
}

function Decal({
  surface,
  material,
  tattoo,
  placement,
  sizeCm,
  rotation,
}: {
  surface: BodySurface | null;
  material: THREE.MeshStandardMaterial;
  tattoo: ViewerProps['tattoo'];
  placement: Placement | null;
  sizeCm: number;
  rotation: number;
}) {
  const invalidate = useThree((s) => s.invalidate);

  const geometry = useMemo(() => {
    if (!surface || !tattoo || !placement) return null;
    const size = sizeCm / 100;
    const width = tattoo.aspect >= 1 ? size : size * tattoo.aspect;
    const height = tattoo.aspect >= 1 ? size / tattoo.aspect : size;
    return buildDecalGeometry(surface, new THREE.Vector3(...placement.point), new THREE.Vector3(...placement.normal), width, height, rotation);
  }, [surface, tattoo, placement, sizeCm, rotation]);

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => {
    material.map = tattoo?.texture ?? null;
    material.needsUpdate = true;
    invalidate();
  }, [material, tattoo, invalidate]);

  if (!geometry) return null;
  return <mesh geometry={geometry} material={material} renderOrder={2} />;
}

function Bridge({
  apiRef,
  body,
  controls,
  handle,
  reducedMotion,
}: {
  apiRef: Ref<ViewerApi | null>;
  body: BodyId;
  controls: React.RefObject<CameraControlsImpl | null>;
  handle: React.RefObject<BodyHandle>;
  reducedMotion: boolean;
}) {
  const { gl, scene, camera, invalidate } = useThree();
  const spec = BODIES[body];

  useImperativeHandle(
    apiRef,
    (): ViewerApi => {
      const raycaster = new THREE.Raycaster();
      const smooth = !reducedMotion;

      const castOnto = (origin: THREE.Vector3, dir: THREE.Vector3) => {
        const mesh = handle.current.mesh;
        if (!mesh) return null;
        raycaster.set(origin, dir.clone().normalize());
        return raycaster.intersectObject(mesh, false)[0] ?? null;
      };

      return {
        placeAtArea(area, frame = true) {
          const ray = spec.areas[area];
          const surface = handle.current.surface;
          const hit = castOnto(new THREE.Vector3(...ray.origin), new THREE.Vector3(...ray.dir));
          if (!hit || !surface) return null;
          const hint = new THREE.Vector3(...ray.dir).negate().normalize();
          const normal = surface.averageNormal(hit.point, hint);
          const camDir = new THREE.Vector3(...ray.camera).normalize();
          const eye = hit.point.clone().addScaledVector(camDir, ray.distance);
          if (frame) void controls.current?.setLookAt(eye.x, eye.y, eye.z, hit.point.x, hit.point.y, hit.point.z, smooth);
          return { point: hit.point.toArray() as Placement['point'], normal: normal.toArray() as Placement['normal'], area };
        },
        setView(view) {
          const v = spec.views[view];
          void controls.current?.setLookAt(...v.position, ...v.target, smooth);
        },
        frame(placement) {
          const point = new THREE.Vector3(...placement.point);
          const ray = placement.area !== 'custom' ? spec.areas[placement.area] : null;
          const dir = ray ? new THREE.Vector3(...ray.camera).normalize() : new THREE.Vector3(...placement.normal).setY(placement.normal[1] + 0.1).normalize();
          const eye = point.clone().addScaledVector(dir, ray?.distance ?? 0.75);
          void controls.current?.setLookAt(eye.x, eye.y, eye.z, point.x, point.y, point.z, smooth);
        },
        nudge(placement, dxCm, dyCm, rotation) {
          const surface = handle.current.surface;
          if (!surface) return null;
          const point = new THREE.Vector3(...placement.point);
          const normal = new THREE.Vector3(...placement.normal);
          const { x, y } = decalBasis(normal, rotation);
          const target = point.clone().addScaledVector(x, dxCm / 100).addScaledVector(y, dyCm / 100);
          const hit = castOnto(target.clone().addScaledVector(normal, 0.06), normal.clone().negate());
          if (!hit || hit.point.distanceTo(target) > 0.05) return null;
          const nextNormal = surface.averageNormal(hit.point, normal);
          return { point: hit.point.toArray() as Placement['point'], normal: nextNormal.toArray() as Placement['normal'], area: placement.area };
        },
        rotate(azimuthDeg, polarDeg) {
          void controls.current?.rotate(THREE.MathUtils.degToRad(azimuthDeg), THREE.MathUtils.degToRad(polarDeg), smooth);
        },
        zoom(factor) {
          const c = controls.current;
          if (!c) return;
          void c.dollyTo(THREE.MathUtils.clamp(c.distance * factor, c.minDistance, c.maxDistance), smooth);
        },
        capture() {
          try {
            // Finish any camera transition so the snapshot matches where the view is heading.
            controls.current?.update(10);
            // Render the snapshot at a higher resolution than the on-screen canvas, then restore.
            const previous = gl.getPixelRatio();
            const cssWidth = gl.domElement.clientWidth || 500;
            gl.setPixelRatio(THREE.MathUtils.clamp(1400 / cssWidth, previous, 3));
            gl.render(scene, camera);
            const url = gl.domElement.toDataURL('image/png');
            gl.setPixelRatio(previous);
            gl.render(scene, camera);
            return url;
          } catch {
            return null;
          }
        },
      };
    },
    [gl, scene, camera, controls, handle, reducedMotion, spec],
  );

  // Runs once the canvas has mounted its children, so the controls exist.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.mouseButtons.right = CameraControlsImpl.ACTION.NONE;
    c.mouseButtons.middle = CameraControlsImpl.ACTION.NONE;
    c.mouseButtons.wheel = CameraControlsImpl.ACTION.DOLLY;
    c.touches.one = CameraControlsImpl.ACTION.TOUCH_ROTATE;
    c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY;
    c.touches.three = CameraControlsImpl.ACTION.NONE;
  }, [controls]);

  // Frame the whole body whenever the body changes (and on first mount).
  useEffect(() => {
    const v = BODIES[body].views.front;
    void controls.current?.setLookAt(...v.position, ...v.target, false);
    invalidate();
  }, [body, controls, invalidate]);

  return null;
}

export default function Viewer(props: ViewerProps) {
  const { apiRef, body, skinColor, tattoo, placement, sizeCm, rotation, reducedMotion, onPlace, onReady } = props;
  const controls = useRef<CameraControlsImpl>(null);
  const handle = useRef<BodyHandle>({ mesh: null, surface: null });
  const [surface, setSurface] = useState<BodySurface | null>(null);

  const cloth = useMemo(createClothUniforms, []);
  const skin = useMemo(() => createSkinMaterial(cloth), [cloth]);
  const ink = useMemo(() => createInkMaterial(cloth), [cloth]);
  useEffect(
    () => () => {
      skin.dispose();
      ink.dispose();
    },
    [skin, ink],
  );

  useEffect(() => {
    applyClothing(cloth, body);
  }, [cloth, body]);

  useEffect(() => {
    skin.color.set(skinColor);
  }, [skin, skinColor]);

  const onSurface = useMemo(
    () => (next: BodySurface | null, forBody: BodyId) => {
      setSurface(next);
      if (next) onReady(forBody);
    },
    [onReady],
  );

  return (
    <Canvas
      camera={{ fov: 30, position: BODIES[body].views.front.position, near: 0.05, far: 40 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop="demand"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Invalidate deps={[skinColor, body]} />
      <hemisphereLight args={['#f4ece2', '#17120f', 0.5]} />
      <directionalLight position={[2.5, 4, 3]} intensity={2.3} color="#fff0de" />
      <directionalLight position={[-3, 2, 1.5]} intensity={0.5} color="#e6ecf4" />
      <directionalLight position={[0, 3, -4]} intensity={1.4} color="#f6e7d2" />
      <Environment resolution={128} frames={1} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={2} position={[0, 3, 3]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1} position={[-4, 1, 0]} rotation-y={Math.PI / 2} scale={[3, 3, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[4, 1.5, -2]} rotation-y={-Math.PI / 2} scale={[3, 3, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <Body key={`body-${body}`} body={body} material={skin} onPlace={onPlace} onSurface={onSurface} handle={handle} />
        <Decal surface={surface} material={ink} tattoo={tattoo} placement={placement} sizeCm={sizeCm} rotation={rotation} />
        <ContactShadows key={`shadow-${body}`} position={[0, 0.001, 0]} scale={2.6} resolution={512} blur={2.4} opacity={0.55} far={1.2} frames={1} color="#000000" />
      </Suspense>

      <CameraControls
        ref={controls}
        makeDefault
        minDistance={0.35}
        maxDistance={5.5}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI - 0.35}
        smoothTime={reducedMotion ? 0 : 0.45}
        draggingSmoothTime={reducedMotion ? 0 : 0.12}
        dollySpeed={0.6}
        dollyToCursor
      />
      <Bridge apiRef={apiRef} body={body} controls={controls} handle={handle} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

/** Requests a new frame when any dependency changes (the canvas only renders on demand). */
function Invalidate({ deps }: { deps: unknown[] }) {
  const invalidate = useThree((s) => s.invalidate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => invalidate(), deps);
  return null;
}

useGLTF.preload(BODIES.man.url, false, true);
useGLTF.preload(BODIES.woman.url, false, true);
