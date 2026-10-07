import Modal from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How to play"
      footer={
        <button className="btn-primary w-full py-3" onClick={onClose}>
          Let's play
        </button>
      }
    >
      <p className="text-sm leading-relaxed text-muted">
        Five questions. Same five for everyone, every day. You're not guessing the exact
        number — you're <span className="font-semibold text-text">boxing it</span>.
      </p>

      {/* mini illustration */}
      <div className="my-5 rounded-xl border border-border bg-surface-2 p-4">
        <div className="relative h-3 rounded-full bg-bg">
          <div className="absolute left-[30%] top-0 h-full w-[34%] rounded-full bg-accent" />
          <span className="absolute left-[30%] top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface" />
          <span className="absolute left-[64%] top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface" />
          <span className="absolute left-[52%] top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-truth ring-4 ring-truth/25" />
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-accent" /> your range
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-truth" /> the true answer
          </span>
        </div>
      </div>

      <ol className="space-y-3 text-sm">
        {[
          ["Drag the two handles", "to box where you think the answer falls."],
          ["Lock it in", "to reveal the true value and your points."],
          [
            "Tighter boxes score more",
            "— but only if the answer is inside. A hedge-everything box is worth almost nothing.",
          ],
          ["Five questions, up to 1000 points", "then see how you stack up against everyone today."],
        ].map(([title, body], i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-bg">
              {i + 1}
            </span>
            <p className="leading-relaxed">
              <span className="font-semibold text-text">{title}</span>{" "}
              <span className="text-muted">{body}</span>
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-5 rounded-xl bg-surface-2 px-4 py-3 text-xs leading-relaxed text-muted">
        A fresh puzzle drops every day at <span className="font-semibold text-text">00:00 UTC</span>.
        Build a streak, share your result, and dig through the archive for days you missed.
      </p>
    </Modal>
  );
}
