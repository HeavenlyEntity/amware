'use client'

/* eslint-disable react-hooks/immutability --
 * react-three-fiber mutates by design. `useThree` hands back the live renderer
 * objects, `useFrame` runs on the renderer's own requestAnimationFrame loop
 * outside React's render cycle, and driving uniforms from it is the entire
 * point of the hook. `react-hooks/immutability` models React rendering and
 * cannot see any of that; it reports the scene assignment and the uniform
 * writes as two entangled violations that swap places whenever either is
 * suppressed on its own, so the exemption is file-scoped.
 *
 * Scoped to THIS rule only, and this file is nothing but the WebGL crown, so
 * the blast radius is the component itself.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useReducedMotion } from '@/components/AccessibilityProvider'

/* The AMWARE crown as teal glass. A procedural room environment gives the
   transmission something to refract; hovering fades in a holographic
   emissive layer (screen-space rainbow banded by raster scanlines)
   injected into the physical material via onBeforeCompile. Rendering
   pauses offscreen; reduced motion gets a single static frame. */

const MODEL_URL = '/models/amware-crown.glb'

/* A custom dark studio: black void with a few emissive panels, so the
   glass picks up crisp teal and white highlights instead of the bright
   white wash three's RoomEnvironment produces. */
function makeDarkStudioScene() {
  const scene = new THREE.Scene()
  const addPanel = (color, intensity, w, h, position, rotation) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      })
    )
    mesh.position.set(...position)
    mesh.rotation.set(...rotation)
    scene.add(mesh)
    return mesh
  }
  // Narrow white key overhead: sharp specular streaks, not a wash.
  addPanel('#ffffff', 5, 4, 0.8, [0, 4, 1], [Math.PI / 2, 0, 0])
  // Teal wings left and right so refractions carry the accent.
  addPanel('#3ce8ce', 4, 2.5, 5, [-5, 0, 0], [0, Math.PI / 2, 0])
  addPanel('#0d9488', 2.5, 2.5, 5, [5, 0, 0], [0, -Math.PI / 2, 0])
  // Faint low fill so downward faces never go fully black.
  addPanel('#134e4a', 1.2, 8, 1.5, [0, -3.5, 2], [-Math.PI / 3, 0, 0])
  return scene
}

function Environment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const studio = makeDarkStudioScene()
    const env = pmrem.fromScene(studio, 0.06).texture
    scene.environment = env
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function makeGlassMaterial(holoUniforms) {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#5eead4'),
    metalness: 0,
    roughness: 0.08,
    transmission: 1,
    thickness: 0.7,
    ior: 1.45,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    attenuationColor: new THREE.Color('#14b8a6'),
    attenuationDistance: 0.9,
    iridescenceIOR: 1.3,
    envMapIntensity: 1.1,
    // Faint self-light keeps the silhouette readable on the near-black
    // hero without washing the glass back to white.
    emissive: new THREE.Color('#052e2a'),
    emissiveIntensity: 0.9,
  })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHolo = holoUniforms.uHolo
    shader.uniforms.uTime = holoUniforms.uTime
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uHolo;
         uniform float uTime;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         {
           // Holographic sweep: screen-space rainbow, rasterized into
           // scanlines with a faint refresh flicker.
           vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (
             gl_FragCoord.y * 0.006 + uTime * 0.35 + vec3(0.0, 0.33, 0.67)
           ));
           float scan = 0.55 + 0.45 * step(0.5, fract(gl_FragCoord.y / 4.0));
           float flicker = 0.9 + 0.1 * sin(uTime * 32.0);
           totalEmissiveRadiance += rainbow * scan * flicker * uHolo * 0.6;
         }`
      )
  }
  return material
}

function Crown({ animate, reduce }) {
  const groupRef = useRef(null)
  const holoRef = useRef(0)
  const [hovered, setHovered] = useState(false)
  const gltf = useLoader(GLTFLoader, MODEL_URL)

  const holoUniforms = useMemo(
    () => ({ uHolo: { value: 0 }, uTime: { value: 0 } }),
    []
  )

  const scene = useMemo(() => {
    const s = gltf.scene
    const glass = makeGlassMaterial(holoUniforms)
    s.traverse((child) => {
      if (child.isMesh) child.material = glass
    })
    const box = new THREE.Box3().setFromObject(s)
    const center = box.getCenter(new THREE.Vector3())
    s.position.sub(center)
    return s
  }, [gltf, holoUniforms])

  /* The surrounding component owns navigation and its accessible link. */

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group || !animate) return
    const holoTarget = hovered ? 1 : 0
    holoRef.current += (holoTarget - holoRef.current) * Math.min(1, delta * 6)
    holoUniforms.uHolo.value = holoRef.current
    holoUniforms.uTime.value = state.clock.elapsedTime

    // The hologram spins the crown up a touch while it is active.
    group.rotation.y += delta * (0.35 + holoRef.current * 0.55)
    group.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.06
  })

  return (
    <group
      ref={groupRef}
      rotation={[0.15, -0.4, 0]}
      scale={1.5}
      onPointerOver={reduce ? undefined : () => setHovered(true)}
      onPointerOut={reduce ? undefined : () => setHovered(false)}
    >
      <primitive object={scene} />
    </group>
  )
}

export default function AmwareCrown3d({ className }) {
  const hostRef = useRef(null)
  const [visible, setVisible] = useState(true)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = hostRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.05 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const animate = !reduce && visible

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={animate ? 'always' : 'demand'}
      >
        <Environment />
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 4, 5]} intensity={0.7} />
        <pointLight position={[-3, -2, 2]} intensity={0.8} color="#3ce8ce" />
        <Suspense fallback={null}>
          <Crown animate={animate} reduce={reduce} />
        </Suspense>
      </Canvas>
    </div>
  )
}
