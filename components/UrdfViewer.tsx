"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import URDFLoader from "urdf-loader";
import type { URDFLink, URDFRobot } from "urdf-loader";

type Props = {
  linkColors: Record<string, string>;
  selectedLink: string | null;
  onSelectLink: (name: string | null) => void;
  onLinksLoaded: (linkNames: string[]) => void;
};

type LoadStatus = "idle" | "reading" | "parsing" | "ready" | "error";

type FolderPayload = {
  files: Map<string, File>;
  rootLabel: string;
};

// Recursively walk a FileSystemDirectoryEntry, building a relative-path → File map.
async function readDirectory(
  entry: FileSystemDirectoryEntry,
  prefix: string,
  out: Map<string, File>,
): Promise<void> {
  const reader = entry.createReader();
  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) =>
      reader.readEntries(resolve as (entries: FileSystemEntry[]) => void, reject),
    );

  let batch = await readBatch();
  while (batch.length > 0) {
    for (const child of batch) {
      const childPath = prefix ? `${prefix}/${child.name}` : child.name;
      if (child.isFile) {
        const file = await new Promise<File>((res, rej) =>
          (child as FileSystemFileEntry).file(res, rej),
        );
        out.set(childPath.toLowerCase(), file);
      } else if (child.isDirectory) {
        await readDirectory(
          child as FileSystemDirectoryEntry,
          childPath,
          out,
        );
      }
    }
    batch = await readBatch();
  }
}

async function readDataTransfer(
  dt: DataTransfer,
): Promise<FolderPayload | null> {
  const items = Array.from(dt.items);
  const files = new Map<string, File>();
  let rootLabel = "Folder";

  // Prefer the webkit entry API so we can recurse directories.
  const entries = items
    .map((it) => it.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => !!e);

  if (entries.length > 0) {
    for (const entry of entries) {
      if (entry.isDirectory) {
        rootLabel = entry.name;
        // Include the dropped folder's own name in keys so package://<rootName>/... resolves cleanly.
        await readDirectory(entry as FileSystemDirectoryEntry, entry.name, files);
      } else if (entry.isFile) {
        const f = await new Promise<File>((res, rej) =>
          (entry as FileSystemFileEntry).file(res, rej),
        );
        files.set(entry.name.toLowerCase(), f);
      }
    }
  } else {
    // Fallback: flat file list.
    for (const f of Array.from(dt.files)) {
      files.set(f.name.toLowerCase(), f);
    }
  }

  return files.size > 0 ? { files, rootLabel } : null;
}

