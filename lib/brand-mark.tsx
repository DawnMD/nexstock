/**
 * The NexStock mark: a stack of cartons sitting on a pallet.
 *
 * Rendered by Satori (via `ImageResponse`) for the generated icon routes, not
 * by React DOM — so it sticks to plain divs with explicit flex layout, which is
 * the subset of CSS Satori actually supports.
 */
export function BrandMark({
  size,
  rounded = true,
}: {
  size: number;
  /** Apple touch icons are masked by the OS, so they render full-bleed. */
  rounded?: boolean;
}) {
  const u = size / 16;
  const carton = {
    width: u * 5,
    height: u * 4.5,
    borderRadius: u * 0.5,
    background: "#fafafa",
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#18181b",
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: u * 0.75,
        }}
      >
        <div style={carton} />
        <div style={{ display: "flex", gap: u }}>
          <div style={carton} />
          <div style={carton} />
        </div>
        <div
          style={{
            width: u * 11,
            height: u * 1.5,
            borderRadius: u * 0.5,
            background: "#fafafa",
            opacity: 0.55,
          }}
        />
      </div>
    </div>
  );
}
