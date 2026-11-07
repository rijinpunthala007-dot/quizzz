import { motion } from 'framer-motion';

export default function DoveAnimation({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <motion.div
      className="fixed top-8 z-50 pointer-events-none dove-animation"
      initial={{ x: '-10vw', y: 0, opacity: 0 }}
      animate={{
        x: ['-10vw', '50vw', '110vw'],
        y: [0, -20, 0],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 3,
        ease: 'easeInOut',
        times: [0, 0.3, 0.7, 1],
      }}
      style={{ fontSize: '2.5rem' }}
    >
      🕊️
    </motion.div>
  );
}
