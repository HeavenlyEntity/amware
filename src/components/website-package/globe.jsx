/* Ported unchanged from the studio template's components/services/globe.tsx
   (types stripped). Used only through ./globe-card, which lazy-loads it,
   passes no markers, and stops the rotation under reduced motion. */

'use client'
import React, { useRef, useMemo, useState, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
// Utility Functions
// ============================================================================
/**
 * Convert latitude/longitude to 3D cartesian coordinates
 */
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}
// ============================================================================
// Marker Component (static - rotation handled by parent group)
// ============================================================================
/** Legacy pin CSS size used with `distanceFactor` 10 before high-res pins */
const LEGACY_PIN_CSS_PX = 8
const HTML_DISTANCE_FACTOR_BASE = 10
function Marker({ marker, radius, markerPixelSize, onClick, onHover }) {
  const [hovered, setHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const groupRef = useRef(null)
  const imageGroupRef = useRef(null)
  const { camera, gl } = useThree()
  const pinPx = Math.max(16, marker.size ?? markerPixelSize)
  const htmlDistanceFactor = useMemo(
    () => HTML_DISTANCE_FACTOR_BASE * (LEGACY_PIN_CSS_PX / pinPx),
    [pinPx]
  )
  const pr = Math.min(gl.getPixelRatio(), 2)
  const rasterPx = Math.round(pinPx * pr)
  // Avatar sits just above the surface (no vertical pin)
  const avatarPosition = useMemo(() => {
    return latLngToVector3(marker.lat, marker.lng, radius * 1.01)
  }, [marker.lat, marker.lng, radius])
  // Check if marker is facing the camera
  useFrame(() => {
    if (!imageGroupRef.current) return
    // Get the world position of the image (the positioned element)
    const worldPos = new THREE.Vector3()
    imageGroupRef.current.getWorldPosition(worldPos)
    // Direction from globe center (0,0,0) to marker
    const markerDirection = worldPos.clone().normalize()
    // Direction from globe center to camera
    const cameraDirection = camera.position.clone().normalize()
    // Dot product: positive means facing camera, negative means behind
    const dot = markerDirection.dot(cameraDirection)
    // Show marker only if it's facing the camera (stricter threshold)
    setIsVisible(dot > 0.1)
  })
  const handlePointerEnter = useCallback(() => {
    setHovered(true)
    onHover?.(marker)
  }, [marker, onHover])
  const handlePointerLeave = useCallback(() => {
    setHovered(false)
    onHover?.(null)
  }, [onHover])
  const handleClick = useCallback(() => {
    onClick?.(marker)
  }, [marker, onClick])
  return (
    <group ref={groupRef} visible={isVisible}>
      {/* Circular avatar sitting on the globe surface */}
      <group ref={imageGroupRef} position={avatarPosition}>
        <Html
          transform
          center
          sprite
          distanceFactor={htmlDistanceFactor}
          style={{
            pointerEvents: isVisible ? 'auto' : 'none',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.15s ease-out',
          }}
        >
          <div
            className={cn(
              'relative cursor-pointer overflow-hidden rounded-full bg-neutral-900 shadow-lg transition-transform duration-200',
              hovered && 'scale-125 shadow-xl ring-1 ring-white/50'
            )}
            style={{
              width: pinPx,
              height: pinPx,
            }}
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
            onClick={handleClick}
          >
            <img
              src={marker.src}
              alt={marker.label || 'Marker'}
              width={rasterPx}
              height={rasterPx}
              className="absolute left-1/2 top-1/2 max-w-none object-cover"
              style={{
                width: rasterPx,
                height: rasterPx,
                transform: `translate(-50%, -50%) scale(${pinPx / rasterPx})`,
              }}
              draggable={false}
            />
          </div>
        </Html>
      </group>
    </group>
  )
}
function RotatingGlobe({ config, markers, onMarkerClick, onMarkerHover }) {
  const groupRef = useRef(null)
  // Load Earth textures
  const [earthTexture, bumpTexture] = useTexture([
    config.textureUrl,
    config.bumpMapUrl,
  ])
  // Configure textures
  useMemo(() => {
    if (earthTexture) {
      earthTexture.colorSpace = THREE.SRGBColorSpace
      earthTexture.anisotropy = 16
    }
    if (bumpTexture) {
      bumpTexture.anisotropy = 8
    }
  }, [earthTexture, bumpTexture])
  // Create geometries
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(config.radius, 64, 64)
  }, [config.radius])
  const wireframeGeometry = useMemo(() => {
    return new THREE.SphereGeometry(config.radius * 1.002, 32, 16)
  }, [config.radius])
  return (
    <group
      ref={groupRef}
      rotation={[config.initialRotation.x, config.initialRotation.y, 0]}
    >
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

      {/* Markers - now inside the rotating group */}
      {markers.map((marker, index) => (
        <Marker
          key={`marker-${index}-${marker.lat}-${marker.lng}`}
          marker={marker}
          radius={config.radius}
          markerPixelSize={config.markerPixelSize}
          onClick={onMarkerClick}
          onHover={onMarkerHover}
        />
      ))}
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
function Scene({ markers, config, onMarkerClick, onMarkerHover }) {
  const { camera } = useThree()
  // Set initial camera position (pulled back to accommodate markers)
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

      {/* Rotating Globe with Markers */}
      <RotatingGlobe
        config={config}
        markers={markers}
        onMarkerClick={onMarkerClick}
        onMarkerHover={onMarkerHover}
      />

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
  markerSize: 0.06,
  markerPixelSize: 48,
  showWireframe: false,
  wireframeColor: '#4a9eff',
  ambientIntensity: 1.2,
  pointLightIntensity: 2.2,
  backgroundColor: null,
}
export function Globe3D({
  markers = [],
  config = {},
  className,
  onMarkerClick,
  onMarkerHover,
}) {
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
        style={{
          background: mergedConfig.backgroundColor || 'transparent',
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene
            markers={markers}
            config={mergedConfig}
            onMarkerClick={onMarkerClick}
            onMarkerHover={onMarkerHover}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
