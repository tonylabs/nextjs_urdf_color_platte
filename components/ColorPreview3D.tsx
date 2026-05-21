"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import type { BufferGeometry, Group } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  color: string;
};

const STL_URL = "/example.stl";

function StlModel({ color }: Props) {
  const groupRef = useRef<Group>(null);
  const geometry = useLoader(STLLoader, STL_URL) as BufferGeometry;

  // STLLoader returns a fresh geometry; make sure normals exist for smooth lighting.
  const prepared = useMemo(() => {
    const g = geometry.clone();
    g.center();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [geometry]);

  // Fit the model into a ~2-unit-tall view regardless of its native scale.
  const fitScale = useMemo(() => {
    const r = prepared.boundingSphere?.radius ?? 1;
    return r > 0 ? 1.4 / r : 1;
  }, [prepared]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        geometry={prepared}
        scale={fitScale}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
  );
}

export default function ColorPreview3D({ color }: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [3.2, 1.6, 3.4], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#0b0d10"]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />

      <Suspense fallback={null}>
        <Center disableY>
          <StlModel color={color} />
        </Center>
      </Suspense>

      {/* Ground shadow catcher */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.35} />
      </mesh>

      <Environment preset="city" />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  );
}
