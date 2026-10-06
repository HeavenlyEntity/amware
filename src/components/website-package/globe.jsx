/* Ported from the studio template's components/services/globe.tsx with types
   stripped, city markers removed, and texture setup moved into useTexture's
   onLoad callback. Used only through ./globe-card, which lazy-loads it,
   passes no markers, and stops the rotation under reduced motion. */

'use client'
import React, { useMemo, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { cn } from '@/lib/utils'
// ============================================================================
// Constants - Earth Texture URLs (NASA Blue Marble)
// ============================================================================
const DEFAULT_EARTH_TEXTURE =
  'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg'
const DEFAULT_BUMP_TEXTURE =
  'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png'
// ============================================================================
// RotatingGlobe Component
// ============================================================================
function RotatingGlobe({ config }) {
  // Load Earth textures and configure them in the onLoad callback
  const [earthTexture, bumpTexture] = useTexture(
    [config.textureUrl, config.bumpMapUrl],
    (loaded) => {
      const [earth, bump] = Array.isArray(loaded) ? loaded : [loaded, null]
      if (earth) {
        earth.colorSpace = THREE.SRGBColorSpace
        earth.anisotropy = 16
      }
      if (bump) {
        bump.anisotropy = 8
      }
    }
  )
  // Create geometries
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(config.radius, 64, 64)
  }, [config.radius])
  const wireframeGeometry = useMemo(() => {
    return new THREE.SphereGeometry(config.radius * 1.002, 32, 16)
  }, [config.radius])
  return (
    <group rotation={[config.initialRotation.x, config.initialRotation.y, 0]}>
      {/* Main globe mesh with Earth texture */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          map={earthTexture}
          bumpMap={bumpTexture}
          bumpScale={config.bumpScale * 0.05}
          roughness={0.55}
          metalness={0.0}
          emissive={new THREE.Color('#ffffff')}
          emissiveMap={earthTexture}
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Wireframe overlay */}
      {config.showWireframe && (
        <mesh geometry={wireframeGeometry}>
          <meshBasicMaterial
            color={config.wireframeColor}
            wireframe
            transparent
            opacity={0.08}
          />
        </mesh>
      )}
    </group>
  )
}
function Atmosphere({ radius, color, intensity, blur }) {
  // blur controls the fresnel exponent: lower = more diffuse, higher = sharper edge
  // We invert it so higher blur value = more diffuse (lower exponent)
  const fresnelPower = Math.max(0.5, 5 - blur)
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        atmosphereColor: { value: new THREE.Color(color) },
        intensity: { value: intensity },
        fresnelPower: { value: fresnelPower },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 atmosphereColor;
        uniform float intensity;
        uniform float fresnelPower;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, normalize(-vPosition))), fresnelPower);
          gl_FragColor = vec4(atmosphereColor, fresnel * intensity);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
  }, [color, intensity, fresnelPower])
  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[radius, 64, 32]} />
      <primitive object={atmosphereMaterial} attach="material" />
    </mesh>
  )
}
function Scene({ config }) {
  const { camera } = useThree()
  // Set initial camera position
  React.useEffect(() => {
    camera.position.set(0, 0, config.radius * 3.5)
    camera.lookAt(0, 0, 0)
  }, [camera, config.radius])
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={config.ambientIntensity} />
      <directionalLight
        position={[config.radius * 5, config.radius * 2, config.radius * 5]}
        intensity={config.pointLightIntensity}
        color="#ffffff"
      />
      <directionalLight
        position={[-config.radius * 3, config.radius, -config.radius * 2]}
        intensity={config.pointLightIntensity * 0.6}
        color="#88ccff"
      />
      {/* Hemisphere light fills shadows so the dark side stays readable */}
      <hemisphereLight args={['#ffffff', '#1a1a2e', 0.8]} />

      {/* Rotating Globe */}
      <RotatingGlobe config={config} />

      {/* Atmosphere (static) */}
      {config.showAtmosphere && (
        <Atmosphere
          radius={config.radius}
          color={config.atmosphereColor}
          intensity={config.atmosphereIntensity}
          blur={config.atmosphereBlur}
        />
      )}

      {/* Controls */}
      <OrbitControls
        makeDefault
        enablePan={config.enablePan}
        enableZoom={config.enableZoom}
        minDistance={config.minDistance}
        maxDistance={config.maxDistance}
        rotateSpeed={0.4}
        autoRotate={config.autoRotateSpeed > 0}
        autoRotateSpeed={config.autoRotateSpeed}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  )
}
// ============================================================================
// Loading Fallback
// ============================================================================
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex shrink-0 flex-col items-center gap-3">
        <span className="inline-block shrink-0 text-sm text-neutral-400">
          Loading globe...
        </span>
      </div>
    </Html>
  )
}
// ============================================================================
// Main Globe3D Component
// ============================================================================
const defaultConfig = {
  radius: 2,
  globeColor: '#1a1a2e',
  textureUrl: DEFAULT_EARTH_TEXTURE,
  bumpMapUrl: DEFAULT_BUMP_TEXTURE,
  showAtmosphere: false,
  atmosphereColor: '#4da6ff',
  atmosphereIntensity: 0.5,
  atmosphereBlur: 2,
  bumpScale: 1,
  autoRotateSpeed: 0.3,
  enableZoom: false,
  enablePan: false,
  minDistance: 5,
  maxDistance: 15,
  initialRotation: { x: 0.15, y: 1.8 },
  showWireframe: false,
  wireframeColor: '#4a9eff',
  ambientIntensity: 1.2,
  pointLightIntensity: 2.2,
  backgroundColor: null,
}
export function Globe3D({ config = {}, className }) {
  const mergedConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  )
  return (
    <div className={cn('relative h-[500px] w-full', className)}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        camera={{
          fov: 45,
          near: 0.1,
          far: 1000,
          position: [0, 0, mergedConfig.radius * 3.5],
        }}
        frameloop={mergedConfig.autoRotateSpeed > 0 ? 'always' : 'demand'}
        style={{
          background: mergedConfig.backgroundColor || 'transparent',
          pointerEvents: 'none',
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene config={mergedConfig} />
        </Suspense>
      </Canvas>
    </div>
  )
}
