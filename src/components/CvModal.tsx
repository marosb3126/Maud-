import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { CV_PDF_URL } from "../data/cvData";

interface CvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CvModal({ isOpen, onClose }: CvModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D19]/60 backdrop-blur-xs p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="CV de Marion Server"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl h-[88vh] bg-[#FAF6F0] border border-[#DFD2C2] rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#E4D8C8] bg-[#F3ECE2]">
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-medium text-[#231D19] truncate">
              Marion Server — Curriculum Vitae
            </h2>
            <p className="text-xs text-[#6F6258] truncate">
              Alternance · Commercial Événementiel · 2026 – 2028
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={CV_PDF_URL}
              download="CV_Marion_Server_Alternance.pdf"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#231D19] border border-[#D4C5B3] rounded-lg hover:bg-[#EAE0D3] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Télécharger</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer l'aperçu du CV"
              className="inline-flex items-center justify-center w-9 h-9 text-[#231D19] rounded-lg hover:bg-[#EAE0D3] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4634]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#EFE7DC]">
          <iframe
            src={CV_PDF_URL}
            title="CV de Marion Server"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
