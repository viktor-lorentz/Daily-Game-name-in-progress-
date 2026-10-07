import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon } from "./icons";

interface Props {
  message: string | null;
}

export default function Toast({ message }: Props) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2"
        >
          <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-bg shadow-glow">
            <CheckIcon width={16} height={16} />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
