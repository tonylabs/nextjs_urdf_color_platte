"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";

type Props = {
  color: string;
};

function RobotJoint({ color }: Props) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  // Shared material props — slightly metallic so the color reads on different lighting.
  const matProps = {
    color,
    metalness: 0.35,
    roughness: 0.45,
  } as const;

  return (
    <group ref={groupRef} position={[0, -0.1, 0]}>
      {/* Lower arm segment */}
      <mesh position={[0, -0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 1.4, 0.5]} />
        <meshStandardMaterial {...matProps} />
      </mesh>

      {/* Lower yoke - left bracket */}
      <mesh position={[-0.35, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.6, 0.6]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Lower yoke - right bracket */}
      <mesh position={[0.35, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.6, 0.6]} />
        <meshStandardMaterial {...matProps} />
      </mesh>

      {/* Rotation pivot (horizontal cylinder) */}
      <mesh
        position={[0, 0.3, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.22, 0.22, 1.1, 32]} />
        <meshStandardMaterial {...matProps} />
      </mesh>

      {/* Upper arm — angled slightly to look articulated */}
      <group position={[0, 0.3, 0]} rotation={[0, 0, 0.35]}>
        <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 1.4, 0.45]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        {/* End cap / flange */}
        <mesh
          position={[0, 1.55, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.32, 0.32, 0.18, 32]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      </group>
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

      <RobotJoint color={color} />

      {/* Ground shadow catcher */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.65, 0]}
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