function readFileList(list: FileList): FolderPayload {
  const files = new Map<string, File>();
  let rootLabel = "Folder";
  for (const f of Array.from(list)) {
    const rel =
      (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    files.set(rel.toLowerCase(), f);
    if (!rootLabel || rootLabel === "Folder") {
      const top = rel.split("/")[0];
      if (top && top !== f.name) rootLabel = top;
    }
  }
  return { files, rootLabel };
}

export default function UrdfViewer({
  linkColors,
  selectedLink,
  onSelectLink,
  onLinksLoaded,
}: Props) {
  const [robot, setRobot] = useState<URDFRobot | null>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [meshWarnings, setMeshWarnings] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const robotRef = useRef<URDFRobot | null>(null);

  // Dispose previous robot's geometries/materials when replaced or unmounted.
  useEffect(() => {
    robotRef.current = robot;
    return () => {
      // No-op on each render; cleanup happens in unloadRobot.
    };
  }, [robot]);

  const unloadRobot = useCallback(() => {
    const r = robotRef.current;
    if (!r) return;
    r.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
    robotRef.current = null;
  }, []);

  useEffect(() => () => unloadRobot(), [unloadRobot]);

  const loadFromPayload = useCallback(
    async ({ files, rootLabel }: FolderPayload) => {
      setStatus("reading");
      setError(null);
      setMeshWarnings([]);
      onSelectLink(null);
      const warnings: string[] = [];

      // Find the first .urdf file we encounter.
      let urdfKey: string | null = null;
      for (const k of files.keys()) {
        if (k.endsWith(".urdf")) {
          urdfKey = k;
          break;
        }
      }
      if (!urdfKey) {
        setError("No .urdf file found in the dropped folder.");
        setStatus("error");
        return;
      }
      const urdfFile = files.get(urdfKey)!;
      const urdfDir = urdfKey.includes("/")
        ? urdfKey.slice(0, urdfKey.lastIndexOf("/"))
        : "";
      const urdfText = await urdfFile.text();

      // Index meshes both by full relative path and by basename for tolerant lookup.
      const byBasename = new Map<string, File>();
      for (const [k, f] of files) {
        const base = k.split("/").pop()!;
        if (!byBasename.has(base)) byBasename.set(base, f);
      }

      const lookup = (raw: string): File | null => {
        const norm = raw
          .replace(/^\.?\//, "")
          .replace(/\\/g, "/")
          .toLowerCase();
        if (files.has(norm)) return files.get(norm)!;
        // Try joining with urdf directory (relative path inside the URDF).
        if (urdfDir) {
          const joined = `${urdfDir}/${norm}`.replace(/\/+/g, "/");
          if (files.has(joined)) return files.get(joined)!;
        }
        // Suffix match against any known key.
        for (const [k, f] of files) {
          if (k.endsWith(norm) || norm.endsWith(k)) return f;
        }
        const base = norm.split("/").pop()!;
        return byBasename.get(base) ?? null;
      };

      setStatus("parsing");
      const manager = new THREE.LoadingManager();
      const loader = new URDFLoader(manager);
      loader.workingPath = "";
      // package:// resolution: just return the package name so the path passed
      // to loadMeshCb looks like "<pkg>/<relPath>" — we match by suffix anyway.
      loader.packages = (pkg: string) => pkg;

      const pending: Promise<void>[] = [];
      loader.loadMeshCb = (path, _mgr, done) => {
        const p = (async () => {
          const file = lookup(path);
          if (!file) {
            warnings.push(`Not found: ${path}`);
            done(new THREE.Group(), new Error(`Mesh not found: ${path}`));
            return;
          }
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
          if (ext !== "stl") {
            warnings.push(`Unsupported format (.${ext}): ${file.name}`);
            done(
              new THREE.Group(),
              new Error(`Unsupported mesh format (.${ext}); only STL is supported.`),
            );
            return;
          }
          try {
            const buf = await file.arrayBuffer();
            const geom = new STLLoader().parse(buf);
            if (!geom.attributes.normal) geom.computeVertexNormals();
            geom.computeBoundingBox();
            const mesh = new THREE.Mesh(geom);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            done(mesh);
          } catch (e) {
            warnings.push(`Parse failed: ${file.name} — ${(e as Error).message}`);
            done(new THREE.Group(), e as Error);
          }
        })();
        pending.push(p);
      };

      try {
        const parsed = loader.parse(urdfText);
        await Promise.all(pending);
        // URDF is Z-up; three.js scenes are Y-up. Rotate so the robot stands upright.
        parsed.rotation.x = -Math.PI / 2;
        unloadRobot();
        setRobot(parsed);
        setFolderName(rootLabel);
        setMeshWarnings(warnings);
        setStatus("ready");
        onLinksLoaded(Object.keys(parsed.links));
      } catch (e) {
        setError((e as Error).message || "Failed to parse URDF.");
        setStatus("error");
      }
    },
    [onLinksLoaded, onSelectLink, unloadRobot],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setIsDragging(false);
      try {
        const payload = await readDataTransfer(e.dataTransfer);
        if (!payload) {
          setError("Drop a folder containing a .urdf file and its meshes.");
          setStatus("error");
          return;
        }
        await loadFromPayload(payload);
      } catch (err) {
        setError((err as Error).message);
        setStatus("error");
      }
    },
    [loadFromPayload],
  );

  const onFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list || list.length === 0) return;
      await loadFromPayload(readFileList(list));
      e.target.value = "";
    },
    [loadFromPayload],
  );

  const reset = useCallback(() => {
    unloadRobot();
    setRobot(null);
    setStatus("idle");
    setError(null);
    setFolderName(null);
    setMeshWarnings([]);
    onSelectLink(null);
    onLinksLoaded([]);
  }, [onLinksLoaded, onSelectLink, unloadRobot]);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-[#0b0d10] shadow-sm dark:border-gray-800"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current += 1;
        if (!isDragging) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
      }}
      onDrop={onDrop}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-2.5 text-sm text-gray-100">
        <div className="flex items-center gap-2 truncate">
          <FolderOpenIcon className="h-4 w-4 shrink-0 text-violet-400" />
          <span className="truncate">
            {folderName ?? (
              <span className="text-gray-400">No folder loaded</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            // @ts-expect-error — webkitdirectory is non-standard but widely supported
            webkitdirectory=""
            directory=""
            multiple
            onChange={onFileInput}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-100 transition hover:bg-white/10"
          >
            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            Browse folder
          </button>
          {robot && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-100 transition hover:bg-white/10"
              title="Unload"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Unload
            </button>
          )}
        </div>
      </header>

      <div className="relative flex-1">
        <Canvas
          shadows
          camera={{ position: [2.4, 1.8, 2.6], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#0b0d10"]} />
          <ambientLight intensity={0.45} />
          <directionalLight
            position={[5, 7, 4]}
            intensity={1.1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-4, 3, -3]} intensity={0.35} />

          <Suspense fallback={null}>
            {robot && (
              <RobotScene
                robot={robot}
                linkColors={linkColors}
                selectedLink={selectedLink}
                onSelectLink={onSelectLink}
              />
            )}
          </Suspense>

          <Grid
            args={[20, 20]}
            cellSize={0.25}
            cellThickness={0.5}
            sectionSize={1}
            sectionThickness={1}
            sectionColor={"#404456"}
            cellColor={"#23262d"}
            fadeDistance={20}
            fadeStrength={1.5}
            position={[0, 0, 0]}
            infiniteGrid
          />

          <hemisphereLight args={[0xe6eaf2, 0x1a1d24, 0.6]} />
          <OrbitControls
            makeDefault
            enablePan
            target={[0, 0.5, 0]}
            minDistance={0.001}
            maxDistance={1000}
          />
        </Canvas>

        {/* Drop / status overlays */}
        {(status === "idle" || isDragging || status === "error") && (
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center p-8 transition ${
              isDragging
                ? "bg-violet-500/15"
                : status === "idle"
                  ? "bg-black/30"
                  : "bg-black/40"
            }`}
          >
            <div
              className={`pointer-events-none rounded-2xl border-2 border-dashed px-8 py-10 text-center backdrop-blur-sm ${
                isDragging
                  ? "border-violet-300 bg-violet-500/10 text-violet-100"
                  : "border-white/30 bg-black/40 text-gray-200"
              }`}
            >
              {status === "error" ? (
                <>
                  <ExclamationTriangleIcon className="mx-auto mb-3 h-9 w-9 text-amber-400" />
                  <p className="text-sm font-semibold">{error}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Drop another folder to try again.
                  </p>
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="mx-auto mb-3 h-9 w-9 text-violet-300" />
                  <p className="text-base font-semibold">
                    {isDragging ? "Release to load" : "Drag a robot folder here"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Drop a folder with a <code>.urdf</code> file and its STL
                    meshes.
                    <br />
                    Files stay in your browser — nothing is uploaded.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {(status === "reading" || status === "parsing") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-gray-200">
            <div className="rounded-xl bg-black/60 px-5 py-3 backdrop-blur-sm">
              {status === "reading" ? "Reading folder…" : "Parsing URDF…"}
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-xs text-gray-300">
            <span className="pointer-events-auto rounded-md bg-black/50 px-2 py-1 backdrop-blur-sm">
              {selectedLink ? (
                <>
                  Selected:&nbsp;
                  <span className="font-mono text-violet-300">
                    {selectedLink}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">
                  Click a link to select it, then pick a color.
                </span>
              )}
            </span>
            <div className="flex flex-col items-end gap-1">
              {meshWarnings.length > 0 && (
                <details className="pointer-events-auto max-w-md rounded-md bg-amber-500/15 px-2 py-1 text-[11px] text-amber-200 ring-1 ring-amber-400/30 backdrop-blur-sm">
                  <summary className="cursor-pointer">
                    {meshWarnings.length} mesh{meshWarnings.length === 1 ? "" : "es"} could not be loaded
                  </summary>
                  <ul className="mt-1 max-h-32 list-disc overflow-auto pl-4 font-mono text-[10px]">
                    {meshWarnings.slice(0, 25).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {meshWarnings.length > 25 && (
                      <li>…and {meshWarnings.length - 25} more</li>
                    )}
                  </ul>
                </details>
              )}
              <span className="pointer-events-auto rounded-md bg-black/50 px-2 py-1 font-mono text-[10px] text-gray-400 backdrop-blur-sm">
                drag · scroll · right-drag
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RobotScene({
  robot,
  linkColors,
  selectedLink,
  onSelectLink,
}: {
  robot: URDFRobot;
  linkColors: Record<string, string>;
  selectedLink: string | null;
  onSelectLink: (name: string | null) => void;
}) {
  // Material assignment runs in a useEffect (NOT useMemo): strict mode invokes useMemo
  // twice as a purity check, so any side effect in the factory ends up with the mesh
  // holding the second invocation's material while React keeps the first invocation's
  // map. Doing the assignment once in useEffect avoids that mismatch.
  const [linkMaterials, setLinkMaterials] = useState<
    Map<string, THREE.MeshStandardMaterial[]>
  >(() => new Map());

  useEffect(() => {
    const map = new Map<string, THREE.MeshStandardMaterial[]>();
    robot.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      let cur: THREE.Object3D | null = m.parent;
      while (cur && !(cur as unknown as { isURDFLink?: boolean }).isURDFLink) {
        cur = cur.parent;
      }
      const linkName = (cur as unknown as { urdfName?: string } | null)?.urdfName;
      if (!linkName) return;
      const mat = new THREE.MeshStandardMaterial({
        color: 0xb8bcc4,
        metalness: 0.25,
        roughness: 0.55,
      });
      m.material = mat;
      const list = map.get(linkName) ?? [];
      list.push(mat);
      map.set(linkName, list);
    });
    setLinkMaterials(map);
    return () => {
      for (const list of map.values()) for (const mat of list) mat.dispose();
    };
  }, [robot]);

  // After the robot is in the scene, frame it so it's always visible regardless
  // of its native scale or origin offset.
  const { camera, controls } = useThree();
  useEffect(() => {
    // Ensure transforms reflect the rotation we applied before measuring.
    robot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(robot);
    if (!isFinite(box.min.x) || box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;

    const persp = camera as THREE.PerspectiveCamera;
    const fov = (persp.fov * Math.PI) / 180;
    const distance = radius / Math.sin(fov / 2) * 1.4;

    const dir = new THREE.Vector3(1, 0.7, 1).normalize();
    persp.position.copy(center).addScaledVector(dir, distance);
    persp.near = Math.max(0.01, distance / 100);
    persp.far = distance * 100;
    persp.updateProjectionMatrix();
    persp.lookAt(center);

    const orbit = controls as OrbitControlsImpl | null;
    if (orbit?.target) {
      orbit.target.copy(center);
      orbit.minDistance = radius * 0.5;
      orbit.maxDistance = radius * 20;
      orbit.update();
    }
  }, [robot, camera, controls]);

  // Apply user-chosen colors + selection highlight.
  useEffect(() => {
    for (const [name, mats] of linkMaterials) {
      const hex = linkColors[name];
      const isSelected = selectedLink === name;
      for (const mat of mats) {
        if (hex) mat.color.set(hex);
        else mat.color.set(0xb8bcc4);
        mat.emissive.set(isSelected ? 0x7c3aed : 0x000000);
        mat.emissiveIntensity = isSelected ? 0.35 : 0;
        mat.needsUpdate = true;
      }
    }
  }, [linkColors, linkMaterials, selectedLink]);

  // Walk up to find the nearest URDFLink ancestor of the picked mesh.
  const findLink = useCallback((obj: THREE.Object3D | null): URDFLink | null => {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if ((cur as URDFLink).isURDFLink) return cur as URDFLink;
      cur = cur.parent;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const link = findLink(e.object);
      if (link?.urdfName) onSelectLink(link.urdfName);
    },
    [findLink, onSelectLink],
  );

  const handleMissed = useCallback(() => {
    onSelectLink(null);
  }, [onSelectLink]);

  return (
    <primitive
      object={robot}
      onPointerDown={handlePointerDown}
      onPointerMissed={handleMissed}
    />
  );
}