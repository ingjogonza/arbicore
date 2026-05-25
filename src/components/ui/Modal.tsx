// ============================================
// MODAL COMPONENT
// ============================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200`}>
        {children}
      </div>
    </div>
  );
};
