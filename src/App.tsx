import { useState } from "react";
import { FileText, Mail, MapPin, Mic, Phone } from "lucide-react";
import {
  CV_PDF_URL,
  EDUCATION,
  EXPERIENCES,
  INTERESTS,
  LANGUAGES,
  PROFILE,
  SKILLS_GROUPS,
} from "./data/cvData";
import { CvModal } from "./components/CvModal";
import { VoiceConsole } from "./components/VoiceConsole";
import type { VoiceLanguage } from "./hooks/useLiveVoice";

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState<VoiceLanguage>("fr");
  const [voiceTriggerCount, setVoiceTriggerCount] = useState(0);
  const [isCvOpen, setIsCvOpen] = useState(false);

  const handleStartConversation = () => {
    setVoiceTriggerCount((c) => c + 1);
    document.getElementById("assistant")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#231D19]">
      {/* Top Bar Contract: 1 row, 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#FAF6F0]/92 backdrop-blur-sm border-b border-[#E4D8C8]">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between gap-8">
          <a
            href="#"
            className="font-serif text-2xl font-medium tracking-tight text-[#231D19] whitespace-nowrap shrink-0"
          >
            Marion Server
          </a>

          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-7 text-sm text-[#6F6258]"
          >
            <a
              href="#assistant"
              className="hover:text-[#231D19] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Assistant
            </a>
            <a
              href="#parcours"
              className="hover:text-[#231D19] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Parcours
            </a>
            <a
              href="#competences"
              className="hover:text-[#231D19] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Compétences
            </a>
            <a
              href="#contact"
              className="hover:text-[#231D19] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Contact
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleStartConversation}
              className="px-4 py-2 text-xs font-medium text-[#FAF6F0] bg-[#231D19] rounded-lg hover:bg-[#3A302A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4634]"
            >
              Parler à Maud
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10">
        {/* Hero Split */}
        <section className="py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between py-2">
              <div>
                <p className="text-xs tracking-wide text-[#7A4634] font-medium">
                  {PROFILE.targetRole}
                  <span aria-hidden="true"> · </span>
                  {PROFILE.rhythm}
                </p>

                <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-normal leading-[1.08] tracking-tight text-[#231D19] text-balance">
                  Maud, votre interlocutrice dédiée au parcours de Marion
                  Server.
                </h1>

                <p className="mt-6 text-base leading-relaxed text-[#574C44] max-w-xl">
                  Échangez de vive voix avec Maud pour explorer les expériences
                  de Marion en hôtellerie haut de gamme et événementiel, sa
                  maîtrise des outils commerciaux et sa disponibilité en
                  alternance. Elle vous répond avec une voix professionnelle
                  féminine en français, en anglais courant ou en espagnol.
                </p>
              </div>

              <div className="mt-10 pt-8 border-t border-[#E4D8C8] flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleStartConversation}
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium text-[#FAF6F0] bg-[#231D19] rounded-xl hover:bg-[#3A302A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4634]"
                >
                  <Mic className="w-4 h-4" aria-hidden="true" />
                  <span>Démarrer la conversation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCvOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-[#231D19] border border-[#D4C5B3] rounded-xl hover:bg-[#F3ECE2] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4634]"
                >
                  <FileText className="w-4 h-4 text-[#7A4634]" aria-hidden="true" />
                  <span>Consulter le CV</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <VoiceConsole
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
                externalTriggerCount={voiceTriggerCount}
              />
            </div>
          </div>

          {/* Full-width 3-column language strip below the split */}
          <div className="mt-12 pt-8 border-t border-[#E4D8C8] grid grid-cols-1 md:grid-cols-3 gap-8">
            {LANGUAGES.map((lang) => (
              <div key={lang.code} className="flex flex-col">
                <div className="flex items-baseline justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage(lang.code)}
                    className="font-serif text-2xl font-medium text-[#231D19] hover:text-[#7A4634] transition-colors text-left cursor-pointer"
                  >
                    {lang.language}
                  </button>
                  <span className="text-xs text-[#7A4634] font-medium">
                    {lang.level}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#6F6258]">
                  {lang.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Parcours & Formations */}
        <section
          id="parcours"
          className="py-14 md:py-20 border-t border-[#E4D8C8]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <h2 className="font-serif text-3xl md:text-4xl font-normal tracking-tight text-[#231D19]">
                Expériences professionnelles
              </h2>
              <p className="mt-2 text-sm text-[#6F6258]">
                Commercial événementiel, coordination de groupes et réception en
                hôtellerie.
              </p>

              <div className="mt-10 divide-y divide-[#E4D8C8]">
                {EXPERIENCES.map((exp) => (
                  <article
                    key={`${exp.period}-${exp.company}`}
                    className="py-6 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="font-serif text-2xl font-medium text-[#231D19]">
                        {exp.role}
                      </h3>
                      <span className="text-xs text-[#6F6258] tabular-nums">
                        {exp.period}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#7A4634]">
                      {exp.company}
                      <span aria-hidden="true"> · </span>
                      {exp.location}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-[#574C44]">
                      {exp.highlights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <h2 className="font-serif text-3xl md:text-4xl font-normal tracking-tight text-[#231D19]">
                Diplômes et formations
              </h2>
              <p className="mt-2 text-sm text-[#6F6258]">
                Spécialisation en production événementielle et hôtellerie de
                luxe.
              </p>

              <div className="mt-10 divide-y divide-[#E4D8C8]">
                {EDUCATION.map((edu) => (
                  <article
                    key={`${edu.period}-${edu.title}`}
                    className="py-6 first:pt-0 last:pb-0"
                  >
                    <span className="text-xs text-[#6F6258] tabular-nums">
                      {edu.period}
                    </span>
                    <h3 className="mt-1 font-serif text-2xl font-medium text-[#231D19]">
                      {edu.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#7A4634]">
                      {edu.institution}
                    </p>
                    <p className="mt-1.5 text-sm text-[#574C44]">
                      {edu.details}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Compétences & Centres d'intérêt */}
        <section
          id="competences"
          className="py-14 md:py-20 border-t border-[#E4D8C8]"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-normal tracking-tight text-[#231D19]">
                Compétences et environnement
              </h2>
              <p className="mt-2 text-sm text-[#6F6258]">
                Savoir-faire commercial, rigueur opérationnelle et outils
                métiers.
              </p>
            </div>
            <a
              href={CV_PDF_URL}
              download="CV_Marion_Server_Alternance.pdf"
              className="text-xs font-medium text-[#7A4634] hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Télécharger le CV complet (PDF)
            </a>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
            {SKILLS_GROUPS.map((group) => (
              <div key={group.title} className="pt-4 border-t border-[#E4D8C8]">
                <h3 className="font-serif text-xl font-medium text-[#231D19]">
                  {group.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#574C44]">
                  {group.items}
                </p>
              </div>
            ))}

            <div className="pt-4 border-t border-[#E4D8C8]">
              <h3 className="font-serif text-xl font-medium text-[#231D19]">
                Centres d'intérêt
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#574C44]">
                {INTERESTS.join(" · ")}
              </p>
            </div>
          </div>
        </section>

        {/* Footer / Contact */}
        <footer
          id="contact"
          className="py-12 md:py-16 border-t border-[#E4D8C8] flex flex-col md:flex-row items-start md:items-center justify-between gap-8"
        >
          <div>
            <p className="font-serif text-2xl font-medium text-[#231D19]">
              {PROFILE.fullName}
            </p>
            <p className="mt-1 text-sm text-[#6F6258]">
              {PROFILE.targetRole} · {PROFILE.rhythm}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-[#574C44]">
            <a
              href={`tel:${PROFILE.phone.replace(/\s+/g, "")}`}
              className="inline-flex items-center gap-2 hover:text-[#231D19] transition-colors tabular-nums"
            >
              <Phone className="w-4 h-4 text-[#7A4634]" aria-hidden="true" />
              <span>{PROFILE.phone}</span>
            </a>
            <a
              href={`mailto:${PROFILE.email}`}
              className="inline-flex items-center gap-2 hover:text-[#231D19] transition-colors"
            >
              <Mail className="w-4 h-4 text-[#7A4634]" aria-hidden="true" />
              <span>{PROFILE.email}</span>
            </a>
            <span className="inline-flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#7A4634]" aria-hidden="true" />
              <span>{PROFILE.location}</span>
            </span>
          </div>
        </footer>
      </main>

      <CvModal isOpen={isCvOpen} onClose={() => setIsCvOpen(false)} />
    </div>
  );
}
