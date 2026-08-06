export default function Loader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "rgba(8, 11, 20, 0.92)", backdropFilter: "blur(12px)" }}
    >
      {/* Animated logo */}
      <div className="relative w-20 h-20 mb-6">
        <div
          className="absolute inset-0 rounded-3xl flex items-center justify-center text-3xl"
          style={{
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(79, 70, 229, 0.2))",
            border: "1px solid rgba(139, 92, 246, 0.3)",
          }}
        >
          🎨
        </div>
        <div className="absolute -inset-1 rounded-3xl border border-violet-500/30 animate-ping opacity-50" />
        <div className="absolute -inset-2 rounded-3xl border border-indigo-500/20 animate-ping opacity-30" style={{ animationDelay: "0.15s" }} />
      </div>

      {/* Spinner */}
      <div className="spinner mb-5" />

      <div className="text-white/50 text-sm font-semibold">Loading Sketchflow…</div>
      <div className="flex items-center gap-1.5 mt-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  );
}