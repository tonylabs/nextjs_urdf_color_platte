import ColorPalette from "@/components/ColorPalette";
import { getColors } from "@/lib/colors";

export default function Home() {
  const colors = getColors();
  return (
    <main className="min-h-screen">
      <ColorPalette colors={colors} />
    </main>
  );
}
